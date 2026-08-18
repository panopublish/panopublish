import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { WhatsAppButton } from "./WhatsAppButton";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ShieldAlert, ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./ui/button";

type Crumb = { label: string; to?: string };

export function AppShell({
  children,
  title,
  breadcrumbs,
}: {
  children: ReactNode;
  title?: string;
  breadcrumbs?: Crumb[];
}) {
  const { loading, user, impersonatorSession, stopImpersonation } = useAuth();
  const navigate = useNavigate();
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("plan,trial_ends_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.plan === "trial" && data.trial_ends_at) {
          const ms = new Date(data.trial_ends_at).getTime() - Date.now();
          setTrialDaysLeft(Math.max(0, Math.ceil(ms / 86400000)));
        } else setTrialDaysLeft(null);
      });
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login/" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("google_tokens")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
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
        e.preventDefault();
        navigate({ to: "/tours/new/" });
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
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        {impersonatorSession && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 px-4 py-2.5 shadow-md flex items-center justify-between gap-3 sticky top-0 z-50 border-b border-amber-600/30">
            <div className="flex items-center gap-2.5 min-w-0 text-xs md:text-sm font-medium">
              <div className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-950"></span>
              </div>
              <ShieldAlert className="h-4 w-4 shrink-0 text-slate-950" />
              <div className="truncate">
                <span className="font-extrabold uppercase tracking-wide mr-1.5 text-[11px] bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded">
                  Admin Impersonation
                </span>
                Logged in as <strong className="underline decoration-slate-950/40">{user?.email}</strong>. Actions affect this account directly.
              </div>
            </div>
            <Button
              size="sm"
              onClick={stopImpersonation}
              className="bg-slate-950 text-white hover:bg-slate-900 hover:text-white border-0 shadow text-xs font-bold shrink-0 h-7 px-3 rounded-lg cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Exit to Admin</span>
            </Button>
          </div>
        )}
        <header className="bg-background border-b">
          <div className="flex items-center gap-3 px-4 md:px-8 py-3">
            <Link to="/dashboard/" className="md:hidden">
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
              <Link
                to="/settings/"
                className="hidden sm:inline-flex items-center rounded-full bg-warning/20 text-warning-foreground px-3 py-1 text-xs font-medium"
              >
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
                      {c.to ? (
                        <Link to={c.to} className="hover:text-foreground">
                          {c.label}
                        </Link>
                      ) : (
                        c.label
                      )}
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
