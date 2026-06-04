import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initials, type Person } from "@/lib/birthday";
import { Heart, Users, Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/tree")({
  component: TreePage,
});

function TreePage() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  // Toți copiii unei persoane
  const childrenOf = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const p of people) {
      for (const parentId of [p.mother_id, p.father_id]) {
        if (!parentId || !byId.has(parentId)) continue;
        const arr = map.get(parentId) ?? [];
        if (!arr.find((x) => x.id === p.id)) arr.push(p);
        map.set(parentId, arr);
      }
    }
    return map;
  }, [people, byId]);

  // Toți descendenții recursiv: copii, nepoți, strănepoți etc.
  function getDescendants(personId: string, visited = new Set<string>()): { generation: number; persons: Person[] }[] {
    if (visited.has(personId)) return [];
    visited.add(personId);

    const person = byId.get(personId);
    if (!person) return [];

    const directKids: Person[] = [];
    const seenKids = new Set<string>();

    const addKids = (pid: string) => {
      for (const k of childrenOf.get(pid) ?? []) {
        if (!seenKids.has(k.id)) {
          seenKids.add(k.id);
          directKids.push(k);
        }
      }
    };

    addKids(personId);
    if (person.partner_id) addKids(person.partner_id);

    if (directKids.length === 0) return [];

    const result: { generation: number; persons: Person[] }[] = [{ generation: 1, persons: directKids }];

    for (const kid of directKids) {
      const kidDescendants = getDescendants(kid.id, visited);
      for (const d of kidDescendants) {
        const existing = result.find((r) => r.generation === d.generation + 1);
        if (existing) {
          for (const p of d.persons) {
            if (!existing.persons.find((x) => x.id === p.id)) existing.persons.push(p);
          }
        } else {
          result.push({ generation: d.generation + 1, persons: d.persons });
        }
      }
    }

    return result;
  }

  // Toți strămoșii recursiv: părinți, bunici, străbunici etc.
  function getAncestors(personId: string, visited = new Set<string>()): { generation: number; persons: Person[] }[] {
    if (visited.has(personId)) return [];
    visited.add(personId);

    const person = byId.get(personId);
    if (!person) return [];

    const parents: Person[] = [];
    if (person.mother_id && byId.has(person.mother_id)) parents.push(byId.get(person.mother_id)!);
    if (person.father_id && byId.has(person.father_id)) parents.push(byId.get(person.father_id)!);

    if (parents.length === 0) return [];

    const result: { generation: number; persons: Person[] }[] = [{ generation: 1, persons: parents }];

    for (const parent of parents) {
      const parentAncestors = getAncestors(parent.id, visited);
      for (const a of parentAncestors) {
        const existing = result.find((r) => r.generation === a.generation + 1);
        if (existing) {
          for (const p of a.persons) {
            if (!existing.persons.find((x) => x.id === p.id)) existing.persons.push(p);
          }
        } else {
          result.push({ generation: a.generation + 1, persons: a.persons });
        }
      }
    }

    return result;
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return people;
    return people.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [people, search]);

  const selected = selectedId ? byId.get(selectedId) : null;

  const ancestors = useMemo(() => {
    if (!selectedId) return [];
    return getAncestors(selectedId).sort((a, b) => b.generation - a.generation);
  }, [selectedId, byId, childrenOf]);

  const descendants = useMemo(() => {
    if (!selectedId) return [];
    return getDescendants(selectedId).sort((a, b) => a.generation - b.generation);
  }, [selectedId, byId, childrenOf]);

  const siblings = useMemo(() => {
    if (!selected) return [];
    const sibs: Person[] = [];
    const seen = new Set<string>();
    for (const parentId of [selected.mother_id, selected.father_id]) {
      if (!parentId) continue;
      for (const k of childrenOf.get(parentId) ?? []) {
        if (k.id !== selected.id && !seen.has(k.id)) {
          sibs.push(k);
          seen.add(k.id);
        }
      }
    }
    return sibs;
  }, [selected, childrenOf]);

  const generationLabel = (gen: number, type: "ancestor" | "descendant") => {
    if (type === "ancestor") {
      if (gen === 1) return t("tree.parents");
      if (gen === 2) return t("tree.grandparents");
      if (gen === 3) return "Străbunici";
      return `Generația -${gen}`;
    } else {
      if (gen === 1) return t("tree.children");
      if (gen === 2) return "Nepoți";
      if (gen === 3) return "Strănepoți";
      return `Generația +${gen}`;
    }
  };

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
        <div className="space-y-5">
          {/* Căutare */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value) setSelectedId(null);
              }}
              placeholder={t("tree.search_placeholder")}
              className="w-full pl-9 pr-9 py-3 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Lista persoanelor */}
          {!selected && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedId(p.id); setSearch(""); }}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border hover:shadow-md transition text-left"
                >
                  <div
                    className="grid place-items-center w-9 h-9 rounded-full text-primary-foreground font-semibold text-xs shrink-0"
                    style={{ background: "var(--gradient-festive)" }}
                  >
                    {initials(p.name)}
                  </div>
                  <span className="text-sm font-medium truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Arbore centrat */}
          {selected && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" /> {t("tree.back")}
              </button>

              <div className="rounded-3xl border border-border bg-card/50 p-6 space-y-6">

                {/* Strămoși — de sus în jos */}
                {ancestors.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest">
                      <ChevronUp className="w-4 h-4" /> Strămoși
                    </div>
                    {ancestors.map((row) => (
                      <FamilyRow
                        key={`anc-${row.generation}`}
                        label={generationLabel(row.generation, "ancestor")}
                        persons={row.persons}
                        onSelect={setSelectedId}
                      />
                    ))}
                  </div>
                )}

                {/* Persoana selectată + partener */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                    {t("tree.you_selected")}
                  </span>
                  <div className="flex items-center gap-3">
                    <PersonChip person={selected} onSelect={setSelectedId} isSelected />
                    {selected.partner_id && byId.get(selected.partner_id) && (
                      <>
                        <Heart className="w-5 h-5 text-primary shrink-0" />
                        <PersonChip person={byId.get(selected.partner_id)!} onSelect={setSelectedId} />
                      </>
                    )}
                  </div>
                </div>

                {/* Frați/Surori */}
                {siblings.length > 0 && (
                  <FamilyRow
                    label={t("tree.siblings")}
                    persons={siblings}
                    onSelect={setSelectedId}
                  />
                )}

                {/* Descendenți — generație după generație */}
                {descendants.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest">
                      <ChevronDown className="w-4 h-4" /> Descendenți
                    </div>
                    {descendants.map((row) => (
                      <FamilyRow
                        key={`desc-${row.generation}`}
                        label={generationLabel(row.generation, "descendant")}
                        persons={row.persons}
                        onSelect={setSelectedId}
                      />
                    ))}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FamilyRow({ label, persons, onSelect }: {
  label: string;
  persons: Person[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex flex-wrap justify-center gap-3">
        {persons.map((p) => (
          <PersonChip key={p.id} person={p} onSelect={onSelect} />
        ))}
      </div>
      <div className="w-px h-6 bg-border" />
    </div>
  );
}

function PersonChip({ person, onSelect, isSelected }: {
  person: Person;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(person.id)}
      className={`flex flex-col items-center gap-1.5 min-w-[80px] max-w-[110px] transition ${isSelected ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
    >
      <div
        className={`grid place-items-center w-14 h-14 rounded-full text-primary-foreground font-semibold text-sm shadow-md transition ${isSelected ? "ring-2 ring-primary ring-offset-2" : ""}`}
        style={{ background: "var(--gradient-festive)" }}
      >
        {initials(person.name)}
      </div>
      <div className="text-xs font-medium text-center leading-tight truncate w-full">
        {person.name}
      </div>
    </button>
  );
}

function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-border bg-card/50">
      <Users className="w-10 h-10 mx-auto text-primary mb-3" />
      <h2 className="font-display text-xl font-semibold">{t("tree.empty_title")}</h2>
      <p className="text-muted-foreground text-sm mt-1 mb-5">{t("tree.empty_desc")}</p>
    </div>
  );
}