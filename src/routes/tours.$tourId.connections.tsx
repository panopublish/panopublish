import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TourStepNav } from "@/components/TourStepNav";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Minus, Save, Undo2, Share2, ArrowRight, Eye, Navigation,
  Maximize2, ZoomIn, ZoomOut, HelpCircle, Lock, Unlock, RefreshCw,
  Home, Download, Tag, Crosshair, X, Check, Clock, CheckCheck,
  AlertTriangle, Info,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tours/$tourId/connections")({
  head: () => ({ meta: [{ title: "Build Connections — TourVista" }] }),
  component: ConnectionsPage,
});

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

type Photo = {
  id: string;
  file_url: string;
  filename: string | null;
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
};
type Conn = {
  id: string;
  from_photo_id: string;
  to_photo_id: string;
  constellation_id: string | null;
  group_name: string | null;
  heading: number;
  pitch: number;
  spacing: string | null;
  is_locked: boolean;
};
type Constellation = { id: string; name: string };

declare global {
  interface Window {
    pannellum?: any;
    google?: any;
    initTourVistaMap?: () => void;
  }
}

const SPACINGS = ["1m", "2m", "3m", "5m", "10m"];

function calcHeading(from: Photo, to: Photo): number {
  if (from.latitude == null || from.longitude == null || to.latitude == null || to.longitude == null) return 0;
  const dLon = to.longitude - from.longitude;
  const dLat = to.latitude - from.latitude;
  let h = Math.atan2(dLon, dLat) * (180 / Math.PI);
  if (h < 0) h += 360;
  return h;
}

function useGoogleMaps() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!MAPS_KEY) return;
    if (window.google?.maps) { setReady(true); return; }
    const existing = document.querySelector<HTMLScriptElement>("script[data-tourvista-gmaps]");
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.dataset.tourvistaGmaps = "1";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

