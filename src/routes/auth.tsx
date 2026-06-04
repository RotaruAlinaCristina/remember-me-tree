import { createFileRoute, redirect, Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Cake } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { LanguageToggle, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success(t("auth.check_email"), { description: t("auth.check_email_desc") });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? t("auth.generic_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(t("auth.google_failed"));
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    router.navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid place-items-center px-5 py-10 relative" style={{ background: "var(--gradient-soft)" }}>
      <div className="absolute top-4 right-4"><LanguageToggle /></div>
      <div className="w-full max-w-sm">
        <Link to="/auth" className="flex flex-col items-center gap-3 mb-8">
          <span className="grid place-items-center w-14 h-14 rounded-2xl shadow-md" style={{ background: "var(--gradient-festive)" }}>
            <Cake className="w-7 h-7 text-primary-foreground" />
          </span>
          <h1 className="font-display text-3xl font-semibold">{t("app.name")}</h1>
          <p className="text-muted-foreground text-sm text-center">{t("app.tagline")}</p>
        </Link>

        <div className="bg-card rounded-2xl p-6 shadow-[var(--shadow-card)] border border-border">
          <div className="flex bg-muted rounded-full p-1 mb-6 text-sm">
            <button onClick={() => setMode("signin")} className={`flex-1 py-2 rounded-full transition ${mode === "signin" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>{t("auth.signin")}</button>
            <button onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-full transition ${mode === "signup" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>{t("auth.signup")}</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <Input value={name} onValueChange={setName} placeholder={t("auth.name")} autoComplete="name" required />
            )}
            <Input value={email} onValueChange={setEmail} type="email" placeholder={t("auth.email")} autoComplete="email" required />
            <Input value={password} onValueChange={setPassword} type="password" placeholder={t("auth.password")} autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={6} />
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-medium text-primary-foreground disabled:opacity-60" style={{ background: "var(--gradient-festive)", boxShadow: "var(--shadow-glow)" }}>
              {loading ? t("auth.please_wait") : mode === "signup" ? t("auth.create") : t("auth.signin")}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> {t("auth.or")} <div className="h-px flex-1 bg-border" />
          </div>

          <button onClick={handleGoogle} disabled={loading} className="w-full py-3 rounded-xl border border-border bg-card hover:bg-muted transition font-medium flex items-center justify-center gap-2">
            <GoogleIcon /> {t("auth.google")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ value, onValueChange, ...rest }: { value: string; onValueChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl bg-input/40 border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground"
    />
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.1 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.9 0 9.5-4.8 9.5-7.3 0-.5 0-.8-.1-1.2H12z"/>
    </svg>
  );
}
