import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initials, type Person } from "@/lib/birthday";
import { Heart, Users } from "lucide-react";
import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/tree")({
  component: TreePage,
});

function TreePage() {
  const { t } = useI18n();
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
        <h1 className="font-display text-3xl font-semibold">{t("tree.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("tree.subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t("dashboard.loading")}</div>
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
  const { t } = useI18n();
  if (seen.has(person.id)) return null;
  const nextSeen = new Set(seen);
  nextSeen.add(person.id);

  const partner = person.partner_id ? byId.get(person.partner_id) : null;
  if (partner) nextSeen.add(partner.id);

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
            <Heart className="w-4 h-4 text-primary shrink-0" aria-label={t("tree.partner_aria")} />
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
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[88px] max-w-[120px] group">
      <div className="relative">
        <div
          className="grid place-items-center w-14 h-14 rounded-full text-primary-foreground font-semibold text-sm shadow-[var(--shadow-card)]"
          style={{ background: "var(--gradient-festive)" }}
        >
          {initials(person.name)}
        </div>
        <Link
          to="/people/$id/edit"
          params={{ id: person.id }}
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background border border-border grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          aria-label={t("tree.edit_aria", { name: person.name })}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        </Link>
      </div>
      <div className="text-xs font-medium text-center leading-tight truncate w-full">
        {person.name}
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-border bg-card/50">
      <Users className="w-10 h-10 mx-auto text-primary mb-3" />
      <h2 className="font-display text-xl font-semibold">{t("tree.empty_title")}</h2>
      <p className="text-muted-foreground text-sm mt-1 mb-5">{t("tree.empty_desc")}</p>
      <Link
        to="/people/new"
        className="inline-block px-5 py-2.5 rounded-full text-primary-foreground font-medium"
        style={{ background: "var(--gradient-festive)" }}
      >
        {t("dashboard.add_person")}
      </Link>
    </div>
  );
}
