import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMonthDay, initials, type Person } from "@/lib/birthday";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/people/")({
  component: PeopleList,
});

function PeopleList() {
  const { t, locale } = useI18n();
  const { data: people = [] } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">{t("people.title")}</h1>
      {people.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("people.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => (
            <Link key={p.id} to="/people/$id/edit" params={{ id: p.id }} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
              <div className="grid place-items-center w-11 h-11 rounded-full bg-secondary font-semibold">{initials(p.name)}</div>
              <div className="flex-1">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{formatMonthDay(p.birthdate, locale)}</div>
              </div>
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
}
