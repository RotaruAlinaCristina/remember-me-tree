export type Person = {
  id: string;
  user_id: string;
  name: string;
  birthdate: string;
  gender: "male" | "female" | "other" | null;
  photo_url: string | null;
  notes: string | null;
  gift_ideas: string | null;
  mother_id: string | null;
  father_id: string | null;
  partner_id: string | null;
  is_self: boolean;
  is_favorite: boolean;
};

export function parseBirthdate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export function nextBirthday(birthdate: string, from = new Date()): Date {
  const bd = parseBirthdate(birthdate);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, bd.getMonth(), bd.getDate());
  return next;
}

export function daysUntilBirthday(birthdate: string, from = new Date()): number {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const next = nextBirthday(birthdate, from);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export function ageOn(birthdate: string, when: Date): number {
  const bd = parseBirthdate(birthdate);
  let age = when.getFullYear() - bd.getFullYear();
  const m = when.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && when.getDate() < bd.getDate())) age--;
  return age;
}

export function zodiacSign(birthdate: string): string {
  const d = parseBirthdate(birthdate);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const signs: [string, number, number][] = [
    ["Capricorn", 12, 22], ["Aquarius", 1, 20], ["Pisces", 2, 19],
    ["Aries", 3, 21], ["Taurus", 4, 20], ["Gemini", 5, 21],
    ["Cancer", 6, 21], ["Leo", 7, 23], ["Virgo", 8, 23],
    ["Libra", 9, 23], ["Scorpio", 10, 23], ["Sagittarius", 11, 22],
  ];
  for (let i = signs.length - 1; i >= 0; i--) {
    const [n, sm, sd] = signs[i];
    if (m > sm || (m === sm && day >= sd)) return n;
  }
  return "Capricorn";
}

export function formatMonthDay(birthdate: string, locale?: string): string {
  const d = parseBirthdate(birthdate);
  return d.toLocaleDateString(locale, { month: "long", day: "numeric" });
}


export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}
