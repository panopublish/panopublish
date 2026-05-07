import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Map, Users, Camera, CheckCircle2, Plus, ListChecks, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TourVista" }] }),
  component: Dashboard,
});

type Stats = { clients: number; tours: number; published: number; processing: number; uploaded: number };

const planLimit: Record<string, number> = { trial: 5, basic: 5, pro: 25, agency: 9999 };

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [profile, setProfile] = useState<{ plan: string; onboarding_dismissed: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, c, t] = await Promise.all([
        supabase.from("profiles").select("plan,onboarding_dismissed").eq("id", user.id).maybeSingle(),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("tours").select("id,status").eq("user_id", user.id),
      ]);
      setProfile(p.data ?? null);
      const tours = t.data ?? [];
      setStats({
        clients: c.count ?? 0,
        tours: tours.length,
        published: tours.filter((x) => x.status === "published").length,
        processing: tours.filter((x) => x.status === "processing").length,
        uploaded: 0,
      });
    })();
  }, [user]);

  const dismissOnboarding = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_dismissed: true }).eq("id", user.id);
    setProfile((p) => (p ? { ...p, onboarding_dismissed: true } : p));
  };

  const limit = planLimit[profile?.plan ?? "trial"] ?? 5;
  const tourCount = stats?.tours ?? 0;
  const usagePct = Math.min(100, (tourCount / limit) * 100);

  const onboarding = [
    { label: "Create your first client", done: (stats?.clients ?? 0) > 0, to: "/clients" },
    { label: "Create your first tour", done: (stats?.tours ?? 0) > 0, to: "/tours/new" },
    { label: "Upload your first photo", done: false, to: "/tours" },
    { label: "Publish to Google Maps", done: (stats?.published ?? 0) > 0, to: "/tours" },
  ];
  const doneCount = onboarding.filter((o) => o.done).length;

  return (
    <AppShell title={`Welcome${user?.email ? `, ${user.email.split("@")[0]}` : ""}`} breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link to="/tours/new"><Button><Plus className="h-4 w-4 mr-1" /> Create Tour</Button></Link>
        <Link to="/tours"><Button variant="outline"><Map className="h-4 w-4 mr-1" /> My Tours</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Users} label="Total clients" value={stats?.clients} />
        <Stat icon={Map} label="Total tours" value={stats?.tours} />
        <Stat icon={CheckCircle2} label="Published tours" value={stats?.published} accent="success" />
        <Stat icon={Camera} label="Processing" value={stats?.processing} accent="warning" />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Plan usage</h3>
            <span className="text-sm text-muted-foreground">{tourCount}/{limit === 9999 ? "∞" : limit} tours used</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${usagePct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Plan: <strong className="capitalize">{profile?.plan ?? "trial"}</strong></p>
        </div>

        {!profile?.onboarding_dismissed && (
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> Get started</h3>
              <button onClick={dismissOnboarding} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{doneCount} of {onboarding.length} steps complete</p>
            <ul className="space-y-2">
              {onboarding.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-2 text-sm">
                  <span className={`flex items-center gap-2 ${s.done ? "text-muted-foreground line-through" : ""}`}>
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${s.done ? "bg-success text-white" : "border"}`}>{s.done ? "✓" : ""}</span>
                    {s.label}
                  </span>
                  {!s.done && <Link to={s.to} className="text-xs text-primary font-medium">Do this now</Link>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value?: number; accent?: "success" | "warning" }) {
  const accentCls = accent === "success" ? "bg-success/10 text-success" : accent === "warning" ? "bg-warning/20 text-warning-foreground" : "bg-primary/10 text-primary";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${accentCls}`}><Icon className="h-4 w-4" /></div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {value === undefined ? <Skeleton className="h-7 w-12 mt-1" /> : <div className="text-2xl font-semibold">{value}</div>}
    </div>
  );
}
