import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "ro" | "en";

const STORAGE_KEY = "ziua-ta:lang";

type Dict = Record<string, string>;

const en: Dict = {
  "app.name": "Ziua Ta",
  "app.tagline": "Birthdays, your family tree, and gentle reminders.",

  "nav.upcoming": "Upcoming",
  "nav.people": "People",
  "nav.tree": "Tree",
  "nav.add": "Add person",
  "nav.signout": "Sign out",
  "nav.language": "Language",

  "auth.signin": "Sign in",
  "auth.signup": "Sign up",
  "auth.email": "you@example.com",
  "auth.password": "Password",
  "auth.name": "Your name",
  "auth.create": "Create account",
  "auth.please_wait": "Please wait…",
  "auth.check_email": "Check your email",
  "auth.check_email_desc": "Confirm your address, then sign in.",
  "auth.or": "or",
  "auth.google": "Continue with Google",
  "auth.google_failed": "Google sign-in failed",
  "auth.generic_error": "Something went wrong",

  "dashboard.title": "Upcoming",
  "dashboard.subtitle": "Birthdays in your circle, sorted by what's next.",
  "dashboard.loading": "Loading…",
  "dashboard.empty_title": "No one here yet",
  "dashboard.empty_desc": "Add the first person and we'll start counting down.",
  "dashboard.add_person": "Add a person",
  "dashboard.next_up": "Next up",
  "dashboard.turning": "Turning {age} on {date}",
  "dashboard.days_to_go": "days to go",
  "dashboard.day_to_go": "day to go",
  "dashboard.today": "today 🎉",
  "dashboard.days_short": "days",

  "people.title": "People",
  "people.empty": "No one added yet. Tap the + button below to start.",

  "form.add_title": "Add a person",
  "form.edit_title": "Edit {name}",
  "form.name": "Name",
  "form.birthday": "Birthday",
  "form.gender": "Gender (optional)",
  "form.gender_dash": "—",
  "form.gender_female": "Female",
  "form.gender_male": "Male",
  "form.gender_other": "Other",
  "form.mother": "Mother",
  "form.father": "Father",
  "form.partner": "Partner",
  "form.gift_ideas": "Gift ideas",
  "form.gift_ph": "Books, plants, vinyl…",
  "form.notes": "Notes",
  "form.save": "Save",
  "form.saving": "Saving…",
  "form.save_changes": "Save changes",
  "form.added": "{name} added",
  "form.updated": "{name} updated",
  "form.not_found": "Person not found",
  "form.back": "Back to people",

  "form.err.name_required": "Name is required",
  "form.err.bday_required": "Birthday is required",
  "form.err.self_ref": "A person can't be their own parent or partner",
  "form.err.parents_different": "Mother and father must be different people",
  "form.err.partner_parent": "Partner can't also be a parent",
  "form.err.missing_ref": "Selected relation no longer exists — please reselect",
  "form.warn.title": "Broken relationships detected",
  "form.warn.item": "{field} references a person that no longer exists (id: {id}…). Please reselect or clear it.",

  "tree.title": "Family tree",
  "tree.subtitle": "Built from the relationships you've added. Updates as you go.",
  "tree.empty_title": "No tree yet",
  "tree.empty_desc": "Add people and set their mother, father, or partner to grow your tree.",
  "tree.edit_aria": "Edit {name}",
  "tree.partner_aria": "partner",

  "notif.title": "Get birthday reminders",
  "notif.desc": "Allow notifications and we'll ping you 3 days before each birthday.",
  "notif.enable": "Enable notifications",
  "notif.on": "Reminders on",
  "notif.blocked": "Reminders blocked",
  "notif.dismiss": "Dismiss",

  "err.404_title": "Page not found",
  "err.404_desc": "The page you're looking for doesn't exist or has been moved.",
  "err.go_home": "Go home",
  "err.page_failed": "This page didn't load",
  "err.page_failed_desc": "Something went wrong on our end. You can try refreshing or head back home.",
  "err.try_again": "Try again",
};

