import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initials, type Person } from "@/lib/birthday";
import { Heart, Users } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/tree")({
  component: TreePage,
});

function TreePage() {
  // Same key as dashboard + new-person form → invalidation flows here automatically.
  const { data: people = [], isLoading } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });

  const { roots, childrenOf, byId } = useMemo(() => {
    const byId = new Map(people.map((p) => [p.id, p]));
    const childrenOf = new Map<string, Person[]>();
    for (const p of people) {
      for (const parentId of [p.mother_id, p.father_id]) {
        if (!parentId || !byId.has(parentId)) continue;
        const arr = childrenOf.get(parentId) ?? [];
        arr.push(p);
        childrenOf.set(parentId, arr);
      }
    }
    // A root is someone whose parents aren't in our set, AND who isn't already
    // rendered as a partner of an earlier root (we render partners inline).
    const partnerOfRendered = new Set<string>();
    const roots: Person[] = [];
    for (const p of people) {
      const hasKnownParent =
        (p.mother_id && byId.has(p.mother_id)) ||
        (p.father_id && byId.has(p.father_id));
      if (hasKnownParent) continue;
      if (partnerOfRendered.has(p.id)) continue;
      roots.push(p);
      if (p.partner_id && byId.has(p.partner_id)) {
        partnerOfRendered.add(p.partner_id);
      }
    }
    return { roots, childrenOf, byId };
  }, [people]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Family tree</h1>
        <p className="text-muted-foreground text-sm">
          Built from the relationships you've added. Updates as you go.
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : people.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {roots.map((root) => (
            <TreeNode
              key={root.id}
              person={root}
              byId={byId}
              childrenOf={childrenOf}
              seen={new Set()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeNode({
  person,
  byId,
  childrenOf,
  seen,
}: {
  person: Person;
  byId: Map<string, Person>;
  childrenOf: Map<string, Person[]>;
  seen: Set<string>;
}) {
  if (seen.has(person.id)) return null;
  const nextSeen = new Set(seen);
  nextSeen.add(person.id);

  const partner = person.partner_id ? byId.get(person.partner_id) : null;
  if (partner) nextSeen.add(partner.id);

  // Children of this couple/person: union of either parent's children.
  const direct = childrenOf.get(person.id) ?? [];
  const partnerKids = partner ? (childrenOf.get(partner.id) ?? []) : [];
  const seenIds = new Set<string>();
  const kids = [...direct, ...partnerKids].filter((c) => {
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id);
    return true;
  });

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2">
        <PersonChip person={person} />
        {partner && (
          <>
            <Heart className="w-4 h-4 text-primary shrink-0" aria-label="partner" />
            <PersonChip person={partner} />
          </>
        )}
      </div>

      {kids.length > 0 && (
        <>
          <div className="w-px h-5 bg-border" />
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-4 pt-2 border-t border-border pt-5">
            {kids.map((child) => (
              <TreeNode
                key={child.id}
                person={child}
                byId={byId}
                childrenOf={childrenOf}
                seen={nextSeen}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PersonChip({ person }: { person: Person }) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[88px] max-w-[120px]">
      <div
        className="grid place-items-center w-14 h-14 rounded-full text-primary-foreground font-semibold text-sm shadow-[var(--shadow-card)]"
        style={{ background: "var(--gradient-festive)" }}
      >
        {initials(person.name)}
      </div>
      <div className="text-xs font-medium text-center leading-tight truncate w-full">
        {person.name}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-border bg-card/50">
      <Users className="w-10 h-10 mx-auto text-primary mb-3" />
      <h2 className="font-display text-xl font-semibold">No tree yet</h2>
      <p className="text-muted-foreground text-sm mt-1 mb-5">
        Add people and set their mother, father, or partner to grow your tree.
      </p>
      <Link
        to="/people/new"
        className="inline-block px-5 py-2.5 rounded-full text-primary-foreground font-medium"
        style={{ background: "var(--gradient-festive)" }}
      >
        Add a person
      </Link>
    </div>
  );
}
