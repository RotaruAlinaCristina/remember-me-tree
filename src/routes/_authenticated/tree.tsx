import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initials, type Person } from "@/lib/birthday";
import { Heart, Users, Search, X } from "lucide-react";
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

  const filtered = useMemo(() => {
    if (!search.trim()) return people;
    return people.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [people, search]);

  const selected = selectedId ? byId.get(selectedId) : null;

  // Găsește copiii unei persoane
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

  // Găsește frații/surorile
  const siblingsOf = useMemo(() => {
    if (!selected) return [];
    const siblings: Person[] = [];
    const seenIds = new Set<string>();
    for (const parentId of [selected.mother_id, selected.father_id]) {
      if (!parentId) continue;
      const kids = childrenOf.get(parentId) ?? [];
      for (const k of kids) {
        if (k.id !== selected.id && !seenIds.has(k.id)) {
          siblings.push(k);
          seenIds.add(k.id);
        }
      }
    }
    return siblings;
  }, [selected, childrenOf]);

  // Copiii persoanei selectate
  const children = useMemo(() => {
    if (!selected) return [];
    const kids: Person[] = [];
    const seenIds = new Set<string>();
    const directKids = childrenOf.get(selected.id) ?? [];
    const partner = selected.partner_id ? byId.get(selected.partner_id) : null;
    const partnerKids = partner ? (childrenOf.get(partner.id) ?? []) : [];
    for (const k of [...directKids, ...partnerKids]) {
      if (!seenIds.has(k.id)) {
        kids.push(k);
        seenIds.add(k.id);
      }
    }
    return kids;
  }, [selected, childrenOf, byId]);

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
          {/* Căsuță de căutare */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          {/* Arborele centrat pe persoana selectată */}
          {selected && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" /> {t("tree.back")}
              </button>

              <div className="rounded-3xl border border-border bg-card/50 p-6 space-y-8">

                {/* Bunici */}
                {(selected.mother_id || selected.father_id) && (() => {
                  const mother = selected.mother_id ? byId.get(selected.mother_id) : null;
                  const father = selected.father_id ? byId.get(selected.father_id) : null;
                  const maternalGrandmother = mother?.mother_id ? byId.get(mother.mother_id) : null;
                  const maternalGrandfather = mother?.father_id ? byId.get(mother.father_id) : null;
                  const paternalGrandmother = father?.mother_id ? byId.get(father.mother_id) : null;
                  const paternalGrandfather = father?.father_id ? byId.get(father.father_id) : null;
                  const hasGrandparents = maternalGrandmother || maternalGrandfather || paternalGrandmother || paternalGrandfather;

                  return (
                    <>
                      {hasGrandparents && (
                        <FamilyRow label={t("tree.grandparents")} persons={[maternalGrandmother, maternalGrandfather, paternalGrandmother, paternalGrandfather].filter(Boolean) as Person[]} onSelect={setSelectedId} />
                      )}
                      <FamilyRow
                        label={t("tree.parents")}
                        persons={[mother, father].filter(Boolean) as Person[]}
                        onSelect={setSelectedId}
                        showHeart={!!(mother && father)}
                      />
                    </>
                  );
                })()}

                {/* Persoana selectată + partener */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{t("tree.you_selected")}</span>
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
                {siblingsOf.length > 0 && (
                  <FamilyRow label={t("tree.siblings")} persons={siblingsOf} onSelect={setSelectedId} />
                )}

                {/* Copii */}
                {children.length > 0 && (
                  <FamilyRow label={t("tree.children")} persons={children} onSelect={setSelectedId} />
                )}

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FamilyRow({ label, persons, onSelect, showHeart }: {
  label: string;
  persons: Person[];
  onSelect: (id: string) => void;
  showHeart?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex flex-wrap justify-center gap-3">
        {persons.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2">
            <PersonChip person={p} onSelect={onSelect} />
            {showHeart && i === 0 && persons.length === 2 && (
              <Heart className="w-4 h-4 text-primary shrink-0" />
            )}
          </div>
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
      className={`flex flex-col items-center gap-1.5 min-w-[80px] max-w-[110px] group transition ${isSelected ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
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