const ro: Dict = {
  "app.name": "Ziua Ta",
  "app.tagline": "Zile de naștere, arborele familiei și amintiri blânde.",

  "nav.upcoming": "Urmează",
  "nav.people": "Persoane",
  "nav.tree": "Arbore",
  "nav.add": "Adaugă persoană",
  "nav.signout": "Deconectare",
  "nav.language": "Limbă",

  "auth.signin": "Conectare",
  "auth.signup": "Înregistrare",
  "auth.email": "tu@exemplu.com",
  "auth.password": "Parolă",
  "auth.name": "Numele tău",
  "auth.create": "Creează cont",
  "auth.please_wait": "Te rugăm să aștepți…",
  "auth.check_email": "Verifică-ți emailul",
  "auth.check_email_desc": "Confirmă adresa, apoi conectează-te.",
  "auth.or": "sau",
  "auth.google": "Continuă cu Google",
  "auth.google_failed": "Conectarea cu Google a eșuat",
  "auth.generic_error": "Ceva nu a funcționat",

  "dashboard.title": "Urmează",
  "dashboard.subtitle": "Zilele de naștere din cercul tău, sortate după ce urmează.",
  "dashboard.loading": "Se încarcă…",
  "dashboard.empty_title": "Niciun nume încă",
  "dashboard.empty_desc": "Adaugă prima persoană și începem numărătoarea inversă.",
  "dashboard.add_person": "Adaugă o persoană",
  "dashboard.next_up": "Următorul",
  "dashboard.turning": "Împlinește {age} pe {date}",
  "dashboard.days_to_go": "zile rămase",
  "dashboard.day_to_go": "zi rămasă",
  "dashboard.today": "astăzi 🎉",
  "dashboard.days_short": "zile",

  "people.title": "Persoane",
  "people.empty": "Nicio persoană adăugată. Apasă butonul + de mai jos pentru a începe.",

  "form.add_title": "Adaugă o persoană",
  "form.edit_title": "Editează {name}",
  "form.name": "Nume",
  "form.birthday": "Zi de naștere",
  "form.gender": "Gen (opțional)",
  "form.gender_dash": "—",
  "form.gender_female": "Feminin",
  "form.gender_male": "Masculin",
  "form.gender_other": "Altul",
  "form.mother": "Mamă",
  "form.father": "Tată",
  "form.partner": "Partener",
  "form.gift_ideas": "Idei de cadouri",
  "form.gift_ph": "Cărți, plante, viniluri…",
  "form.notes": "Note",
  "form.save": "Salvează",
  "form.saving": "Se salvează…",
  "form.save_changes": "Salvează modificările",
  "form.added": "{name} adăugat",
  "form.updated": "{name} actualizat",
  "form.not_found": "Persoană inexistentă",
  "form.back": "Înapoi la persoane",

  "form.err.name_required": "Numele este obligatoriu",
  "form.err.bday_required": "Ziua de naștere este obligatorie",
  "form.err.self_ref": "O persoană nu poate fi propriul părinte sau partener",
  "form.err.parents_different": "Mama și tatăl trebuie să fie persoane diferite",
  "form.err.partner_parent": "Partenerul nu poate fi și părinte",
  "form.err.missing_ref": "Relația selectată nu mai există — alege din nou",
  "form.warn.title": "Relații invalide detectate",
  "form.warn.item": "{field} se referă la o persoană inexistentă (id: {id}…). Alege din nou sau elimină.",

  "tree.title": "Arborele familiei",
  "tree.subtitle": "Construit din relațiile pe care le-ai adăugat. Se actualizează pe măsură ce adaugi.",
  "tree.empty_title": "Niciun arbore încă",
  "tree.empty_desc": "Adaugă persoane și setează mama, tatăl sau partenerul pentru a-ți crește arborele.",
  "tree.edit_aria": "Editează {name}",
  "tree.partner_aria": "partener",

  "notif.title": "Primește amintiri pentru zile de naștere",
  "notif.desc": "Permite notificările și te anunțăm cu 3 zile înainte de fiecare zi de naștere.",
  "notif.enable": "Activează notificările",
  "notif.on": "Amintiri active",
  "notif.blocked": "Amintiri blocate",
  "notif.dismiss": "Închide",

  "err.404_title": "Pagina nu a fost găsită",
  "err.404_desc": "Pagina pe care o cauți nu există sau a fost mutată.",
  "err.go_home": "Mergi acasă",
  "err.page_failed": "Pagina nu s-a încărcat",
  "err.page_failed_desc": "Ceva nu a mers bine. Poți reîncerca sau te poți întoarce acasă.",
  "err.try_again": "Reîncearcă",
};

const dicts: Record<Lang, Dict> = { en, ro };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
};

const I18nContext = createContext<Ctx | null>(null);

function format(s: string, params?: Record<string, string | number>): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ro");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "en" || stored === "ro") setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = l;
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Ctx>(() => {
    const dict = dicts[lang];
    return {
      lang,
      setLang,
      locale: lang === "ro" ? "ro-RO" : "en-US",
      t: (key, params) => format(dict[key] ?? en[key] ?? key, params),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback during SSR/prerender so calls before mount don't crash.
    return {
      lang: "ro",
      setLang: () => {},
      locale: "ro-RO",
      t: (k, p) => format(ro[k] ?? en[k] ?? k, p),
    };
  }
  return ctx;
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const next: Lang = lang === "ro" ? "en" : "ro";
  return (
    <button
      onClick={() => setLang(next)}
      aria-label={t("nav.language")}
      className={`text-xs font-semibold tracking-wide px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition ${className}`}
    >
      {lang === "ro" ? "RO · EN" : "EN · RO"}
    </button>
  );
}
