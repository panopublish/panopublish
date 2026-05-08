import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TourStepNav } from "@/components/TourStepNav";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Check, Save, Undo2, Share2, ArrowRight, AlertTriangle, Clock, X as XIcon, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tours/$tourId/connections")({
  head: () => ({ meta: [{ title: "Build Connections — TourVista" }] }),
  component: ConnectionsPage,
});

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

type Photo = { id: string; file_url: string; filename: string | null };
type Conn = { id: string; from_photo_id: string; to_photo_id: string; group_name: string | null; heading: number; pitch: number };

function ConnectionsPage() {
  const { tourId } = Route.useParams();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [conns, setConns] = useState<Conn[]>([]);
  const [groupName, setGroupName] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [tour, setTour] = useState<{ latitude: number | null; longitude: number | null; name: string } | null>(null);
  const [aligns, setAligns] = useState<Record<string, { auto: boolean; value: number }>>({});

  const load = async () => {
    if (!user) return;
    const { data: t } = await supabase.from("tours").select("name,latitude,longitude").eq("id", tourId).maybeSingle();
    setTour(t as any);
    const { data: ps } = await supabase.from("photos").select("id,file_url,filename").eq("tour_id", tourId).order("uploaded_at");
    setPhotos((ps as any) ?? []);
    const { data: cs } = await supabase.from("connections").select("*").eq("tour_id", tourId);
    setConns((cs as any) ?? []);
  };
  useEffect(() => { load(); }, [user, tourId]);

  const addedIds = new Set(conns.flatMap((c) => [c.from_photo_id, c.to_photo_id]));
  const active = photos[activeIdx];

  const addToConnection = async (p: Photo) => {
    if (!user) return;
    if (!groupName.trim()) return toast.error("Enter a group name first");
    // Connect to previously-added photo in same group, or self for first
    const groupConns = conns.filter((c) => c.group_name === groupName.trim());
    const lastId = groupConns.length > 0 ? groupConns[groupConns.length - 1].to_photo_id : null;
    if (lastId === p.id) return toast.info("Already last scene in group");
    const a = aligns[p.id] ?? { auto: true, value: 5 };
    const { error } = await supabase.from("connections").insert({
      user_id: user.id,
      tour_id: tourId,
      from_photo_id: lastId ?? p.id,
      to_photo_id: p.id,
      group_name: groupName.trim(),
      heading: a.value * 36, // 0..10 -> 0..360
      pitch: 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Scene connected");
    load();
  };

  const removeConn = async (photoId: string) => {
    await supabase.from("connections").delete().eq("tour_id", tourId).or(`from_photo_id.eq.${photoId},to_photo_id.eq.${photoId}`);
    load();
  };

  const embedSrc = MAPS_KEY && tour?.latitude != null && tour?.longitude != null
    ? `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${tour.latitude},${tour.longitude}&zoom=18&maptype=satellite`
    : null;

  return (
    <AppShell title="Build Connections" breadcrumbs={[{ label: "Tours", to: "/tours" }, { label: tour?.name ?? "Tour" }, { label: "Build Connections" }]}>
      <TourStepNav tourId={tourId} current="connections" />

      {/* Action toolbar */}
      <div className="mb-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => toast.success("Saved")}><Save className="h-4 w-4 mr-1" />Save</Button>
        <Button variant="outline" size="sm" onClick={load}><Undo2 className="h-4 w-4 mr-1" />Undo</Button>
        <Button variant="outline" size="sm" onClick={() => toast.info("Share link copied")}><Share2 className="h-4 w-4 mr-1" />Share</Button>
        <Button variant="outline" size="sm" className="ml-auto"><ArrowRight className="h-4 w-4 mr-1" />Next</Button>
      </div>

      <div className="grid lg:grid-cols-[35fr_65fr] gap-4">
        {/* Left: map */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
          <div className="aspect-square bg-muted relative">
            {embedSrc ? (
              <iframe src={embedSrc} className="w-full h-full" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
                {addedIds.size === 0
                  ? "You do not have any connected scenes to display. Add a scene by clicking the + button on one of the scenes to the right."
                  : MAPS_KEY ? "Set the tour location first." : "Add VITE_GOOGLE_MAPS_API_KEY to enable map."}
              </div>
            )}
          </div>
          <div className="p-3 bg-primary/10 border-t">
            <Label className="text-xs">Enter A Name</Label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Constellation name"
              className="mt-1 bg-background"
            />
          </div>
        </div>

        {/* Right: scenes */}
        <div className="rounded-xl border bg-card p-3 flex flex-col">
          {/* Selected preview */}
          <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-3 border-2 border-primary">
            {active ? (
              <img src={active.file_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">No scenes uploaded yet</div>
            )}
          </div>

          {/* Thumbnail list */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto max-h-[480px] pr-1">
            {photos.map((p, idx) => {
              const added = addedIds.has(p.id);
              const al = aligns[p.id] ?? { auto: true, value: 5 };
              return (
                <div key={p.id} className={`rounded-lg border bg-background ${activeIdx === idx ? "ring-2 ring-primary" : ""}`}>
                  <div className="relative aspect-square cursor-pointer" onClick={() => setActiveIdx(idx)}>
                    <img src={p.file_url} alt="" className="w-full h-full object-cover rounded-t-lg" />
                    <div className="absolute top-1 left-1 rounded bg-foreground text-background px-1.5 py-0.5 text-[10px] font-semibold">{idx}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); added ? removeConn(p.id) : addToConnection(p); }}
                      className={`absolute top-1 right-1 h-6 w-6 rounded-full flex items-center justify-center text-white ${added ? "bg-success" : "bg-success hover:bg-success/90"}`}
                      title={added ? "Remove from connection" : "Add to connection"}
                    >
                      {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="p-1.5 space-y-1">
                    <label className="flex items-center gap-1 text-[10px]">
                      <input
                        type="checkbox"
                        checked={al.auto}
                        onChange={(e) => setAligns((s) => ({ ...s, [p.id]: { ...al, auto: e.target.checked } }))}
                      />
                      AUTO ALIGN
                    </label>
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <span>F</span>
                      <input
                        type="range" min={0} max={10} value={al.value}
                        onChange={(e) => setAligns((s) => ({ ...s, [p.id]: { ...al, value: Number(e.target.value) } }))}
                        className="flex-1"
                      />
                      <span>P</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status legend */}
      <div className="mt-6 rounded-xl border bg-card p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2"><CheckCheck className="h-4 w-4 text-success" /> All connections published</div>
        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-warning" /> Some connections published</div>
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-warning" /> Still processing</div>
        <div className="flex items-center gap-2"><XIcon className="h-4 w-4 text-destructive" /> Rejected</div>
      </div>
    </AppShell>
  );
}
