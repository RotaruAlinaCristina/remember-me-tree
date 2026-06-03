import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Cake, Users, GitBranch, LogOut, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="mx-auto max-w-2xl px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid place-items-center w-8 h-8 rounded-full" style={{ background: "var(--gradient-festive)" }}>
              <Cake className="w-4 h-4 text-primary-foreground" />
            </span>
            <span className="font-display text-xl font-semibold">Kindred</span>
          </Link>
          <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground p-2 -mr-2">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-5 py-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-2xl grid grid-cols-4 items-center">
          <TabLink to="/" icon={<Cake className="w-5 h-5" />} label="Upcoming" />
          <TabLink to="/people" icon={<Users className="w-5 h-5" />} label="People" />
          <div className="flex justify-center">
            <Link to="/people/new" className="-mt-6 grid place-items-center w-14 h-14 rounded-full shadow-lg text-primary-foreground" style={{ background: "var(--gradient-festive)", boxShadow: "var(--shadow-glow)" }} aria-label="Add person">
              <Plus className="w-6 h-6" />
            </Link>
          </div>
          <TabLink to="/tree" icon={<GitBranch className="w-5 h-5" />} label="Tree" />
        </div>
      </nav>
    </div>
  );
}

function TabLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground [&.active]:text-primary"
      activeOptions={{ exact: to === "/" }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
