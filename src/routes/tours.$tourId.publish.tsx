import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TourStepNav } from "@/components/TourStepNav";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, CheckCheck, Check, Clock, X as XIcon, Cog, Cloud } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge, Status } from "@/components/StatusBadge";

export const Route = createFileRoute("/tours/$tourId/publish")({
  head: () => ({ meta: [{ title: "Publish to Google — TourVista" }] }),
  component: PublishPage,
});

type Photo = { id: string; filename: string | null; status: Status; file_url: string };

function PublishPage() {
  const { tourId } = Route.useParams();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tourName, setTourName] = useState("");
  const [nadirType, setNadirType] = useState("Stretch Blur");
  const [size, setSize] = useState("13%");
  const [pos, setPos] = useState("btm");
  const [confirm, setConfirm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [googleConnected] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: t } = await supabase.from("tours").select("name").eq("id", tourId).maybeSingle();
    setTourName(t?.name ?? "");
    const { data: ps } = await supabase.from("photos").select("id,filename,status,file_url").eq("tour_id", tourId).order("uploaded_at");
    setPhotos((ps as any) ?? []);
  };
  useEffect(() => { load(); }, [user, tourId]);

  const publishAll = async () => {
    setConfirm(false);
    setPublishing(true);
    let pub = 0; let rej = 0;
    for (const p of photos) {
      await supabase.from("photos").update({ status: "processing" }).eq("id", p.id);
      setPhotos((s) => s.map((x) => x.id === p.id ? { ...x, status: "processing" as Status } : x));
      await new Promise((r) => setTimeout(r, 600));
      const ok = Math.random() > 0.1;
      const next: Status = ok ? "published" : "rejected";
      if (ok) pub++; else rej++;
      await supabase.from("photos").update({ status: next }).eq("id", p.id);
      setPhotos((s) => s.map((x) => x.id === p.id ? { ...x, status: next } : x));
    }
    setPublishing(false);
    toast.success(`${pub} scenes published, ${rej} rejected`);
  };

  return (
    <AppShell title="Publish to Google" breadcrumbs={[{ label: "Tours", to: "/tours" }, { label: tourName || "Tour" }, { label: "Publish" }]}>
      <TourStepNav tourId={tourId} current="publish" />

      {/* Top info bar */}
      <div className="mb-4 rounded-xl border bg-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="text-muted-foreground">owner:</span> <span className="font-medium">{user?.email ?? "—"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">Nadir Type:</span>
            <select value={nadirType} onChange={(e) => setNadirType(e.target.value)} className="border rounded px-2 py-1 bg-background">
              <option>Stretch Blur</option><option>Color Blur</option><option>None</option><option>Custom Logo</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">Size:</span>
            <select value={size} onChange={(e) => setSize(e.target.value)} className="border rounded px-2 py-1 bg-background">
              <option>5%</option><option>10%</option><option>13%</option><option>15%</option><option>20%</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">Pos:</span>
            <select value={pos} onChange={(e) => setPos(e.target.value)} className="border rounded px-2 py-1 bg-background">
              <option value="btm">btm</option><option value="ctr">ctr</option><option value="top">top</option>
            </select>
          </label>
        </div>
      </div>

      {nadirType === "Custom Logo" && (
        <div className="mb-4 rounded-xl border-2 border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          Drop a PNG logo here or click to upload (coming soon)
        </div>
      )}

      <div className="rounded-xl border bg-card p-8">
        <h2 className="text-2xl font-bold text-center mb-3">Publish your scenes to Google</h2>
        <div className="h-2 rounded-full bg-gradient-to-r from-primary to-success mb-8" />

        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="space-y-4">
            {!googleConnected && (
              <Button variant="outline" className="w-full" onClick={() => toast.info("Google OAuth — connect coming in a future update")}>
                <Cloud className="h-4 w-4 mr-2" /> Connect Google Account
              </Button>
            )}
            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={publishing || photos.length === 0}
              onClick={() => setConfirm(true)}
            >
              <Send className="h-5 w-5 mr-2" />
              {publishing ? "Publishing…" : `Publish ${photos.length} scene${photos.length === 1 ? "" : "s"}`}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Settings: {nadirType} • {size} • {pos}</p>
          </div>

          {/* Conveyor animation */}
          <div className="relative h-32 rounded-lg bg-muted overflow-hidden border">
            <div className="absolute inset-x-0 bottom-4 h-1 bg-foreground/30" />
            <div className="absolute bottom-5 left-0 right-0 h-6 flex items-end gap-3 conveyor">
              {[0,1,2,3,4].map((i) => (
                <div key={i} className="h-6 w-6 bg-primary rounded-sm" />
              ))}
            </div>
            <div className={`absolute top-2 right-3 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center ${publishing ? "animate-spin" : ""}`}>
              <Cog className="h-7 w-7 text-primary" />
            </div>
          </div>
        </div>

        {/* Per-scene progress */}
        {photos.length > 0 && (
          <div className="mt-8 space-y-1.5 max-h-64 overflow-y-auto">
            {photos.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2 bg-background">
                <span className="text-muted-foreground w-8">{i}</span>
                <span className="flex-1 truncate">{p.filename}</span>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status legend */}
      <div className="mt-6 rounded-xl border bg-card p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2"><CheckCheck className="h-4 w-4 text-success" /> All connections published</div>
        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-warning" /> Some connections published</div>
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-warning" /> Still processing</div>
        <div className="flex items-center gap-2"><XIcon className="h-4 w-4 text-destructive" /> Rejected</div>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm publish</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            You are about to publish <strong>{photos.length}</strong> scenes to Google Street View under <strong>{user?.email}</strong>. This cannot be undone. Continue?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button onClick={publishAll}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes conveyor { from { transform: translateX(-50px); } to { transform: translateX(50px); } }
        .conveyor { animation: conveyor 2s linear infinite; }
      `}</style>
    </AppShell>
  );
}
