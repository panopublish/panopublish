import { createFileRoute, Link } from "@tanstack/react-router";
import exifr from 'exifr';
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
import { Plus, Trash2, Pencil, Upload as UploadIcon, X, Image as ImageIcon, Download, Droplets, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { TourStepsNav } from "@/components/TourStepsNav";
import { BlurEditorModal } from "@/components/BlurEditorModal";

import { SEO } from "@/components/SEO";

export const Route = createFileRoute("/tours/$tourId/")({
  head: () => ({
    meta: [
      { title: "Upload Photos — TourVista" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TourDetail,
});

const MAX_BYTES = 50 * 1024 * 1024;

type Tour = { id: string; name: string; status: Status; type: string; address: string | null; google_place_url: string | null; client?: { name: string } | null; latitude: number | null; longitude: number | null; };
type Island = { id: string; name: string; order_index: number; photo_count?: number; is_level?: boolean | null; level_number?: number | null; level_name?: string | null; show_scene_names?: boolean | null; };
type Photo = { id: string; file_url: string; file_path: string; filename: string | null; size_bytes: number | null; status: Status; latitude: number | null; longitude: number | null; uploaded_at: string; island_id: string | null; order_index?: number };

type UploadItem = {
  id: string;
  name: string;
  pct: number;
  status: 'queued' | 'uploading' | 'saving' | 'completed' | 'failed';
  error?: string;
};

async function extractPhotoMetadata(file: File) {
  try {
    const gps = await exifr.gps(file);
    const xmp = await exifr.parse(file, {
      xmp: true,
      pick: [
        'GPano:PoseHeadingDegrees',
        'GPano:PosePitchDegrees', 
        'GPano:PoseRollDegrees',
        'GPano:ProjectionType',
        'GPano:FullPanoWidthPixels',
        'GPano:CroppedAreaImageWidthPixels',
      ]
    });
    return {
      latitude: gps?.latitude ?? null,
      longitude: gps?.longitude ?? null,
      heading: xmp?.['GPano:PoseHeadingDegrees'] ?? 0,
      pitch: xmp?.['GPano:PosePitchDegrees'] ?? 0,
      roll: xmp?.['GPano:PoseRollDegrees'] ?? 0,
    };
  } catch {
    return { latitude: null, longitude: null, heading: 0, pitch: 0, roll: 0 };
  }
}

function TourDetail() {
  const { tourId } = Route.useParams();
  const { user } = useAuth();
  const [tour, setTour] = useState<Tour | null>(null);
  const [islands, setIslands] = useState<Island[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activeIsland, setActiveIsland] = useState<string | null>(null);
  const [showAddIsland, setShowAddIsland] = useState(false);
  const [newIslandName, setNewIslandName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);
  
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [dragOverPhotoId, setDragOverPhotoId] = useState<string | null>(null);

  // No local state needed, derive from activeIsland object

  const load = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: t } = await supabase.from("tours").select("id,name,status,type,address,google_place_url,client:clients(name),latitude,longitude").eq("id", tourId).maybeSingle();
      setTour(t as any);
      const { data: is } = await supabase.from("islands").select("*").eq("tour_id", tourId).order("order_index");
      const { data: ps } = await supabase.from("photos").select("*").eq("tour_id", tourId);
      const counts = new Map<string, number>();
      (ps ?? []).forEach((p) => { if (p.island_id) counts.set(p.island_id, (counts.get(p.island_id) ?? 0) + 1); });
      
      const fetchedIslands = (is ?? []).map((i) => ({ ...i, photo_count: counts.get(i.id) ?? 0 }));
      setIslands(fetchedIslands);

      if (fetchedIslands.length > 0) {
        setActiveIsland(prev => {
          if (prev && fetchedIslands.some(i => i.id === prev)) return prev;
          return fetchedIslands[0].id;
        });
      } else {
        setActiveIsland(null);
        setShowAddIsland(true);
      }
      
      // Sort locally by order_index (if exists) or uploaded_at
      const sortedPhotos = (ps as any[] ?? []).sort((a, b) => {
        if (a.order_index != null && b.order_index != null) return a.order_index - b.order_index;
        return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
      });
      setPhotos(sortedPhotos);
    } catch (err) {
      console.error("Error loading tour details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [user, tourId]);

  const visiblePhotos = activeIsland ? photos.filter((p) => p.island_id === activeIsland) : [];

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedPhotoId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverPhotoId !== id) setDragOverPhotoId(id);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverPhotoId(null);
    if (!draggedPhotoId || draggedPhotoId === targetId) return;

    const newPhotos = [...photos];
    const draggedIndex = newPhotos.findIndex(p => p.id === draggedPhotoId);
    const targetIndex = newPhotos.findIndex(p => p.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const [draggedItem] = newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(targetIndex, 0, draggedItem);

    const updatedPhotos = newPhotos.map((p, idx) => ({ ...p, order_index: idx }));
    setPhotos(updatedPhotos);
    setDraggedPhotoId(null);

    const updates = updatedPhotos.map(p => ({ id: p.id, order_index: p.order_index }));
    for (const update of updates) {
      const { error } = await supabase.from("photos").update({ order_index: update.order_index }).eq("id", update.id);
      if (error) {
        console.error("Error updating order:", error);
        toast.error("Failed to save sequence: " + error.message);
      }
    }
  };

  const updateIslandSettings = async (updates: Partial<Island>) => {
    if (!activeIsland) return;
    setIslands(prev => prev.map(i => i.id === activeIsland ? { ...i, ...updates } : i));
    const { error } = await supabase.from("islands").update(updates as any).eq("id", activeIsland);
    if (error) {
      toast.error(`Failed to save settings: ${error.message}`);
      load(); // revert
    }
  };

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
    toast.success("Island deleted"); if (activeIsland === id) setActiveIsland(null); load();
  };

  const onPickFiles = async (files: FileList | null, islandId?: string) => {
    if (!files) return;
    const targetIsland = islandId || activeIsland;
    if (!targetIsland) return toast.error("Please select or create an island first!");
    
    const fileList = Array.from(files);
    
    // Add all files to uploads state queue first
    const newUploads = fileList.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: f.name,
      pct: 0,
      status: 'queued' as const,
    }));
    
    setUploads((prev) => [...prev, ...newUploads]);

    // Process files sequentially
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const uploadItem = newUploads[i];
      
      try {
        if (file.size > MAX_BYTES) {
          throw new Error(`File is too large (max 50MB)`);
        }
        
        await uploadPhoto(file, targetIsland, uploadItem.id);
      } catch (err: any) {
        console.error("Upload failed for file:", file.name, err);
        setUploads((prev) =>
          prev.map((item) =>
            item.id === uploadItem.id
              ? { ...item, status: 'failed', error: err.message || "Upload failed" }
              : item
          )
        );
        // Automatically remove failed item from progress list after 5 seconds
        setTimeout(() => {
          setUploads((prev) => prev.filter((item) => item.id !== uploadItem.id));
        }, 5000);
      }
    }
  };

  const uploadPhoto = async (file: File, islandId: string, uploadId: string) => {
    if (!user) return;

    setUploads((prev) =>
      prev.map((item) =>
        item.id === uploadId ? { ...item, status: 'uploading', pct: 0 } : item
      )
    );

    const path = `${user.id}/${tourId}/${islandId}/${Date.now()}-${file.name}`;
    
    const { error: upErr } = await supabase.storage.from("tour-photos").upload(path, file, {
      contentType: file.type || "image/jpeg",
      onUploadProgress: (progress) => {
        const pct = Math.round((progress.loaded / progress.total) * 100);
        // Map 0-100% of upload to 0-90% of overall progress
        const mappedPct = Math.round(pct * 0.9);
        setUploads((prev) =>
          prev.map((item) =>
            item.id === uploadId ? { ...item, pct: mappedPct } : item
          )
        );
      }
    });

    if (upErr) throw upErr;

    // Database update phase
    setUploads((prev) =>
      prev.map((item) =>
        item.id === uploadId ? { ...item, status: 'saving', pct: 95 } : item
      )
    );

    const { data: pub } = supabase.storage.from("tour-photos").getPublicUrl(path);
    const meta = await extractPhotoMetadata(file);

    const { error: dbErr } = await supabase.from("photos").insert({
      user_id: user.id, tour_id: tourId, island_id: islandId,
      file_path: path, file_url: pub.publicUrl, filename: file.name, size_bytes: file.size, status: "uploaded",
      latitude: (meta.latitude && meta.latitude !== 0) ? meta.latitude : (tour?.latitude || null),
      longitude: (meta.longitude && meta.longitude !== 0) ? meta.longitude : (tour?.longitude || null),
      heading: meta.heading,
      pitch: meta.pitch,
      roll: meta.roll
    });

    if (dbErr) throw dbErr;

    // Success! Remove from uploads list
    setUploads((prev) => prev.filter((item) => item.id !== uploadId));
    toast.success(`${file.name} uploaded`);
    load();
  };

  const deletePhoto = async (p: Photo) => {
    if (!confirm("Delete this photo?")) return;
    await supabase.storage.from("tour-photos").remove([p.file_path]);
    await supabase.from("photos").delete().eq("id", p.id);
    toast.success("Photo deleted"); load();
  };

  const handleDownloadPhoto = async (p: Photo) => {
    try {
      const res = await fetch(p.file_url);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = p.filename || "download.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Scene downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to download image: " + err.message);
    }
  };

  const handleSaveBlurredPhoto = async (blob: Blob) => {
    if (!user || !editingPhoto) return;

    const newPath = `${user.id}/${tourId}/${editingPhoto.island_id}/${Date.now()}-blurred-${editingPhoto.filename || "scene.jpg"}`;

    // 1. Upload to Supabase Storage
    const { error: upErr } = await supabase.storage
      .from("tour-photos")
      .upload(newPath, blob, { contentType: "image/jpeg" });
      
    if (upErr) throw upErr;

    // 2. Get Public URL
    const { data: pub } = supabase.storage.from("tour-photos").getPublicUrl(newPath);

    // 3. Update database row
    const { error: dbErr } = await supabase
      .from("photos")
      .update({
        file_path: newPath,
        file_url: pub.publicUrl
      })
      .eq("id", editingPhoto.id);

    if (dbErr) throw dbErr;

    // 4. Delete the old photo from storage (soft fail)
    try {
      await supabase.storage.from("tour-photos").remove([editingPhoto.file_path]);
    } catch (e) {
      console.warn("Could not delete old storage file", e);
    }

    setEditingPhoto(null);
    load(); // Refresh the grid!
  };

  const sortPhotosByName = async (direction: 'asc' | 'desc') => {
    if (!activeIsland || visiblePhotos.length === 0) return;
    
    const tid = toast.loading(`Sorting scenes by filename...`);
    
    // 1. Sort the visible photos array alphabetically by filename (numeric-aware)
    const sorted = [...visiblePhotos].sort((a, b) => {
      const nameA = a.filename || "";
      const nameB = b.filename || "";
      return direction === 'asc' 
        ? nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' })
        : nameB.localeCompare(nameA, undefined, { numeric: true, sensitivity: 'base' });
    });

    // 2. Map new order_index based on their sorted position
    const updatedPhotos = photos.map(p => {
      if (p.island_id === activeIsland) {
        const sortedIdx = sorted.findIndex(x => x.id === p.id);
        return { ...p, order_index: sortedIdx };
      }
      return p;
    });

    // Sort the entire photos list so display is updated immediately
    const sortedPhotos = [...updatedPhotos].sort((a, b) => {
      if (a.order_index != null && b.order_index != null) return a.order_index - b.order_index;
      return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
    });
    
    setPhotos(sortedPhotos);

    try {
      // 3. Save new order_index values sequentially to Supabase
      await Promise.all(
        sorted.map((p, idx) => 
          supabase.from("photos").update({ order_index: idx }).eq("id", p.id)
        )
      );
      
      toast.success(`Scenes sorted successfully!`, { id: tid });
    } catch (err: any) {
      console.error("Error sorting photos:", err);
      toast.error(`Failed to save sort order: ${err.message}`, { id: tid });
      load(); // Revert
    }
  };

  return (
    <AppShell title={tour?.name ?? "Tour"} breadcrumbs={[{ label: "Tours", to: "/tours" }, { label: tour?.name ?? "Loading…" }]}>
      <SEO
        title="Upload Photos"
        description="Upload your 360 photos for your virtual tour."
        noIndex={true}
      />
      <div className="bg-[#f2f4f8] min-h-[calc(100vh-64px)] pb-12">
        <TourStepsNav tourId={tourId} activeTab="upload" />

        <div className="max-w-6xl mx-auto grid lg:grid-cols-[280px_1fr] gap-0">
          
          {/* Left Sidebar */}
          <div>
            <button 
              onClick={() => setShowAddIsland(true)}
              className="w-full bg-[#8bc34a] hover:bg-[#7cb342] text-white py-4 px-6 rounded-l-2xl flex items-center gap-2 font-bold transition-colors"
            >
              <Plus className="h-5 w-5" /> Add island
            </button>

            {islands.length > 0 && (
              <div className="mt-4 pr-4">
                {islands.map((i) => (
                  <div key={i.id} className="mb-2">
                    <button
                      onClick={() => setActiveIsland(i.id)}
                      className={`w-full text-left px-4 py-3 rounded-l-xl transition-colors font-medium border-l-4 ${
                        activeIsland === i.id 
                          ? "bg-white border-[#8bc34a] text-gray-800 shadow-sm" 
                          : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="truncate pr-2">{i.name}</span>
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{i.photo_count}</span>
                      </div>
                    </button>
                    {activeIsland === i.id && (
                      <div className="flex gap-3 px-4 py-2 bg-white/50 text-xs text-gray-500">
                        <button onClick={() => { setRenameId(i.id); setRenameVal(i.name); }} className="hover:text-blue-500 flex items-center gap-1"><Pencil className="h-3 w-3" /> Edit</button>
                        <button onClick={() => deleteIsland(i.id)} className="hover:text-red-500 flex items-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Content Area */}
          <div className="bg-white rounded-xl shadow-sm min-h-[500px] border border-gray-100 flex flex-col relative overflow-hidden rounded-tl-none">
            
            {!activeIsland ? (
              <div className="flex-1 p-12 flex flex-col relative">
                <div className="absolute top-8 left-8">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#0277bd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[-45deg] scale-x-[-1] opacity-80">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="mt-16 max-w-sm">
                  <h2 className="text-2xl font-semibold text-gray-700 mb-4">Add an island</h2>
                  <p className="text-gray-500 leading-relaxed">
                    Organize your tour by creating your first island. Islands are like folders.
                    They are a great way to group scenes by area. Islands can also be converted to a Google Map's level.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Island Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-semibold text-gray-700">{islands.find(i => i.id === activeIsland)?.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 font-medium flex-wrap">
                    {islands.find(i => i.id === activeIsland)?.is_level && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5" title="The level number is used for floor ordering by Google Maps.&#10;&#10;-1 indicates the first level under ground, 0 indicates the ground level, 1 indicates the first level above ground, 2 indicates the second level above ground, and so on.&#10;&#10;By default, all scenes are set to ground level unless the island is converted to a level and the level number is set for the island.">
                          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                          <span>Level Number</span>
                          <select 
                            value={islands.find(i => i.id === activeIsland)?.level_number ?? 0}
                            onChange={(e) => updateIslandSettings({ level_number: parseInt(e.target.value) })}
                            className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white text-gray-700 focus:outline-none focus:border-[#0277bd]"
                          >
                            {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-1.5" title="A 1 to 3 letter name for your level that appears on Google Maps">
                          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                          <span>Level Name</span>
                          <input 
                            type="text" 
                            value={(islands.find(i => i.id === activeIsland)?.level_name ?? "L0").toUpperCase().slice(0, 3)}
                            onChange={(e) => updateIslandSettings({ level_name: e.target.value.toUpperCase().slice(0, 3) })}
                            className="border border-gray-300 rounded w-12 px-1 py-0.5 text-xs bg-white text-gray-700 focus:outline-none focus:border-[#0277bd]" 
                            placeholder="L0" 
                          />
                        </div>
                      </div>
                    )}
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={islands.find(i => i.id === activeIsland)?.is_level ?? false} 
                        onChange={(e) => updateIslandSettings({ is_level: e.target.checked })} 
                        className="rounded border-gray-300 text-[#0277bd] focus:ring-[#0277bd]" 
                      />
                      convert island to level
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500 font-medium">sort scenes</span>
                      <select 
                        onChange={async (e) => {
                          const val = e.target.value;
                          if (val === 'asc' || val === 'desc') {
                            await sortPhotosByName(val);
                            e.target.value = ""; // Reset dropdown to placeholder
                          }
                        }}
                        defaultValue=""
                        className="border border-gray-300 rounded px-2 py-0.5 text-xs bg-white text-gray-700 focus:outline-none focus:border-[#0277bd] font-semibold cursor-pointer shadow-sm transition-all duration-300 hover:border-gray-400"
                      >
                        <option value="" disabled>Choose...</option>
                        <option value="asc">Name (A-Z) ↑</option>
                        <option value="desc">Name (Z-A) ↓</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={islands.find(i => i.id === activeIsland)?.show_scene_names ?? true} 
                        onChange={(e) => updateIslandSettings({ show_scene_names: e.target.checked })} 
                        className="rounded border-gray-300 text-[#0277bd] focus:ring-[#0277bd]" 
                      />
                      show scene names
                    </label>
                  </div>
                </div>

                {/* Uploads Process */}
                {uploads.length > 0 && (
                  <div className="p-4 bg-blue-50 border-b border-blue-100 space-y-2">
                    {uploads.map((u) => (
                      <div key={u.id} className="text-xs text-left">
                        <div className="flex justify-between items-center mb-1">
                          <span className="truncate text-blue-900 font-medium max-w-[70%]">{u.name}</span>
                          <span className="text-blue-700 font-bold">
                            {u.status === 'queued' && 'Queued'}
                            {u.status === 'uploading' && `Uploading (${u.pct}%)`}
                            {u.status === 'saving' && 'Saving...'}
                            {u.status === 'failed' && 'Failed'}
                          </span>
                        </div>
                        {u.status !== 'failed' && (
                          <div className="h-1.5 rounded bg-blue-200 overflow-hidden">
                            <div className="h-full bg-[#0277bd] transition-all duration-300" style={{ width: `${u.pct}%` }} />
                          </div>
                        )}
                        {u.status === 'failed' && (
                          <p className="text-[10px] text-red-500 font-semibold truncate mt-0.5">{u.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Photos Grid */}
                <div className="flex-1 p-6">
                  {visiblePhotos.length === 0 ? (
                    <EmptyState icon={ImageIcon} title="Drop your 360° photos here"
                      description="Accepts .jpg / .jpeg, max 75MB each."
                      action={<Button onClick={() => fileInput.current?.click()} className="bg-[#0277bd] hover:bg-[#0266a1]"><UploadIcon className="h-4 w-4 mr-2" /> Select Photos</Button>} />
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {visiblePhotos.map((p, idx) => (
                        <div key={p.id} className="group" draggable onDragStart={(e) => handleDragStart(e, p.id)} onDragOver={(e) => handleDragOver(e, p.id)} onDrop={(e) => handleDrop(e, p.id)}>
                          <div
                            onClick={() => setViewerIndex(idx)}
                            className={`relative aspect-square rounded-xl border bg-gray-100 overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-lg ${dragOverPhotoId === p.id ? 'ring-2 ring-[#0277bd] ring-offset-2' : ''}`}
                          >
                            <img
                              src={p.file_url}
                              loading="lazy"
                              alt={p.filename ?? "Photo"}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                            <div className="absolute top-2 left-2 rounded bg-black/70 text-white px-2 py-0.5 text-[11px] font-bold">
                              {idx}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); deletePhoto(p); }}
                              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            
                            {/* Download & Blur Overlay Buttons */}
                            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPhoto(p);
                                }}
                                className="h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
                                title="Download scene"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPhoto(p);
                                }}
                                className="h-7 w-7 rounded-full bg-[#0277bd]/85 hover:bg-[#0277bd] text-white flex items-center justify-center transition-all shadow-md active:scale-95"
                                title="Blur"
                              >
                                <Droplets className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {islands.find(i => i.id === activeIsland)?.show_scene_names !== false && (
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                                <span className="text-[10px] text-white/90 truncate block">{p.filename}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => fileInput.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-[#8bc34a] bg-[#8bc34a]/5 hover:bg-[#8bc34a]/10 flex flex-col items-center justify-center transition-colors text-[#7cb342]"
                      >
                        <Plus className="h-8 w-8 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-wider">Add More</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <input ref={fileInput} type="file" hidden multiple accept=".jpg,.jpeg" onChange={(e) => onPickFiles(e.target.files)} />
          </div>
        </div>
      </div>

      {viewerIndex !== null && (
        <SceneViewerModal
          photos={visiblePhotos}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {editingPhoto && (
        <BlurEditorModal
          photo={editingPhoto}
          onClose={() => setEditingPhoto(null)}
          onSave={handleSaveBlurredPhoto}
        />
      )}

      <Dialog open={!isLoading && (showAddIsland || islands.length === 0)} onOpenChange={(open) => { if (islands.length === 0) return; setShowAddIsland(open); }}>
        <DialogContent onPointerDownOutside={(e) => { if (islands.length === 0) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (islands.length === 0) e.preventDefault(); }}>
          <DialogHeader><DialogTitle>Add island</DialogTitle></DialogHeader>
          <div>
            <Label>Island name</Label>
            <Input value={newIslandName} onChange={(e) => setNewIslandName(e.target.value)} placeholder="e.g. Lobby, 1st Floor" className="mt-1" />
            {islands.length === 0 && (
              <p className="text-xs text-red-500 mt-2 font-medium">Creating at least one island is mandatory to upload photos.</p>
            )}
          </div>
          <DialogFooter>
            {islands.length > 0 && (
              <Button variant="outline" onClick={() => setShowAddIsland(false)}>Cancel</Button>
            )}
            <Button onClick={addIsland} className="bg-[#8bc34a] hover:bg-[#7cb342] text-white">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameId} onOpenChange={(o) => !o && setRenameId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename island</DialogTitle></DialogHeader>
          <Input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} />
          <DialogFooter><Button variant="outline" onClick={() => setRenameId(null)}>Cancel</Button><Button onClick={renameIsland}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}
