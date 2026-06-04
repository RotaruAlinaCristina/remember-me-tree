import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { daysUntilBirthday, ageOn, nextBirthday, formatMonthDay, initials, type Person } from "@/lib/birthday";
import { Cake, Gift } from "lucide-react";
import { NotificationBanner, NotificationStatusPill } from "@/components/NotificationBanner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const { data: people = [], isLoading } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });

  const sorted = [...people].sort((a, b) => daysUntilBirthday(a.birthdate) - daysUntilBirthday(b.birthdate));
  const next = sorted[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("dashboard.subtitle")}</p>
        </div>
        <NotificationStatusPill />
      </div>

      <NotificationBanner people={people} />

      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t("dashboard.loading")}</div>
      ) : people.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {next && <HeroCard person={next} />}
          <ul className="space-y-2">
            {sorted.slice(1).map((p) => (
              <PersonRow key={p.id} person={p} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function HeroCard({ person }: { person: Person }) {
  const { t, locale } = useI18n();
  const days = daysUntilBirthday(person.birthdate);
  const turning = ageOn(person.birthdate, nextBirthday(person.birthdate));
  return (
    <Link to="/people/$id/edit" params={{ id: person.id }} className="block rounded-3xl p-6 text-primary-foreground shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-festive)" }}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-90"><Cake className="w-4 h-4" /> {t("dashboard.next_up")}</div>
      <div className="mt-3 font-display text-3xl font-semibold">{person.name}</div>
      <div className="opacity-95 mt-1">{t("dashboard.turning", { age: turning, date: formatMonthDay(person.birthdate, locale) })}</div>
      <div className="mt-5 inline-flex items-baseline gap-2">
        <span className="font-display text-5xl font-semibold">{days}</span>
        <span className="opacity-90">{days === 1 ? t("dashboard.day_to_go") : days === 0 ? t("dashboard.today") : t("dashboard.days_to_go")}</span>
      </div>
    </Link>
  );
}

function PersonRow({ person }: { person: Person }) {
  const { t, locale } = useI18n();
  const days = daysUntilBirthday(person.birthdate);
  return (
    <Link to="/people/$id/edit" params={{ id: person.id }} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:shadow-[var(--shadow-card)] transition">
      <div className="grid place-items-center w-11 h-11 rounded-full bg-secondary text-secondary-foreground font-semibold">
        {initials(person.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{person.name}</div>
        <div className="text-xs text-muted-foreground">{formatMonthDay(person.birthdate, locale)}</div>
      </div>
      <div className="text-right">
        <div className="font-display text-lg font-semibold">{days}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("dashboard.days_short")}</div>
      </div>
    </Link>
  );
}

function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-border bg-card/50">
      <Gift className="w-10 h-10 mx-auto text-primary mb-3" />
      <h2 className="font-display text-xl font-semibold">{t("dashboard.empty_title")}</h2>
      <p className="text-muted-foreground text-sm mt-1 mb-5">{t("dashboard.empty_desc")}</p>
      <Link to="/people/new" className="inline-block px-5 py-2.5 rounded-full text-primary-foreground font-medium" style={{ background: "var(--gradient-festive)" }}>
        {t("dashboard.add_person")}
      </Link>
    </div>
  );
}
