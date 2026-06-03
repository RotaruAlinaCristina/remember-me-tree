import { daysUntilBirthday, ageOn, nextBirthday, type Person } from "./birthday";

const STORAGE_KEY = "kindred:notified";

type NotifiedMap = Record<string, string>; // personId -> "YYYY" (birthday year notified for)

function readMap(): NotifiedMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeMap(m: NotifiedMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
}

export function notificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationSupported()) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

/** Fire notifications for any person whose birthday is within `withinDays` days,
 *  once per birthday year. */
export function checkAndNotify(people: Person[], withinDays = 3) {
  if (!notificationSupported() || Notification.permission !== "granted") return;
  const map = readMap();
  let changed = false;

  for (const p of people) {
    const days = daysUntilBirthday(p.birthdate);
    if (days > withinDays) continue;
    const year = String(nextBirthday(p.birthdate).getFullYear());
    if (map[p.id] === year) continue;

    const turning = ageOn(p.birthdate, nextBirthday(p.birthdate));
    const body =
      days === 0
        ? `🎉 ${p.name} turns ${turning} today!`
        : days === 1
          ? `${p.name} turns ${turning} tomorrow.`
          : `${p.name} turns ${turning} in ${days} days.`;

    try {
      new Notification("Birthday reminder", {
        body,
        tag: `birthday-${p.id}-${year}`,
        icon: "/favicon.ico",
      });
      map[p.id] = year;
      changed = true;
    } catch {
      // ignore
    }
  }

  if (changed) writeMap(map);
}
