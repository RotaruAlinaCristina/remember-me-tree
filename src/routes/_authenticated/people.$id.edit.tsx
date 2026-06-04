import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Person } from "@/lib/birthday";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/people/$id/edit")({
  component: EditPerson,
});

function EditPerson() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useI18n();

  const { data: person, isLoading: personLoading } = useQuery({
    queryKey: ["person", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Person;
    },
  });

  const { data: people = [] } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const { data } = await supabase.from("people").select("*").order("name");
      return (data ?? []) as Person[];
    },
  });

  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [motherId, setMotherId] = useState("");
  const [fatherId, setFatherId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [giftIdeas, setGiftIdeas] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (person) {
      setName(person.name);
      setBirthdate(person.birthdate);
      setGender(person.gender || "");
      setMotherId(person.mother_id || "");
      setFatherId(person.father_id || "");
      setPartnerId(person.partner_id || "");
      setGiftIdeas(person.gift_ideas || "");
      setNotes(person.notes || "");
    }
  }, [person]);

  const idSet = new Set(people.map((p) => p.id));
  const missingRefs: { field: string; id: string }[] = [];
  if (motherId && !idSet.has(motherId) && people.length > 0) missingRefs.push({ field: t("form.mother"), id: motherId });
  if (fatherId && !idSet.has(fatherId) && people.length > 0) missingRefs.push({ field: t("form.father"), id: fatherId });
  if (partnerId && !idSet.has(partnerId) && people.length > 0) missingRefs.push({ field: t("form.partner"), id: partnerId });

  const validate = (): string | null => {
    if (!name.trim()) return t("form.err.name_required");
    if (!birthdate) return t("form.err.bday_required");
    const ids = [motherId, fatherId, partnerId].filter(Boolean);
    if (ids.some((x) => x === id)) return t("form.err.self_ref");
    if (motherId && fatherId && motherId === fatherId) return t("form.err.parents_different");
    if (partnerId && (partnerId === motherId || partnerId === fatherId)) return t("form.err.partner_parent");
    for (const ref of [motherId, fatherId, partnerId]) {
      if (ref && !idSet.has(ref)) return t("form.err.missing_ref");
    }
    return null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }
    setLoading(true);
    const { error } = await supabase.from("people").update({
      name: name.trim(),
      birthdate,
      gender: gender || null,
      mother_id: motherId || null,
      father_id: fatherId || null,
      partner_id: partnerId || null,
      gift_ideas: giftIdeas || null,
      notes: notes || null,
    }).eq("id", id);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("form.updated", { name }));
    qc.invalidateQueries({ queryKey: ["people"] });
    qc.invalidateQueries({ queryKey: ["person", id] });
    router.navigate({ to: "/people" });
  };

  if (personLoading) {
    return <div className="text-muted-foreground text-sm">{t("dashboard.loading")}</div>;
  }

  if (!person) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-semibold">{t("form.not_found")}</h1>
        <Link to="/people" className="text-primary underline">{t("form.back")}</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">{t("form.edit_title", { name: person.name })}</h1>

      {missingRefs.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="font-medium mb-1">{t("form.warn.title")}</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {missingRefs.map((r) => (
              <li key={r.field}>{t("form.warn.item", { field: r.field, id: r.id.slice(0, 8) })}</li>
            ))}
          </ul>
        </div>
      )}

      <Field label={t("form.name")}>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>
      <Field label={t("form.birthday")}>
        <input required type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className={inputCls} />
      </Field>
      <Field label={t("form.gender")}>
        <select value={gender} onChange={(e) => setGender(e.target.value as any)} className={inputCls}>
          <option value="">{t("form.gender_dash")}</option>
          <option value="female">{t("form.gender_female")}</option>
          <option value="male">{t("form.gender_male")}</option>
          <option value="other">{t("form.gender_other")}</option>
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-3">
        <PersonSelect label={t("form.mother")} value={motherId} onChange={setMotherId} people={people} excludeId={id} />
        <PersonSelect label={t("form.father")} value={fatherId} onChange={setFatherId} people={people} excludeId={id} />
        <PersonSelect label={t("form.partner")} value={partnerId} onChange={setPartnerId} people={people} excludeId={id} />
      </div>

      <Field label={t("form.gift_ideas")}>
        <textarea value={giftIdeas} onChange={(e) => setGiftIdeas(e.target.value)} rows={3} className={inputCls} placeholder={t("form.gift_ph")} />
      </Field>
      <Field label={t("form.notes")}>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
      </Field>

      <button disabled={loading} className="w-full py-3 rounded-xl font-medium text-primary-foreground disabled:opacity-60" style={{ background: "var(--gradient-festive)", boxShadow: "var(--shadow-glow)" }}>
        {loading ? t("form.saving") : t("form.save_changes")}
      </button>
    </form>
  );
}

const inputCls = "w-full px-4 py-3 rounded-xl bg-input/40 border border-border focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>;
}

function PersonSelect({ label, value, onChange, people, excludeId }: { label: string; value: string; onChange: (v: string) => void; people: Person[]; excludeId?: string }) {
  const choices = excludeId ? people.filter((p) => p.id !== excludeId) : people;
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">—</option>
        {choices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </Field>
  );
}
