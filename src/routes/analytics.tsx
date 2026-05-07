import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { formatDateIN } from "@/lib/format";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — TourVista" }] }),
  component: Analytics,
});

function Analytics() {
  const { user } = useAuth();
  const [tours, setTours] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("tours").select("id,name,status,created_at,client:clients(name)").eq("user_id", user.id).order("created_at").then(({ data }) => setTours(data ?? []));
  }, [user]);

  const monthly = (() => {
    const map = new Map<string, number>();
    tours.forEach((t) => {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([month, count]) => ({ month, count }));
  })();

  const totalViews = tours.length * 142; // placeholder

  return (
    <AppShell title="Analytics" breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Analytics" }]}>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border bg-card p-5"><div className="text-xs text-muted-foreground">Total views (placeholder)</div><div className="text-2xl font-semibold">{totalViews.toLocaleString("en-IN")}</div></div>
        <div className="rounded-xl border bg-card p-5"><div className="text-xs text-muted-foreground">Total tours</div><div className="text-2xl font-semibold">{tours.length}</div></div>
        <div className="rounded-xl border bg-card p-5"><div className="text-xs text-muted-foreground">Published</div><div className="text-2xl font-semibold">{tours.filter((t) => t.status === "published").length}</div></div>
      </div>

      <div className="rounded-xl border bg-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Tours created per month</h3><Button variant="outline" size="sm">Connect Google Analytics</Button></div>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" /><YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr><th className="p-3">Tour</th><th className="p-3">Client</th><th className="p-3">Views (mo)</th><th className="p-3">Created</th></tr></thead>
          <tbody>
            {tours.length === 0 ? <tr><td className="p-4 text-muted-foreground" colSpan={4}>No tours yet.</td></tr> :
              tours.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3 font-medium">{t.name}</td>
                  <td className="p-3 text-muted-foreground">{t.client?.name ?? "—"}</td>
                  <td className="p-3">{Math.floor(Math.random() * 300)}</td>
                  <td className="p-3 text-muted-foreground">{formatDateIN(t.created_at)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
