import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { WhatsAppButton } from "./WhatsAppButton";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { Logo } from "./Logo";

type Crumb = { label: string; to?: string };

export function AppShell({ children, title, breadcrumbs }: { children: ReactNode; title?: string; breadcrumbs?: Crumb[] }) {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan,trial_ends_at").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.plan === "trial" && data.trial_ends_at) {
        const ms = new Date(data.trial_ends_at).getTime() - Date.now();
        setTrialDaysLeft(Math.max(0, Math.ceil(ms / 86400000)));
      } else setTrialDaysLeft(null);
    });
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    
    supabase.from("google_tokens").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      const isConnected = !!data;
      if (isConnected) {
        localStorage.setItem("google_connected", "true");
      } else {
        localStorage.removeItem("google_connected");
      }
    });
  }, [user]);

  // keyboard: ctrl+n new tour, ctrl+k focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault(); navigate({ to: "/tours/new" });
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <header className="bg-background border-b">
          <div className="flex items-center gap-3 px-4 md:px-8 py-3">
            <Link to="/dashboard" className="md:hidden">
              <Logo logoClassName="h-7 w-7 text-primary" className="text-base font-bold" />
            </Link>
            <div className="flex-1 max-w-lg relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="global-search"
                placeholder="Search clients & tours… (Ctrl+K)"
                className="w-full rounded-md border bg-card pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {trialDaysLeft !== null && (
              <Link to="/settings" className="hidden sm:inline-flex items-center rounded-full bg-warning/20 text-warning-foreground px-3 py-1 text-xs font-medium">
                Trial: {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left
              </Link>
            )}
          </div>
          {(title || breadcrumbs?.length) && (
            <div className="px-4 md:px-8 pb-4">
              {breadcrumbs?.length ? (
                <nav className="text-xs text-muted-foreground mb-1">
                  {breadcrumbs.map((c, i) => (
                    <span key={i}>
                      {c.to ? <Link to={c.to} className="hover:text-foreground">{c.label}</Link> : c.label}
                      {i < breadcrumbs.length - 1 && <span className="mx-1.5">/</span>}
                    </span>
                  ))}
                </nav>
              ) : null}
              {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
            </div>
          )}
        </header>
        <div className="px-4 md:px-8 py-6">{children}</div>
      </main>
      <WhatsAppButton />
    </div>
  );
}
