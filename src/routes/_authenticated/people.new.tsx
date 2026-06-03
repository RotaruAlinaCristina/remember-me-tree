import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Person } from "@/lib/birthday";

export const Route = createFileRoute("/_authenticated/people/new")({
  component: NewPerson,
});

function NewPerson() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [motherId, setMotherId] = useState("");
  const [fatherId, setFatherId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [giftIdeas, setGiftIdeas] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: people = [] } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const { data } = await supabase.from("people").select("*").order("name");
      return (data ?? []) as Person[];
    },
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { error } = await supabase.from("people").insert({
      user_id: user.id,
      name,
      birthdate,
      gender: gender || null,
      mother_id: motherId || null,
      father_id: fatherId || null,
      partner_id: partnerId || null,
      gift_ideas: giftIdeas || null,
      notes: notes || null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${name} added`);
    qc.invalidateQueries({ queryKey: ["people"] });
    router.navigate({ to: "/people" });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Add a person</h1>

      <Field label="Name">
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Birthday">
        <input required type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Gender (optional)">
        <select value={gender} onChange={(e) => setGender(e.target.value as any)} className={inputCls}>
          <option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-3">
        <PersonSelect label="Mother" value={motherId} onChange={setMotherId} people={people} />
        <PersonSelect label="Father" value={fatherId} onChange={setFatherId} people={people} />
        <PersonSelect label="Partner" value={partnerId} onChange={setPartnerId} people={people} />
      </div>

      <Field label="Gift ideas">
        <textarea value={giftIdeas} onChange={(e) => setGiftIdeas(e.target.value)} rows={3} className={inputCls} placeholder="Books, plants, vinyl…" />
      </Field>
      <Field label="Notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
      </Field>

      <button disabled={loading} className="w-full py-3 rounded-xl font-medium text-primary-foreground disabled:opacity-60" style={{ background: "var(--gradient-festive)", boxShadow: "var(--shadow-glow)" }}>
        {loading ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

const inputCls = "w-full px-4 py-3 rounded-xl bg-input/40 border border-border focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>;
}

function PersonSelect({ label, value, onChange, people }: { label: string; value: string; onChange: (v: string) => void; people: Person[] }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">—</option>
        {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </Field>
  );
}
