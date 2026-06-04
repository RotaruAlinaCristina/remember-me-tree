const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

export function notificationSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationSupported()) return "unsupported";
  return await Notification.requestPermission();
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export async function registerPushSubscription(userId: string): Promise<boolean> {
  try {
    if (!notificationSupported()) return false;

    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    await supabase.from("push_subscriptions").upsert(
      { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: "endpoint" }
    );

    return true;
  } catch (err) {
    console.error("Push registration failed:", err);
    return false;
  }
}

export async function checkAndNotify(people: import("@/lib/birthday").Person[], daysAhead: number): Promise<void> {
  if (!notificationSupported() || Notification.permission !== "granted") return;

  const today = new Date();
  for (const person of people) {
    const [, month, day] = person.birthdate.split("-").map(Number);
    const next = new Date(today.getFullYear(), month - 1, day);
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    const diff = Math.round((next.getTime() - today.getTime()) / 86400000);

    if (diff === daysAhead) {
      new Notification(`🎂 ${person.name}`, {
        body: `Ziua de naștere peste ${daysAhead} zile — ${day}.${month}!`,
        icon: "/icon-192.png",
      });
    }
    if (diff === 0) {
      new Notification(`🎉 La mulți ani, ${person.name}!`, {
        body: `Astăzi este ziua lor de naștere!`,
        icon: "/icon-192.png",
      });
    }
  }
}