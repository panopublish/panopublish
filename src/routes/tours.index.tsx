import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Map } from "lucide-react";
import { StatusBadge, Status } from "@/components/StatusBadge";
import { formatDateIN } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/tours/")({
  head: () => ({ meta: [{ title: "Tours — TourVista" }] }),
  component: ToursPage,
});

type Tour = { id: string; name: string; status: Status; type: string; created_at: string; client?: { name: string } | null };

function ToursPage() {
  const { user } = useAuth();
  const [tours, setTours] = useState<Tour[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("tours").select("id,name,status,type,created_at,client:clients(name)").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setTours((data as any) ?? []));
  }, [user]);

  return (
    <AppShell title="Tours" breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Tours" }]}>
      <div className="flex justify-end mb-4">
        <Link to="/tours/new"><Button><Plus className="h-4 w-4 mr-1" /> Create Tour</Button></Link>
      </div>
      {tours === null ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : tours.length === 0 ? (
        <EmptyState icon={Map} title="No tours yet" description="Create your first 360° tour and publish it to Google Maps."
          action={<Link to="/tours/new"><Button><Plus className="h-4 w-4 mr-1" /> Create Tour</Button></Link>} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tours.map((t) => (
            <Link key={t.id} to="/tours/$tourId" params={{ tourId: t.id }} className="rounded-xl border bg-card p-5 hover:shadow-elegant transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.client?.name ?? "No client"}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
              <div className="mt-4 text-xs text-muted-foreground flex items-center justify-between">
                <span className="capitalize">{t.type === "gmaps" ? "Google Maps" : "Custom"}</span>
                <span>{formatDateIN(t.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
