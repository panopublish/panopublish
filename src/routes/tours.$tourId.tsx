import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, Status } from "@/components/StatusBadge";
import { SceneViewerModal } from "@/components/SceneViewerModal";
import { Plus, Folder, Trash2, Pencil, Upload as UploadIcon, MapPin, X, Image as ImageIcon, Download, Droplets, MapPinned, Link2, Send } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { formatDateIN } from "@/lib/format";

export const Route = createFileRoute("/tours/$tourId")({
  head: () => ({ meta: [{ title: "Tour — TourVista" }] }),
  component: TourDetail,
});

const MAX_BYTES = 75 * 1024 * 1024;

type Tour = { id: string; name: string; status: Status; type: string; address: string | null; google_place_url: string | null; client?: { name: string } | null };
type Island = { id: string; name: string; order_index: number; photo_count?: number };
type Photo = { id: string; file_url: string; file_path: string; filename: string | null; size_bytes: number | null; status: Status; latitude: number | null; longitude: number | null; uploaded_at: string; island_id: string | null };

function TourDetail() {
  const { tourId } = Route.useParams();
  const { user } = useAuth();
  const [tour, setTour] = useState<Tour | null>(null);
  const [islands, setIslands] = useState<Island[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activeIsland, setActiveIsland] = useState<string | "all">("all");
  const [showAddIsland, setShowAddIsland] = useState(false);
  const [newIslandName, setNewIslandName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [showPublish, setShowPublish] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [uploads, setUploads] = useState<{ name: string; pct: number }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const { data: t } = await supabase.from("tours").select("id,name,status,type,address,google_place_url,client:clients(name)").eq("id", tourId).maybeSingle();
    setTour(t as any);
    const { data: is } = await supabase.from("islands").select("*").eq("tour_id", tourId).order("order_index");
    const { data: ps } = await supabase.from("photos").select("*").eq("tour_id", tourId).order("uploaded_at", { ascending: false });
    const counts = new Map<string, number>();
    (ps ?? []).forEach((p) => { if (p.island_id) counts.set(p.island_id, (counts.get(p.island_id) ?? 0) + 1); });
    setIslands((is ?? []).map((i) => ({ ...i, photo_count: counts.get(i.id) ?? 0 })));
    setPhotos((ps as any) ?? []);
  };

  useEffect(() => { load(); }, [user, tourId]);

  const visiblePhotos = activeIsland === "all" ? photos : photos.filter((p) => p.island_id === activeIsland);

  const addIsland = async () => {
    if (!user || !newIslandName.trim()) return;
    const { error } = await supabase.from("islands").insert({ user_id: user.id, tour_id: tourId, name: newIslandName, order_index: islands.length });
    if (error) return toast.error(error.message);
    toast.success("Island added"); setNewIslandName(""); setShowAddIsland(false); load();
  };

  const renameIsland = async () => {
    if (!renameId || !renameVal.trim()) return;
    const { error } = await supabase.from("islands").update({ name: renameVal }).eq("id", renameId);
    if (error) return toast.error(error.message);
    toast.success("Renamed"); setRenameId(null); load();
  };

  const deleteIsland = async (id: string) => {
    if (!confirm("Delete this island? Photos will be unassigned.")) return;
    const { error } = await supabase.from("islands").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Island deleted"); if (activeIsland === id) setActiveIsland("all"); load();
  };

  const onPickFiles = (files: FileList | null, islandId?: string) => {
    if (!files || !user) return;
    const arr = Array.from(files);
    arr.forEach((f) => uploadOne(f, islandId ?? (activeIsland !== "all" ? activeIsland : null)));
  };

  const uploadOne = async (file: File, islandId: string | null) => {
    if (!user) return;
    if (!/\.(jpe?g)$/i.test(file.name)) return toast.error(`${file.name}: only JPG/JPEG accepted`);
    if (file.size > MAX_BYTES) return toast.error(`${file.name}: exceeds 75 MB`);

    setUploads((u) => [...u, { name: file.name, pct: 5 }]);
    const path = `${user.id}/${tourId}/${islandId ?? "unassigned"}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("tour-photos").upload(path, file, { contentType: file.type || "image/jpeg" });
    setUploads((u) => u.map((x) => x.name === file.name ? { ...x, pct: 75 } : x));
    if (upErr) { toast.error(upErr.message); setUploads((u) => u.filter((x) => x.name !== file.name)); return; }

    const { data: pub } = supabase.storage.from("tour-photos").getPublicUrl(path);
    const { error } = await supabase.from("photos").insert({
      user_id: user.id, tour_id: tourId, island_id: islandId,
      file_path: path, file_url: pub.publicUrl, filename: file.name, size_bytes: file.size, status: "uploaded",
    });
    setUploads((u) => u.filter((x) => x.name !== file.name));
    if (error) return toast.error(error.message);
    toast.success(`${file.name} uploaded`); load();
  };

  const deletePhoto = async (p: Photo) => {
    if (!confirm("Delete this photo?")) return;
    await supabase.storage.from("tour-photos").remove([p.file_path]);
    await supabase.from("photos").delete().eq("id", p.id);
    toast.success("Photo deleted"); load();
  };

  const movePhoto = async (p: Photo, islandId: string | null) => {
    const { error } = await supabase.from("photos").update({ island_id: islandId }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Photo moved"); load();
  };

  const toggleSelect = (id: string) => {
    const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} selected photo(s)?`)) return;
    const list = photos.filter((p) => selected.has(p.id));
    await supabase.storage.from("tour-photos").remove(list.map((l) => l.file_path));
    await supabase.from("photos").delete().in("id", list.map((l) => l.id));
    toast.success("Photos deleted"); setSelected(new Set()); load();
  };

  return (
    <AppShell title={tour?.name ?? "Tour"} breadcrumbs={[{ label: "Tours", to: "/tours" }, { label: tour?.client?.name ?? "—" }, { label: tour?.name ?? "Loading…" }]}>
      {tour && (
        <div className="mb-6 rounded-xl border bg-card p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{tour.name}</h2>
              <StatusBadge status={tour.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {tour.address ?? "No address"} • {tour.client?.name ?? "No client"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fileInput.current?.click()}><UploadIcon className="h-4 w-4 mr-1" /> Upload Photos</Button>
            <Button onClick={() => setShowPublish(true)} className="bg-success text-success-foreground hover:bg-success/90">Publish to Google Street View</Button>
            <input ref={fileInput} type="file" hidden multiple accept=".jpg,.jpeg" onChange={(e) => onPickFiles(e.target.files)} />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Islands sidebar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Islands</h3>
            <Button size="sm" onClick={() => setShowAddIsland(true)} className="bg-success text-success-foreground hover:bg-success/90"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
          </div>
          <div className="space-y-1.5">
            <button onClick={() => setActiveIsland("all")} className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${activeIsland === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}>
              <span className="flex items-center gap-2"><Folder className="h-4 w-4" /> All photos</span>
              <span className="text-xs opacity-70">{photos.length}</span>
            </button>
            {islands.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Add your first island to organize your tour photos
              </div>
            ) : islands.map((i) => (
              <div key={i.id} className={`group rounded-lg border ${activeIsland === i.id ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}>
                <button onClick={() => setActiveIsland(i.id)} className="w-full flex items-center justify-between px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 truncate"><Folder className="h-4 w-4 shrink-0" /> <span className="truncate">{i.name}</span></span>
                  <span className="text-xs opacity-70">{i.photo_count}</span>
                </button>
                {activeIsland === i.id && (
                  <div className="flex gap-1 px-2 pb-2">
                    <button onClick={() => { setRenameId(i.id); setRenameVal(i.name); }} className="text-xs underline opacity-90"><Pencil className="h-3 w-3 inline" /> Rename</button>
                    <button onClick={() => deleteIsland(i.id)} className="text-xs underline opacity-90 ml-2"><Trash2 className="h-3 w-3 inline" /> Delete</button>
                    <button onClick={() => fileInput.current?.click()} className="text-xs underline opacity-90 ml-auto"><UploadIcon className="h-3 w-3 inline" /> Add photos</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Photos panel */}
        <div>
          {uploads.length > 0 && (
            <div className="mb-4 rounded-lg border bg-card p-3 space-y-2">
              {uploads.map((u) => (
                <div key={u.name} className="text-xs">
                  <div className="flex justify-between mb-1"><span className="truncate">{u.name}</span><span>{u.pct}%</span></div>
                  <div className="h-1.5 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${u.pct}%` }} /></div>
                </div>
              ))}
            </div>
          )}

          {selected.size > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border bg-card p-2 text-sm">
              <span className="px-2">{selected.size} selected</span>
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button>
              <Button size="sm" variant="outline" onClick={bulkDelete}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            </div>
          )}

          {visiblePhotos.length === 0 ? (
            <EmptyState icon={ImageIcon} title="Drop your 360° photos here"
              description="Click Upload Photos above. Accepts .jpg / .jpeg, max 75MB each."
              action={<Button onClick={() => fileInput.current?.click()}><UploadIcon className="h-4 w-4 mr-1" /> Upload Photos</Button>} />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {visiblePhotos.map((p, idx) => (
                  <div key={p.id} className="group">
                    <div
                      onClick={() => setViewerIndex(idx)}
                      className="relative aspect-square rounded-xl border bg-muted overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-lg"
                    >
                      <img
                        src={p.file_url}
                        loading="lazy"
                        alt={p.filename ?? "Photo"}
                        className="w-full h-full object-cover"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-background/0 group-hover:bg-background/10 transition-colors pointer-events-none" />

                      {/* Scene number badge */}
                      <div className="absolute top-2 left-2 rounded bg-foreground text-background px-2 py-0.5 text-[11px] font-semibold">
                        {idx}
                      </div>

                      {/* Delete X */}
                      <button
                        onClick={(e) => { e.stopPropagation(); deletePhoto(p); }}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center"
                        aria-label="Delete photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                      {/* Download */}
                      <a
                        href={p.file_url}
                        download={p.filename ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-2 left-2 h-8 w-8 rounded-full bg-foreground/80 text-background hover:bg-foreground flex items-center justify-center"
                        aria-label="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>

                      {/* Nadir/watermark toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toast.info("Nadir watermark toggle — configurable on Publish step"); }}
                        className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
                        aria-label="Nadir watermark"
                      >
                        <Droplets className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-1.5 px-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground truncate">{p.filename}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}

                {/* Add more card */}
                <button
                  onClick={() => fileInput.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-success bg-success/10 hover:bg-success/20 flex items-center justify-center transition-colors"
                  aria-label="Add more photos"
                >
                  <Plus className="h-12 w-12 text-success" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {viewerIndex !== null && (
        <SceneViewerModal
          photos={visiblePhotos}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {/* Add Island */}
      <Dialog open={showAddIsland} onOpenChange={setShowAddIsland}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add island</DialogTitle></DialogHeader>
          <div><Label>Island name</Label><Input value={newIslandName} onChange={(e) => setNewIslandName(e.target.value)} placeholder="e.g. Lobby, 1st Floor" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAddIsland(false)}>Cancel</Button><Button onClick={addIsland}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Island */}
      <Dialog open={!!renameId} onOpenChange={(o) => !o && setRenameId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename island</DialogTitle></DialogHeader>
          <Input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} />
          <DialogFooter><Button variant="outline" onClick={() => setRenameId(null)}>Cancel</Button><Button onClick={renameIsland}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo preview */}
      <Dialog open={!!previewPhoto} onOpenChange={(o) => !o && setPreviewPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{previewPhoto?.filename}</DialogTitle></DialogHeader>
          {previewPhoto && <img src={previewPhoto.file_url} alt="" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Publish modal */}
      <Dialog open={showPublish} onOpenChange={setShowPublish}>
        <DialogContent>
          <DialogHeader><DialogTitle>Publish to Google Street View</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">To publish, you need to connect your Google Account. Click below to authorize.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublish(false)}>Cancel</Button>
            <Button onClick={() => { toast.info("Google OAuth will be connected in the next update."); setShowPublish(false); }}>Connect Google Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