function ConnectionsPage() {
  const { tourId } = Route.useParams();
  const { user } = useAuth();
  const mapsReady = useGoogleMaps();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [conns, setConns] = useState<Conn[]>([]);
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [activeConstName, setActiveConstName] = useState("");
  const [tour, setTour] = useState<{ name: string; latitude: number | null; longitude: number | null } | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [autoAlign, setAutoAlign] = useState(true);
  const [alignFine, setAlignFine] = useState([5]);
  const [spacing, setSpacing] = useState("3m");
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [northOffset, setNorthOffset] = useState(0);
  const [showLabels, setShowLabels] = useState(true);

  const panoRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: t }, { data: ps }, { data: cs }, { data: cons }] = await Promise.all([
      supabase.from("tours").select("name,latitude,longitude").eq("id", tourId).maybeSingle(),
      supabase.from("photos").select("id,file_url,filename,latitude,longitude,heading").eq("tour_id", tourId).order("uploaded_at"),
      supabase.from("connections").select("*").eq("tour_id", tourId),
      supabase.from("constellations").select("id,name").eq("tour_id", tourId).order("created_at"),
    ]);
    setTour(t as any);
    setPhotos((ps as any) ?? []);
    setConns((cs as any) ?? []);
    setConstellations((cons as any) ?? []);
    if (cons && cons.length > 0 && !activeConstName) setActiveConstName(cons[0].name);
  }, [user, tourId, activeConstName]);

  useEffect(() => { load(); }, [load]);

  const active = photos[activeIdx];
  const photoCenter = useMemo(() => {
    if (active?.latitude != null && active?.longitude != null) return { lat: active.latitude, lng: active.longitude };
    if (tour?.latitude != null && tour?.longitude != null) return { lat: tour.latitude, lng: tour.longitude };
    return { lat: 20.5937, lng: 78.9629 };
  }, [active, tour]);

  // Pannellum viewer
  useEffect(() => {
    if (!active || !panoRef.current || !window.pannellum) return;
    if (viewerRef.current) {
      try { viewerRef.current.destroy(); } catch {}
      viewerRef.current = null;
    }
    panoRef.current.innerHTML = "";
    try {
      const v = window.pannellum.viewer(panoRef.current, {
        type: "equirectangular",
        panorama: active.file_url,
        autoLoad: true,
        showControls: false,
        mouseZoom: true,
        hfov: 110,
      });
      viewerRef.current = v;
      v.on("animatefinished", () => setCurrentHeading(((v.getYaw() + 360) % 360)));
      const id = setInterval(() => {
        try { setCurrentHeading(((v.getYaw() + 360) % 360)); } catch {}
      }, 200);
      return () => clearInterval(id);
    } catch (e) { console.error(e); }
  }, [active?.id, active?.file_url]);

  useEffect(() => () => { try { viewerRef.current?.destroy(); } catch {} }, []);

  // Google Map
  useEffect(() => {
    if (!mapsReady || !mapDivRef.current || !window.google?.maps) return;
    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapDivRef.current, {
        center: photoCenter,
        zoom: 19,
        mapTypeId: "roadmap",
        disableDefaultUI: true,
        zoomControl: true,
      });
    }
    // clear
    markersRef.current.forEach((m) => m.setMap(null));
    polylinesRef.current.forEach((p) => p.setMap(null));
    markersRef.current = [];
    polylinesRef.current = [];

    const photoById = new Map(photos.map((p) => [p.id, p]));
    photos.forEach((p, idx) => {
      const lat = p.latitude ?? tour?.latitude;
      const lng = p.longitude ?? tour?.longitude;
      if (lat == null || lng == null) return;
      const isActive = idx === activeIdx;
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current,
        title: `Scene ${idx}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isActive ? 10 : 7,
          fillColor: "#dc2626",
          fillOpacity: 1,
          strokeColor: isActive ? "#f97316" : "#ffffff",
          strokeWeight: isActive ? 3 : 2,
        },
        label: showLabels ? { text: String(idx), color: "#fff", fontSize: "10px", fontWeight: "700" } : undefined,
      });
      marker.addListener("click", () => setActiveIdx(idx));
      markersRef.current.push(marker);
    });

    conns.forEach((c) => {
      const a = photoById.get(c.from_photo_id);
      const b = photoById.get(c.to_photo_id);
      if (!a || !b) return;
      const aLat = a.latitude ?? tour?.latitude, aLng = a.longitude ?? tour?.longitude;
      const bLat = b.latitude ?? tour?.latitude, bLng = b.longitude ?? tour?.longitude;
      if (aLat == null || bLat == null) return;
      const line = new window.google.maps.Polyline({
        path: [{ lat: aLat, lng: aLng }, { lat: bLat, lng: bLng }],
        strokeColor: c.is_locked ? "#1e3a8a" : "#2563EB",
        strokeOpacity: c.is_locked ? 0.6 : 1,
        strokeWeight: c.is_locked ? 2 : 4,
        map: mapRef.current,
      });
      line.addListener("click", () => toggleLock(c));
      line.addListener("rightclick", () => deleteConn(c.id));
      polylinesRef.current.push(line);
    });
  }, [mapsReady, photos, conns, activeIdx, tour, showLabels]);

  const recenter = () => {
    if (mapRef.current && tour?.latitude != null && tour?.longitude != null) {
      mapRef.current.panTo({ lat: tour.latitude, lng: tour.longitude });
      mapRef.current.setZoom(19);
    }
  };

  const ensureConstellation = async (): Promise<string | null> => {
    const name = activeConstName.trim();
    if (!name) { toast.error("Enter a constellation name first"); return null; }
    const existing = constellations.find((c) => c.name === name);
    if (existing) return existing.id;
    const { data, error } = await supabase.from("constellations").insert({
      user_id: user!.id, tour_id: tourId, name,
    }).select().single();
    if (error) { toast.error(error.message); return null; }
    setConstellations((s) => [...s, data as any]);
    return (data as any).id;
  };

  const addConnection = async (toPhoto: Photo) => {
    if (!user || !active) return;
    if (toPhoto.id === active.id) return toast.info("Cannot connect a scene to itself");
    const cid = await ensureConstellation();
    if (!cid) return;
    const heading = autoAlign ? calcHeading(active, toPhoto) : currentHeading;
    const { error } = await supabase.from("connections").insert({
      user_id: user.id,
      tour_id: tourId,
      constellation_id: cid,
      from_photo_id: active.id,
      to_photo_id: toPhoto.id,
      group_name: activeConstName.trim(),
      heading: heading + alignFine[0] - 5,
      pitch: 0,
      spacing,
      is_locked: false,
    });
    if (error) return toast.error(error.message);
    toast.success("Connection saved");
    setPendingTo(null);
    load();
  };

  const deleteConn = async (id: string) => {
    if (!confirm("Delete this connection?")) return;
    await supabase.from("connections").delete().eq("id", id);
    toast.success("Connection removed");
    load();
  };

  const toggleLock = async (c: Conn) => {
    await supabase.from("connections").update({ is_locked: !c.is_locked }).eq("id", c.id);
    load();
  };

  const undoLast = async () => {
    const last = [...conns].sort((a, b) => (a.id < b.id ? 1 : -1))[0];
    if (!last) return;
    await supabase.from("connections").delete().eq("id", last.id);
    toast.success("Undone");
    load();
  };

  const setNorth = () => {
    setNorthOffset(currentHeading);
    toast.success(`North set to ${currentHeading.toFixed(1)}°`);
  };

  const fullscreenPano = () => {
    panoRef.current?.requestFullscreen?.();
  };

  const zoomPano = (delta: number) => {
    if (!viewerRef.current) return;
    try {
      const hfov = viewerRef.current.getHfov();
      viewerRef.current.setHfov(Math.max(50, Math.min(120, hfov + delta)));
    } catch {}
  };

  const activeConns = conns.filter((c) => c.from_photo_id === active?.id || c.to_photo_id === active?.id);
  const connectedIds = new Set(conns.flatMap((c) => [c.from_photo_id, c.to_photo_id]));
  const displayHeading = ((currentHeading - northOffset + 360) % 360).toFixed(2);

  return (
    <AppShell title="Build Connections" breadcrumbs={[{ label: "Tours", to: "/tours" }, { label: tour?.name ?? "Tour" }, { label: "Build Connections" }]}>
      <TourStepNav tourId={tourId} current="connections" />

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => toast.success("Saved")}><Save className="h-4 w-4 mr-1" />Save</Button>
        <Button variant="outline" size="sm" onClick={undoLast}><Undo2 className="h-4 w-4 mr-1" />Undo</Button>
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.info("Tour link copied"); }}>
          <Share2 className="h-4 w-4 mr-1" />Share
        </Button>
        <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}><HelpCircle className="h-4 w-4 mr-1" />Help</Button>
        <Button variant="default" size="sm" className="ml-auto" onClick={() => window.location.assign(`/tours/${tourId}/publish`)}>
          Next<ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[28fr_44fr_28fr] gap-3">
        {/* LEFT PANEL */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
          <div className="bg-primary text-primary-foreground px-3 py-2 flex items-center gap-2">
            <Input
              value={activeConstName}
              onChange={(e) => setActiveConstName(e.target.value)}
              placeholder="— Enter A Name"
              className="h-7 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60"
            />
            <button onClick={() => setShowLabels((s) => !s)} title="Toggle labels"><Eye className="h-4 w-4" /></button>
          </div>

          {/* Mini map */}
          <div className="relative">
            <div ref={mapDivRef} className="w-full h-[200px] bg-muted">
              {!MAPS_KEY && (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-3 text-center">
                  Add VITE_GOOGLE_MAPS_API_KEY to enable map.
                </div>
              )}
            </div>
            <div className="absolute top-1 left-1 right-1 flex items-center gap-1 bg-background/90 backdrop-blur rounded px-1.5 py-1 text-xs">
              <select className="bg-transparent text-[10px] outline-none" onChange={(e) => mapRef.current?.setMapTypeId(e.target.value)}>
                <option value="roadmap">Map</option>
                <option value="satellite">Satellite</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <button title="Center to business" onClick={recenter}><Home className="h-3 w-3" /></button>
              <button title="Lock all" onClick={async () => { await supabase.from("connections").update({ is_locked: true }).eq("tour_id", tourId); load(); }}><Lock className="h-3 w-3" /></button>
              <button title="Download"><Download className="h-3 w-3" /></button>
              <button title="Labels" onClick={() => setShowLabels((s) => !s)}><Tag className="h-3 w-3" /></button>
              <button title="Refresh" onClick={load}><RefreshCw className="h-3 w-3" /></button>
              <button title="Selection"><Crosshair className="h-3 w-3" /></button>
              <button title="Help" onClick={() => setHelpOpen(true)}><HelpCircle className="h-3 w-3" /></button>
              <button title="Fullscreen" className="ml-auto" onClick={() => mapDivRef.current?.requestFullscreen?.()}><Maximize2 className="h-3 w-3" /></button>
            </div>
          </div>

          {/* Scene list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[520px]">
            {photos.map((p, idx) => {
              const inConst = connectedIds.has(p.id);
              const isActive = idx === activeIdx;
              return (
                <div
                  key={p.id}
                  onClick={() => setActiveIdx(idx)}
                  className={`relative rounded-lg overflow-hidden border cursor-pointer ${isActive ? "ring-2 ring-primary border-primary" : ""}`}
                >
                  <div className="aspect-square relative bg-muted">
                    <img src={p.file_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 rounded bg-foreground text-background px-1.5 py-0.5 text-[10px] font-bold">{idx}</div>
                    {inConst ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); const c = conns.find((x) => x.from_photo_id === p.id || x.to_photo_id === p.id); if (c) deleteConn(c.id); }}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      ><Minus className="h-3 w-3" /></button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveIdx(idx); }}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-success text-white flex items-center justify-center"
                      ><Plus className="h-3 w-3" /></button>
                    )}
                    {p.latitude == null && (
                      <div className="absolute bottom-1 left-1 rounded bg-warning text-warning-foreground px-1 py-0.5 text-[9px] flex items-center gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" />No GPS
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-1 px-2 py-1 text-[10px] bg-background" onClick={(e) => e.stopPropagation()}>
                    <Checkbox className="h-3 w-3" defaultChecked />
                    in carousel
                    <Info className="h-3 w-3 ml-auto text-muted-foreground" />
                  </label>
                </div>
              );
            })}
            {photos.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">No photos uploaded yet.</div>
            )}
          </div>
        </div>

        {/* CENTER PANEL */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
          {/* Top green bar */}
          <div className="bg-success text-white px-3 py-1.5 text-xs flex items-center justify-between">
            <span className="font-mono">H: {displayHeading}</span>
            <button onClick={setNorth} className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded">
              <Navigation className="h-3 w-3" />SET NORTH
            </button>
          </div>

          {/* Pending overlay */}
          {pendingTo && (
            <div className="bg-primary text-primary-foreground px-3 py-2 flex items-center gap-2 text-xs">
              <div className="flex-1 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary-foreground/80 animate-pulse w-2/3" />
              </div>
              <select value={spacing} onChange={(e) => setSpacing(e.target.value)} className="bg-primary-foreground/10 rounded px-1 py-0.5">
                {SPACINGS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => setPendingTo(null)} className="h-6 w-6 rounded-full bg-destructive flex items-center justify-center"><X className="h-3 w-3" /></button>
              <button onClick={() => { const p = photos.find((x) => x.id === pendingTo); if (p) addConnection(p); }} className="h-6 w-6 rounded-full bg-success flex items-center justify-center"><Check className="h-3 w-3" /></button>
            </div>
          )}

          {/* Pano */}
          <div className="relative flex-1 bg-black min-h-[480px]">
            <div ref={panoRef} className="absolute inset-0" />
            {!active && (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">Select a scene to preview</div>
            )}
            {/* Right side controls */}
            <div className="absolute right-2 top-2 flex flex-col gap-1">
              <button onClick={fullscreenPano} className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white rounded flex items-center justify-center"><Maximize2 className="h-4 w-4" /></button>
              <button onClick={() => zoomPano(-10)} className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white rounded flex items-center justify-center"><ZoomIn className="h-4 w-4" /></button>
              <button onClick={() => zoomPano(10)} className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white rounded flex items-center justify-center"><ZoomOut className="h-4 w-4" /></button>
            </div>
            {/* Compass */}
            <div className="absolute bottom-3 right-3 h-14 w-14 rounded-full bg-black/60 border-2 border-white/40 flex items-center justify-center">
              <Navigation
                className="h-7 w-7 text-white"
                style={{ transform: `rotate(${-currentHeading + northOffset}deg)` }}
              />
            </div>
            {/* Connection arrows */}
            {activeConns.filter((c) => c.from_photo_id === active?.id).map((c, i) => {
              const offset = ((c.heading - currentHeading + 540) % 360) - 180;
              if (Math.abs(offset) > 60) return null;
              return (
                <div
                  key={c.id}
                  className="absolute top-1/2 left-1/2 -translate-y-1/2 text-white/90 pointer-events-none"
                  style={{ transform: `translate(${offset * 4}px, 0)` }}
                >
                  <ArrowRight className="h-10 w-10 drop-shadow-lg" />
                </div>
              );
            })}
          </div>

          {/* Bottom green bar */}
          <div className="bg-success text-white px-3 py-1.5 text-xs flex items-center justify-between">
            <span className="font-mono">H: {displayHeading}</span>
            <span>Scene {activeIdx} / {photos.length}</span>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
          <div className="bg-primary text-primary-foreground px-3 py-2 space-y-2">
            <Input
              value={activeConstName}
              onChange={(e) => setActiveConstName(e.target.value)}
              placeholder="— Enter A Name"
              className="h-7 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60"
            />
            <label className="flex items-center gap-2 text-[11px]">
              <Checkbox checked={autoAlign} onCheckedChange={(v) => setAutoAlign(!!v)} className="h-3 w-3 bg-white" />
              AUTO ALIGN
            </label>
            <div className="flex items-center gap-2 text-[10px]">
              <span>F</span>
              <Slider value={alignFine} onValueChange={setAlignFine} min={0} max={10} step={1} className="flex-1" />
              <span>P</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2 max-h-[640px]">
            {photos.map((p, idx) => {
              if (active && p.id === active.id) return null;
              const already = conns.some(
                (c) => (c.from_photo_id === active?.id && c.to_photo_id === p.id) ||
                       (c.to_photo_id === active?.id && c.from_photo_id === p.id)
              );
              return (
                <div key={p.id} className="relative rounded-lg overflow-hidden border bg-background">
                  <div className="aspect-square relative">
                    <img src={p.file_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 rounded bg-foreground text-background px-1.5 py-0.5 text-[10px] font-bold">{idx}</div>
                    <button
                      onClick={() => already ? toast.info("Already connected") : addConnection(p)}
                      className={`absolute top-1 right-1 h-6 w-6 rounded-full text-white flex items-center justify-center ${already ? "bg-muted-foreground" : "bg-success hover:bg-success/90"}`}
                      title={already ? "Already connected" : "Connect"}
                    >
                      {already ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              );
            })}
            {photos.length <= 1 && (
              <div className="col-span-2 text-center text-xs text-muted-foreground py-8">Upload at least 2 scenes to start connecting.</div>
            )}
          </div>
        </div>
      </div>

      {/* Status legend */}
      <div className="mt-4 rounded-xl border bg-card p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2"><CheckCheck className="h-4 w-4 text-success" /> All connections published</div>
        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-warning" /> Some connections published</div>
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-warning" /> Still processing</div>
        <div className="flex items-center gap-2"><X className="h-4 w-4 text-destructive" /> Rejected</div>
      </div>

      {/* Help modal */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Help</DialogTitle></DialogHeader>
          <Tabs defaultValue="constellations">
            <TabsList>
              <TabsTrigger value="constellations">Constellations</TabsTrigger>
              <TabsTrigger value="islands">Islands</TabsTrigger>
              <TabsTrigger value="selection">Selection Tool</TabsTrigger>
              <TabsTrigger value="hotkeys">Hot Keys</TabsTrigger>
            </TabsList>
            <TabsContent value="constellations" className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Map toolbar</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Select map type</li>
                  <li>• Expand / contract map</li>
                  <li>• Help</li>
                  <li>• Selection tool</li>
                  <li>• Rotate tool</li>
                  <li>• Toggle constellation labels</li>
                  <li>• Unlock all constellations</li>
                  <li>• Lock all constellations</li>
                  <li>• Center map to business</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Interactions</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li><b>Right click</b> a connection to <b>delete</b> it.</li>
                  <li><b>Left click + drag</b> to <b>move</b> the constellation.</li>
                  <li><b>Rotate icon + drag</b> to <b>rotate</b> active constellation.</li>
                  <li><b>Shift + hover</b> over an unconnected constellation, then <b>left click</b> to make a connection.</li>
                  <li><b>Left click</b> a constellation to navigate to that scene.</li>
                </ul>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex items-center gap-2"><div className="h-1 w-12 bg-blue-600" />Unlocked connection</div>
                  <div className="flex items-center gap-2"><div className="h-0.5 w-6 bg-blue-900" />Locked connection</div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="islands" className="text-sm text-muted-foreground">Islands group constellations into named regions of your tour.</TabsContent>
            <TabsContent value="selection" className="text-sm text-muted-foreground">Use the selection tool to drag-select multiple scenes on the map.</TabsContent>
            <TabsContent value="hotkeys" className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li><b>Ctrl + S</b> — Save</li>
                <li><b>Ctrl + Z</b> — Undo last connection</li>
                <li><b>N</b> — Set North</li>
                <li><b>F</b> — Fullscreen panorama</li>
              </ul>
            </TabsContent>
          </Tabs>
          <DialogFooter><Button onClick={() => setHelpOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
