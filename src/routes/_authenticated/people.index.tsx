import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { daysUntilBirthday, formatMonthDay, initials, type Person } from "@/lib/birthday";
import { Search, X, Plus, Trash2, Pencil, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/people/")({
  component: PeoplePage,
});

function PeoplePage() {
  const { t, locale } = useI18n();
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("people").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
      toast.success("Persoană ștearsă");
      setConfirmDelete(null);
    },
    onError: () => toast.error("Eroare la ștergere"),
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase
        .from("people")
        .update({ is_favorite })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
    },
    onError: () => toast.error("Eroare la actualizare"),
  });

  const favorites = people.filter((p) => p.is_favorite);
  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{t("people.title")}</h1>
          <p className="text-muted-foreground text-sm">{people.length} {people.length === 1 ? "persoană" : "persoane"}</p>
        </div>
        <Link
          to="/people/new"
          className="grid place-items-center w-11 h-11 rounded-full text-primary-foreground shadow-md shrink-0"
          style={{ background: "var(--gradient-festive)" }}
        >
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      {/* Secțiunea Favorite */}
      {favorites.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
            <span className="text-sm font-medium">Favorite</span>
          </div>
          <ul className="space-y-2">
            {favorites.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                locale={locale}
                onFavorite={() => favoriteMutation.mutate({ id: p.id, is_favorite: !p.is_favorite })}
                onDelete={() => setConfirmDelete(p.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Căutare */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută după nume..."
          className="w-full pl-9 pr-9 py-3 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Lista tuturor persoanelor */}
      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t("dashboard.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-border bg-card/50">
          <p className="text-muted-foreground text-sm">
            {search ? "Nicio persoană găsită." : t("people.empty")}
          </p>
          {!search && (
            <Link
              to="/people/new"
              className="inline-block mt-4 px-5 py-2.5 rounded-full text-primary-foreground font-medium"
              style={{ background: "var(--gradient-festive)" }}
            >
              {t("dashboard.add_person")}
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              locale={locale}
              onFavorite={() => favoriteMutation.mutate({ id: p.id, is_favorite: !p.is_favorite })}
              onDelete={() => setConfirmDelete(p.id)}
            />
          ))}
        </ul>
      )}

      {/* Dialog confirmare ștergere */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 px-4">
          <div className="bg-card rounded-3xl p-6 shadow-xl max-w-sm w-full space-y-4 border border-border">
            <h2 className="font-display text-xl font-semibold">Ștergi persoana?</h2>
            <p className="text-muted-foreground text-sm">
              Această acțiune e permanentă și nu poate fi anulată.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-xl border border-border bg-card hover:bg-muted transition font-medium"
              >
                Anulează
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Se șterge..." : "Șterge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PersonRow({ person, locale, onFavorite, onDelete }: {
  person: Person;
  locale: string;
  onFavorite: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
      <div
        className="grid place-items-center w-11 h-11 rounded-full text-primary-foreground font-semibold shrink-0"
        style={{ background: "var(--gradient-festive)" }}
      >
        {initials(person.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{person.name}</div>
        <div className="text-xs text-muted-foreground">
          {formatMonthDay(person.birthdate, locale)} · {daysUntilBirthday(person.birthdate)} zile
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onFavorite}
          className={`p-2 rounded-xl transition ${person.is_favorite ? "text-yellow-400 hover:text-yellow-500" : "text-muted-foreground hover:text-yellow-400"}`}
        >
          <Star className="w-4 h-4" fill={person.is_favorite ? "currentColor" : "none"} />
        </button>
        <Link
          to="/people/$id/edit"
          params={{ id: person.id }}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <Pencil className="w-4 h-4" />
        </Link>
        <button
          onClick={onDelete}
          className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-muted transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}