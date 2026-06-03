import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import {
  notificationPermission,
  notificationSupported,
  requestNotificationPermission,
  checkAndNotify,
} from "@/lib/notifications";
import type { Person } from "@/lib/birthday";

const DISMISS_KEY = "kindred:notif-banner-dismissed";

export function NotificationBanner({ people }: { people: Person[] }) {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPerm(notificationPermission());
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  // Whenever we have permission + people loaded, check for upcoming birthdays.
  useEffect(() => {
    if (perm === "granted" && people.length) checkAndNotify(people, 3);
  }, [perm, people]);

  if (!notificationSupported()) return null;
  if (perm === "granted" || perm === "denied") return null;
  if (dismissed) return null;

  const enable = async () => {
    const result = await requestNotificationPermission();
    setPerm(result);
    if (result === "granted") checkAndNotify(people, 3);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="relative rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
      <div className="grid place-items-center w-10 h-10 rounded-full shrink-0 text-primary-foreground" style={{ background: "var(--gradient-festive)" }}>
        <Bell className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <div className="font-medium">Get birthday reminders</div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Allow notifications and we'll ping you 3 days before each birthday.
        </p>
        <button
          onClick={enable}
          className="mt-3 px-4 py-2 rounded-full text-sm font-medium text-primary-foreground"
          style={{ background: "var(--gradient-festive)" }}
        >
          Enable notifications
        </button>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function NotificationStatusPill() {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => setPerm(notificationPermission()), []);
  if (perm === "unsupported") return null;
  if (perm === "granted") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Bell className="w-3 h-3" /> Reminders on
      </span>
    );
  }
  if (perm === "denied") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <BellOff className="w-3 h-3" /> Reminders blocked
      </span>
    );
  }
  return null;
}
