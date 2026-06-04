import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  try {
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const { data: people } = await supabase
      .from("people")
      .select("*, push_subscriptions!inner(*)");

    if (!people) return new Response("No people", { status: 200 });

    for (const person of people) {
      const [, month, day] = person.birthdate.split("-").map(Number);
      const next = new Date(today.getFullYear(), month - 1, day);
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      const diff = Math.round((next.getTime() - today.getTime()) / 86400000);

      let reminderType: string | null = null;
      let title = "";
      let body = "";

      if (diff === 3) {
        reminderType = "3days";
        title = `🎂 ${person.name}`;
        body = `Ziua de naștere în 3 zile — ${day}.${month}!`;
      } else if (diff === 0) {
        reminderType = "today";
        title = `🎉 La mulți ani, ${person.name}!`;
        body = `Astăzi este ziua lor de naștere!`;
      }

      if (!reminderType) continue;

      // Verifică dacă am trimis deja azi
      const { data: existing } = await supabase
        .from("reminder_log")
        .select("id")
        .eq("user_id", person.user_id)
        .eq("person_id", person.id)
        .eq("reminder_type", reminderType)
        .eq("sent_date", todayStr)
        .single();

      if (existing) continue;

      // Trimite push la toate dispozitivele utilizatorului
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", person.user_id);

      for (const sub of subs ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title, body, url: "/dashboard" })
          );
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }

      // Loghează că am trimis
      await supabase.from("reminder_log").insert({
        user_id: person.user_id,
        person_id: person.id,
        reminder_type: reminderType,
        sent_date: todayStr,
      });
    }

    return new Response("Done", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 500 });
  }
});