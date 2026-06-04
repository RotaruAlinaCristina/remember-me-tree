import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import {
  notificationPermission,
  notificationSupported,
  requestNotificationPermission,
  registerPushSubscription,
  checkAndNotify,
} from "@/lib/notifications";
import type { Person } from "@/lib/birthday";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

const DISMISS_KEY = "ziua-ta:notif-banner-dismissed";

export function NotificationBanner({ people }: { people: Person[] }) {
  const { t } = useI18n();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPerm(notificationPermission());
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  useEffect(() => {
    if (perm === "granted" && people.length) {
      checkAndNotify(people, 3);
      checkAndNotify(people, 0);
    }
  }, [perm, people]);

  if (!notificationSupported()) return null;
  if (perm === "granted" || perm === "denied") return null;
  if (dismissed) return null;

  const enable = async () => {
    const result = await requestNotificationPermission();
    setPerm(result);
    if (result === "granted") {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await registerPushSubscription(data.user.id);
      }
      checkAndNotify(people, 3);
      checkAndNotify(people, 0);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="relative rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
      <div
        className="grid place-items-center w-10 h-10 rounded-full shrink-0 text-primary-foreground"
        style={{ background: "var(--gradient-festive)" }}
      >
        <Bell className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <div className="font-medium">{t("notif.title")}</div>
        <p className="text-sm text-muted-foreground mt-0.5">{t("notif.desc")}</p>
        <button
          onClick={enable}
          className="mt-3 px-4 py-2 rounded-full text-sm font-medium text-primary-foreground"
          style={{ background: "var(--gradient-festive)" }}
        >
          {t("notif.enable")}
        </button>
      </div>
      <button
        onClick={dismiss}
        aria-label={t("notif.dismiss")}
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function NotificationStatusPill() {
  const { t } = useI18n();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => setPerm(notificationPermission()), []);
  if (perm === "unsupported") return null;
  if (perm === "granted") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Bell className="w-3 h-3" /> {t("notif.on")}
      </span>
    );
  }
  if (perm === "denied") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <BellOff className="w-3 h-3" /> {t("notif.blocked")}
      </span>
    );
  }
  return null;
}