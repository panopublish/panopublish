import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TourStepsNav } from "@/components/TourStepsNav";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  Minus,
  Save,
  Undo2,
  Share2,
  ArrowRight,
  ArrowUp,
  Eye,
  Navigation,
  Maximize2,
  ZoomIn,
  ZoomOut,
  HelpCircle,
  X,
  Check,
  Clock,
  CheckCheck,
  AlertTriangle,
  Info,
  MousePointer2,
  Trash2,
  Camera,
  MapPin,
  RotateCcw,
  Edit3,
  Palette,
  LogOut,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { usePanoramaMap } from "@/hooks/usePanoramaMap";
import { MapToolbar } from "@/components/MapToolbar";
import { PanoramaNode, Connection, MapMode } from "@/types/panorama";

import { getEnv } from "@/lib/env";

import { SEO } from "@/components/SEO";

export const Route = createFileRoute("/tours/$tourId/connections")({
  head: () => ({
    meta: [
      { title: "Build Connections — PanoPublish" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConnectionsPage,
});

const MAPS_KEY = getEnv("VITE_GOOGLE_MAPS_API_KEY");

type Photo = {
  id: string;
  file_url: string;
  filename: string | null;
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  order_index?: number;
  uploaded_at?: string;
  island_id?: string | null;
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
  metadata?: string | null;
};
type Constellation = { id: string; name: string };
type Island = { id: string; name: string; order_index: number };

declare global {
  interface Window {
    google?: any;
    pannellum?: { viewer: (el: string | HTMLElement, cfg: unknown) => { destroy: () => void } };
    PanoViewer?: any;
    Marzipano?: any;
  }
}

const SPACINGS = ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "10m"];

function calcHeading(from: Photo, to: Photo): number | null {
  if (!from.latitude || !from.longitude || !to.latitude || !to.longitude) return null;
  const dLon = to.longitude - from.longitude;
  const dLat = to.latitude - from.latitude;
  if (dLon === 0 && dLat === 0) return null;
  let h = Math.atan2(dLon, dLat) * (180 / Math.PI);
  if (h < 0) h += 360;
  return h;
}

function getHotspotScreenCoords(
  hotspotHeading: number,
  hotspotPitch: number,
  pov: { heading: number; pitch: number; zoom: number },
  photoHeadingOffset: number,
  containerWidth: number,
  containerHeight: number,
): { x: number; y: number; visible: boolean } {
  if (!containerWidth || !containerHeight) return { x: 0, y: 0, visible: false };

  // Calculate target yaw in 360 texture space
  const targetYawDeg = (hotspotHeading - photoHeadingOffset + 360) % 360;

  // Angular difference relative to camera POV heading
  const dYawDeg = ((targetYawDeg - pov.heading + 540) % 360) - 180;
  const dYawRad = (dYawDeg * Math.PI) / 180;

  const targetPitchRad = (hotspotPitch * Math.PI) / 180;
  const povPitchRad = (pov.pitch * Math.PI) / 180;

  // 3D Spherical to Camera View Matrix Transformation
  const X_cam = Math.sin(dYawRad) * Math.cos(targetPitchRad);
  const Y_cam =
    Math.sin(targetPitchRad) * Math.cos(povPitchRad) -
    Math.cos(dYawRad) * Math.cos(targetPitchRad) * Math.sin(povPitchRad);
  const Z_cam =
    Math.cos(dYawRad) * Math.cos(targetPitchRad) * Math.cos(povPitchRad) +
    Math.sin(targetPitchRad) * Math.sin(povPitchRad);

  // Behind or perpendicular to camera plane
  if (Z_cam <= 0.05) {
    return { x: 0, y: 0, visible: false };
  }

  // Camera focal length from zoom FOV
  const fovDeg = Math.min(160, Math.max(10, 180 / Math.pow(2, pov.zoom ?? 1)));
  const fovRad = (fovDeg * Math.PI) / 180;
  const focalLength = containerWidth / 2 / Math.tan(fovRad / 2);

  // Screen coordinates
  const x = containerWidth / 2 + (X_cam / Z_cam) * focalLength;
  const y = containerHeight / 2 - (Y_cam / Z_cam) * focalLength;

  const visible =
    x >= -50 && x <= containerWidth + 50 && y >= -50 && y <= containerHeight + 50;

  return { x, y, visible };
}

function useGoogleMaps() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!MAPS_KEY) return;
    if (window.google?.maps) {
      setReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-panopublish-gmaps]");
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places,geometry`;
    s.async = true;
    s.defer = true;
    s.dataset.panopublishGmaps = "1";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

function ConnectionsPage() {
  const { tourId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [previewMode, setPreviewMode] = useState(false);
  const mapsReady = useGoogleMaps();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isPreview = new URLSearchParams(window.location.search).get("preview") === "true";
      setPreviewMode(isPreview);
    }
  }, []);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [conns, setConns] = useState<Conn[]>([]);
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [activeConstName, setActiveConstName] = useState("");
  const [tour, setTour] = useState<{
    name: string;
    latitude: number | null;
    longitude: number | null;
    type?: string | null;
  } | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [autoAlign, setAutoAlign] = useState(true);
  const [alignFine, setAlignFine] = useState([5]);
  const [spacing, setSpacing] = useState("3m");
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const [rightPendingTo, setRightPendingTo] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<{
    fromId: string;
    toId: string;
  } | null>(null);
  const [hotspotIcon, setHotspotIcon] = useState<string>("arrow");
  const [hotspotLabel, setHotspotLabel] = useState<string>("");
  const [savingHotspot, setSavingHotspot] = useState<boolean>(false);

  const activeConnObj = useMemo(() => {
    if (!selectedConnection) return null;
    return conns.find(
      (c) =>
        c.from_photo_id === selectedConnection.fromId &&
        c.to_photo_id === selectedConnection.toId,
    );
  }, [selectedConnection, conns]);

  useEffect(() => {
    if (activeConnObj) {
      let meta: any = {};
      try {
        if (activeConnObj.metadata) {
          meta = JSON.parse(activeConnObj.metadata);
        }
      } catch (e) {
        console.error(e);
      }
      setHotspotIcon(meta.icon_type || "arrow");
      setHotspotLabel(meta.label || "");
    } else {
      setHotspotIcon("arrow");
      setHotspotLabel("");
    }
  }, [activeConnObj]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [currentPov, setCurrentPov] = useState<{ heading: number; pitch: number; zoom: number }>({
    heading: 0,
    pitch: 0,
    zoom: 1,
  });
  const [islands, setIslands] = useState<Island[]>([]);
  const [islandOpen, setIslandOpen] = useState<Record<string, boolean>>({});
  const [rightIslandOpen, setRightIslandOpen] = useState<Record<string, boolean>>({});
  const [activeIslandId, setActiveIslandId] = useState<string | null>(null);
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);

  const [opacity, setOpacity] = useState([100]);

  // Map Editor State
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid">("roadmap");
  const [mapMode, setMapMode] = useState<MapMode>("select");
  const [showLabels, setShowLabels] = useState(true);
  const [expandMap, setExpandMap] = useState(false);

  // Custom Tour Hotspot State
  const [addCustomHotspotOpen, setAddCustomHotspotOpen] = useState(false);
  const [customHotspotTargetId, setCustomHotspotTargetId] = useState<string>("");
  const [customHotspotIcon, setCustomHotspotIcon] = useState<string>("arrow");
  const [customHotspotLabel, setCustomHotspotLabel] = useState<string>("");
  const [editingCustomHotspotId, setEditingCustomHotspotId] = useState<string | null>(null);

  // Interactive Hotspot Popovers & Dragging State
  const [draggingHotspotId, setDraggingHotspotId] = useState<string | null>(null);
  const [editingTargetPopoverId, setEditingTargetPopoverId] = useState<string | null>(null);
  const [editingIconPopoverId, setEditingIconPopoverId] = useState<string | null>(null);

  const panoRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const marzSceneRef = useRef<any>(null);
  const marzViewRef = useRef<any>(null);
  const customScenesCacheRef = useRef<Record<string, { scene: any; view: any }>>({});
  const overlayPanoRef = useRef<HTMLDivElement>(null);
  const overlayViewerRef = useRef<any>(null);
  const overlayPanoContainerRef = useRef<HTMLDivElement | null>(null);
  const rightPanoRef = useRef<HTMLDivElement>(null);
  const rightViewerRef = useRef<any>(null);
  const rightPanoContainerRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const modalMapDivRef = useRef<HTMLDivElement>(null);

  const photosRef = useRef(photos);
  photosRef.current = photos;

  const active = activeIdx !== null ? photos[activeIdx] : null;

  const activeRef = useRef(active);
  activeRef.current = active;

  const connsRef = useRef(conns);
  connsRef.current = conns;

  const lastHeadingRef = useRef(0);
  const prevActiveIdRef = useRef<string | null>(null);
  const photoCenter = useMemo(() => {
    if (active?.latitude && active?.longitude)
      return { lat: active.latitude, lng: active.longitude };
    if (tour?.latitude && tour?.longitude) return { lat: tour.latitude, lng: tour.longitude };
    return { lat: 23.02463, lng: 72.56436 };
  }, [active, tour]);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: t }, { data: ps }, { data: cs }, { data: cons }, { data: is }] =
      await Promise.all([
        supabase.from("tours").select("name,latitude,longitude,type").eq("id", tourId).maybeSingle(),
        supabase.from("photos").select("*").eq("tour_id", tourId),
        supabase.from("connections").select("*").eq("tour_id", tourId),
        supabase.from("constellations").select("id,name").eq("tour_id", tourId).order("created_at"),
        supabase.from("islands").select("*").eq("tour_id", tourId).order("order_index"),
      ]);
    setTour(t as any);

    const tourLat = t?.latitude || 23.02463;
    const tourLng = t?.longitude || 72.56436;

    const mappedPhotos = ((ps as any[]) ?? []).map((p) => ({
      ...p,
      latitude: p.latitude && p.latitude !== 0 ? p.latitude : tourLat,
      longitude: p.longitude && p.longitude !== 0 ? p.longitude : tourLng,
    }));

    const sortedPhotos = mappedPhotos.sort((a, b) => {
      if (a.order_index != null && b.order_index != null) return a.order_index - b.order_index;
      return new Date(a.uploaded_at || 0).getTime() - new Date(b.uploaded_at || 0).getTime();
    });
    setPhotos(sortedPhotos);

    const fetchedConns = (cs as any) ?? [];
    setConns(fetchedConns);

    // Sync activeIdx when connections are added/removed
    setActiveIdx((prevIdx) => {
      if (sortedPhotos.length === 0) return null;
      if (prevIdx === null) return 0;
      if (prevIdx >= sortedPhotos.length) return 0;

      const connectedPhotoIds = new Set(
        fetchedConns.flatMap((c: any) => [c.from_photo_id, c.to_photo_id]),
      );

      const currentActivePhoto = sortedPhotos[prevIdx];
      if (!currentActivePhoto) {
        return 0;
      }

      // If connections exist and current photo is not connected, fallback to first connected photo
      if (fetchedConns.length > 0 && !connectedPhotoIds.has(currentActivePhoto.id)) {
        const firstConnectedIdx = sortedPhotos.findIndex((p) => connectedPhotoIds.has(p.id));
        if (firstConnectedIdx !== -1) {
          return firstConnectedIdx;
        }
      }

      return prevIdx;
    });

    setConstellations((cons as any) ?? []);
    setIslands((is as any) ?? []);

    const iOpen: Record<string, boolean> = {};
    const riOpen: Record<string, boolean> = {};
    const firstPhoto = sortedPhotos[0];
    const initialIsland = firstPhoto ? firstPhoto.island_id || "unassigned" : "unassigned";

    setActiveIslandId(initialIsland);

    (is || []).forEach((island: any) => {
      iOpen[island.id] = island.id === initialIsland;
      riOpen[island.id] = island.id === initialIsland;
    });
    iOpen["unassigned"] = "unassigned" === initialIsland;
    riOpen["unassigned"] = "unassigned" === initialIsland;
    setIslandOpen(iOpen);
    setRightIslandOpen(riOpen);

    if (cons && cons.length > 0) {
      if (!activeConstName) setActiveConstName(cons[0].name);
    } else if (t && t.name) {
      setActiveConstName(t.name);
    } else if (!activeConstName) {
      setActiveConstName("Default Constellation");
    }
  }, [user, tourId, activeConstName]);

  useEffect(() => {
    load();
  }, [load]);

  const markConnectionsUnsynced = useCallback(async () => {
    try {
      await supabase
        .from("tours")
        .update({ streetview_connections_synced: false } as any)
        .eq("id", tourId);
    } catch (e) {
      console.error("Failed to mark connections unsynced:", e);
    }
  }, [tourId]);

  // Synchronize expanded island and map focus when active photo changes
  useEffect(() => {
    if (active) {
      const targetIslandId = active.island_id || "unassigned";
      setActiveIslandId(targetIslandId);

      const newOpen: Record<string, boolean> = {};
      [...islands, { id: "unassigned", name: "Unassigned", order_index: 999 }].forEach((is) => {
        newOpen[is.id] = is.id === targetIslandId;
      });
      setIslandOpen(newOpen);
      setRightIslandOpen(newOpen);
    }
  }, [active?.id, islands]);

  // Derived state for map overlay (filtered by active island/floor)
  const mapNodes: PanoramaNode[] = useMemo(() => {
    const filteredPhotos = photos.filter((p) => {
      const pIslandId = p.island_id || "unassigned";
      return activeIslandId ? pIslandId === activeIslandId : true;
    });

    // Compute the preview coordinates for pendingTo dynamically
    let previewLat: number | null = null;
    let previewLng: number | null = null;

    if (active && pendingTo && active.latitude && active.longitude) {
      const distanceNum = parseInt(spacing.replace("m", "")) || 3;
      const baseHeading = ((active.heading || 0) + currentHeading) % 360;
      const finalHeading = (baseHeading + alignFine[0] - 5 + 360) % 360;
      const geographicHeading = finalHeading;

      if (typeof window !== "undefined" && window.google?.maps?.geometry?.spherical) {
        const fromLatLng = new window.google.maps.LatLng(active.latitude, active.longitude);
        const toLatLng = window.google.maps.geometry.spherical.computeOffset(
          fromLatLng,
          distanceNum,
          geographicHeading,
        );
        previewLat = toLatLng.lat();
        previewLng = toLatLng.lng();
      }
    }

    return filteredPhotos.map((p) => {
      const originalIndex = photos.findIndex((x) => x.id === p.id);
      const lat =
        p.id === pendingTo && previewLat !== null
          ? previewLat
          : p.latitude || tour?.latitude || 23.02463;
      const lng =
        p.id === pendingTo && previewLng !== null
          ? previewLng
          : p.longitude || tour?.longitude || 72.56436;
      return {
        id: p.id,
        lat,
        lng,
        heading:
          active && p.id === active.id
            ? ((active.heading || 0) + currentHeading) % 360
            : (p.heading ?? 0),
        label: showLabels ? String(originalIndex) : "",
        connectionCount: conns.filter((c) => c.from_photo_id === p.id || c.to_photo_id === p.id)
          .length,
        status: "active",
      };
    });
  }, [
    photos,
    tour,
    conns,
    showLabels,
    active,
    currentHeading,
    activeIslandId,
    pendingTo,
    spacing,
    alignFine,
  ]);

  const mapConnections: Connection[] = useMemo(() => {
    return conns
      .filter((c) => {
        const fromP = photos.find((p) => p.id === c.from_photo_id);
        const toP = photos.find((p) => p.id === c.to_photo_id);
        if (!fromP || !toP) return false;

        const fromIsland = fromP.island_id || "unassigned";
        const toIsland = toP.island_id || "unassigned";

        if (activeIslandId) {
          return fromIsland === activeIslandId && toIsland === activeIslandId;
        }
        return true;
      })
      .map((c) => ({
        id: c.id,
        fromId: c.from_photo_id,
        toId: c.to_photo_id,
        heading: c.heading,
        isLocked: c.is_locked,
      }));
  }, [conns, photos, activeIslandId]);

  const handleExpandIsland = useCallback(
    (islandId: string) => {
      setActiveIslandId(islandId);

      const newOpen: Record<string, boolean> = {};
      [...islands, { id: "unassigned", name: "Unassigned", order_index: 999 }].forEach((is) => {
        newOpen[is.id] = is.id === islandId;
      });
      setIslandOpen(newOpen);
      setRightIslandOpen(newOpen);

      const targetPhotos = photos.filter((p) => (p.island_id || "unassigned") === islandId);
      if (targetPhotos.length > 0) {
        // If the active photo is not in the expanded island, switch active photo to the first photo of this island
        const isAlreadyActive = targetPhotos.some((p) => active && p.id === active.id);
        if (!isAlreadyActive) {
          const idx = photos.findIndex((p) => p.id === targetPhotos[0].id);
          if (idx !== -1) {
            setActiveIdx(idx);
          }
        }
      }
    },
    [islands, photos, active],
  );

  const handleToggleIsland = useCallback(
    (islandId: string, isOpen: boolean) => {
      if (!isOpen) {
        handleExpandIsland(islandId);
      } else {
        setIslandOpen((prev) => ({ ...prev, [islandId]: false }));
        setRightIslandOpen((prev) => ({ ...prev, [islandId]: false }));
        setActiveIslandId(null); // Show all floors on map when collapsed
      }
    },
    [handleExpandIsland],
  );

  // Handle Map Node Updates (Drag)
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const handleNodeMove = useCallback(
    (id: string, lat: number, lng: number) => {
      // Optimistic
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, latitude: lat, longitude: lng } : p)),
      );
      // Debounce save
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        await supabase.from("photos").update({ latitude: lat, longitude: lng }).eq("id", id);
        await markConnectionsUnsynced();
        toast.success("Position saved", { duration: 1500 });
      }, 500);
    },
    [tourId, markConnectionsUnsynced],
  );

  const handleNodeRotate = useCallback(
    (heading: number) => {
      if (!active) return;
      setPhotos((prev) => prev.map((p) => (p.id === active.id ? { ...p, heading } : p)));
      // Debounce save
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        await supabase.from("photos").update({ heading }).eq("id", active.id);
        await markConnectionsUnsynced();
        toast.success("Heading saved", { duration: 1500 });
      }, 500);
    },
    [active, markConnectionsUnsynced],
  );

  const handleNodeSelect = useCallback(
    (id: string) => {
      if (mapMode === "connect" && active) {
        const targetPhoto = photos.find((p) => p.id === id);
        if (targetPhoto && targetPhoto.id !== active.id) {
          addConnection(targetPhoto);
          setMapMode("select");
        }
      } else {
        const idx = photos.findIndex((p) => p.id === id);
        if (idx !== -1) setActiveIdx(idx);
      }
    },
    [mapMode, active, photos],
  );

  // Preload custom tour images in background for instant scene switching
  useEffect(() => {
    if (tour?.type === "custom" && photos.length > 0) {
      photos.forEach((p) => {
        if (p.file_url) {
          const img = new Image();
          img.src = p.file_url;
        }
      });
    }
  }, [tour?.type, photos]);

  // 360 Panorama Main Viewer (Custom Tour Engine & StreetView)
  useEffect(() => {
    if (!active || !panoRef.current) return;

    if (tour?.type === "custom") {
      let cancelled = false;

      const initCustomViewer = () => {
        const PanoEngine = window.PanoViewer || window.Marzipano;
        if (cancelled || !panoRef.current || !PanoEngine) return;
        try {
          const panoElement = panoRef.current;

          // Re-use existing viewer if already created
          let viewer = viewerRef.current;
          if (!viewer || typeof viewer.createScene !== "function") {
            panoElement.innerHTML = ""; // Clear canvas container
            viewer = new PanoEngine.Viewer(panoElement, {
              controls: { mouseViewMode: "drag" },
              stage: { progressive: true },
            });
            viewerRef.current = viewer;
            customScenesCacheRef.current = {};
          }

          let cached = customScenesCacheRef.current[active.id];
          if (!cached) {
            const source = PanoEngine.ImageUrlSource.fromString(active.file_url);
            const geometry = new PanoEngine.EquirectGeometry([{ width: 4000 }]);
            const limitor = PanoEngine.RectilinearView.limit.traditional(
              2048,
              (100 * Math.PI) / 180,
            );

            const view = new PanoEngine.RectilinearView(
              { yaw: 0, pitch: 0, fov: Math.PI / 2 },
              limitor,
            );

            const scene = viewer.createScene({
              source: source,
              geometry: geometry,
              view: view,
            });

            cached = { scene, view };
            customScenesCacheRef.current[active.id] = cached;

            const syncPov = () => {
              if (view) {
                try {
                  const yRad = view.yaw() || 0;
                  const pRad = view.pitch() || 0;
                  const fovRad = view.fov() || Math.PI / 2;

                  const yDeg = Math.round(((yRad * 180) / Math.PI + 360) % 360);
                  const pDeg = Math.round((pRad * 180) / Math.PI);
                  const zoom = (Math.PI / 2) / fovRad;

                  setCurrentHeading(yDeg);
                  setCurrentPov({ heading: yDeg, pitch: pDeg, zoom });
                } catch {}
              }
            };

            view.addEventListener("change", syncPov);
          }

          marzSceneRef.current = cached.scene;
          marzViewRef.current = cached.view;

          cached.scene.switchTo({ transitionDuration: 300 });
        } catch (err) {
          console.error("360 viewer init error", err);
        }
      };

      const PanoEngine = window.PanoViewer || window.Marzipano;
      if (PanoEngine) {
        initCustomViewer();
      } else {
        const interval = setInterval(() => {
          if (window.PanoViewer || window.Marzipano) {
            clearInterval(interval);
            initCustomViewer();
          }
        }, 100);
        return () => clearInterval(interval);
      }

      return () => {
        cancelled = true;
      };
    } else {
      if (!mapsReady || !window.google?.maps) return;

      if (!viewerRef.current) {
        viewerRef.current = new window.google.maps.StreetViewPanorama(panoRef.current, {
          visible: true,
          pano: active.id,
          zoomControl: false,
          panControl: false,
          addressControl: false,
          fullscreenControl: false,
          linksControl: true,
          enableCloseButton: false,
          showRoadLabels: false,
          panoProvider: (panoId: string) => {
            const p =
              active && panoId === active.id
                ? active
                : photosRef.current.find((x) => x.id === panoId);
            if (!p) return null;

            const activeConns = connsRef.current.filter((c) => c.from_photo_id === panoId);
            const links = activeConns.map((c) => {
              const targetPhoto = photosRef.current.find((x) => x.id === c.to_photo_id);
              let dynamicHeading = c.heading;
              if (p && targetPhoto) {
                const calcH = calcHeading(p, targetPhoto);
                if (calcH !== null) {
                  dynamicHeading = calcH;
                }
              }
              return {
                description: targetPhoto?.filename || "Scene",
                heading: (dynamicHeading - (p.heading || 0) + 360) % 360,
                pano: c.to_photo_id,
              };
            });

            return {
              location: {
                pano: p.id,
                description: p.filename || "Scene",
                latLng: new window.google.maps.LatLng(
                  p.latitude || tour?.latitude || 0,
                  p.longitude || tour?.longitude || 0,
                ),
              },
              links: links,
              copyright: "PanoPublish",
              tiles: {
                tileSize: new window.google.maps.Size(4096, 2048),
                worldSize: new window.google.maps.Size(4096, 2048),
                centerHeading: 0,
                getTileUrl: () => p.file_url,
              },
            };
          },
        });

        prevActiveIdRef.current = active.id;

        viewerRef.current.addListener("pov_changed", () => {
          const pov = viewerRef.current.getPov();
          if (pov) {
            const headingVal = (pov.heading + 360) % 360;
            setCurrentHeading(headingVal);
            setCurrentPov({
              heading: headingVal,
              pitch: pov.pitch ?? 0,
              zoom: pov.zoom ?? 1,
            });
            lastHeadingRef.current = headingVal;
          }
        });

        viewerRef.current.addListener("zoom_changed", () => {
          const pov = viewerRef.current.getPov();
          if (pov) {
            setCurrentPov((prev) => ({ ...prev, zoom: pov.zoom ?? 1 }));
          }
        });

        viewerRef.current.addListener("pano_changed", () => {
          const newPano = viewerRef.current.getPano();
          const currentActive = activeRef.current;
          const currentPhotos = photosRef.current;

          if (newPano && currentActive && newPano !== currentActive.id) {
            const prevHeadingOffset = currentActive.heading || 0;
            const prevPovHeading = lastHeadingRef.current;
            const absoluteGeographicHeading = (prevPovHeading + prevHeadingOffset) % 360;

            const targetPhoto = currentPhotos.find((p) => p.id === newPano);
            if (targetPhoto) {
              const newHeadingOffset = targetPhoto.heading || 0;
              const targetPovHeading = (absoluteGeographicHeading - newHeadingOffset + 360) % 360;

              const currentPov = viewerRef.current.getPov();
              viewerRef.current.setPov({
                heading: targetPovHeading,
                pitch: currentPov?.pitch ?? 0,
                zoom: currentPov?.zoom ?? 1,
              });
              lastHeadingRef.current = targetPovHeading;
              setCurrentHeading(targetPovHeading);
              setCurrentPov({
                heading: targetPovHeading,
                pitch: currentPov?.pitch ?? 0,
                zoom: currentPov?.zoom ?? 1,
              });
            }

            const idx = currentPhotos.findIndex((p) => p.id === newPano);
            if (idx !== -1) setActiveIdx(idx);
          } else {
            const pov = viewerRef.current.getPov();
            if (pov) {
              const headingVal = (pov.heading + 360) % 360;
              setCurrentHeading(headingVal);
              setCurrentPov({
                heading: headingVal,
                pitch: pov.pitch ?? 0,
                zoom: pov.zoom ?? 1,
              });
              lastHeadingRef.current = headingVal;
            }
          }
        });
      } else {
        const prevId = prevActiveIdRef.current;
        const currentId = active.id;
        const viewerPano = viewerRef.current.getPano();

        if (viewerPano !== currentId) {
          viewerRef.current.setPano(active.id);
        }

        prevActiveIdRef.current = active.id;
      }
    }
  }, [active?.id, active?.file_url, mapsReady, tour?.type]);

  // Synchronize 3D chevron links dynamically when coordinates or headings update (e.g. during dragging)
  useEffect(() => {
    if (!viewerRef.current || !active) return;
    const p = photos.find((x) => x.id === active.id);
    if (!p) return;

    const updateLinks = () => {
      const activeConns = conns.filter((c) => c.from_photo_id === active.id);
      const links = activeConns.map((c) => {
        const targetPhoto = photos.find((x) => x.id === c.to_photo_id);
        let dynamicHeading = c.heading;
        if (targetPhoto) {
          const calcH = calcHeading(p, targetPhoto);
          if (calcH !== null) {
            dynamicHeading = calcH;
          }
        }
        return {
          description: targetPhoto?.filename || "Scene",
          heading: (dynamicHeading - (p.heading || 0) + 360) % 360,
          pano: c.to_photo_id,
        };
      });

      try {
        viewerRef.current.setLinks(links);
      } catch (err) {
        console.warn("Failed to set links dynamically", err);
      }
    };

    updateLinks();

    // Call in multiple timeouts to ensure it is set after panorama finishes loading
    const t1 = setTimeout(updateLinks, 200);
    const t2 = setTimeout(updateLinks, 600);
    const t3 = setTimeout(updateLinks, 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [photos, conns, active?.id]);

  // Overlay Street View viewer
  useEffect(() => {
    const pendingPhoto = photos.find((p) => p.id === pendingTo);
    if (!pendingPhoto || !overlayPanoRef.current || !mapsReady || !window.google?.maps) {
      overlayViewerRef.current = null;
      overlayPanoContainerRef.current = null;
      return;
    }

    const containerChanged = overlayPanoContainerRef.current !== overlayPanoRef.current;
    overlayPanoContainerRef.current = overlayPanoRef.current;

    if (!overlayViewerRef.current || containerChanged) {
      overlayViewerRef.current = new window.google.maps.StreetViewPanorama(overlayPanoRef.current, {
        visible: true,
        pano: pendingPhoto.id,
        zoomControl: false,
        panControl: false,
        addressControl: false,
        fullscreenControl: false,
        linksControl: false,
        enableCloseButton: false,
        clickToGo: false,
        disableDefaultUI: false,
        panoProvider: (panoId: string) => {
          const p =
            panoId === pendingPhoto.id
              ? pendingPhoto
              : photosRef.current.find((x) => x.id === panoId);
          if (!p) return null;
          return {
            location: { pano: p.id },
            copyright: "PanoPublish",
            tiles: {
              tileSize: new window.google.maps.Size(4096, 2048),
              worldSize: new window.google.maps.Size(4096, 2048),
              centerHeading: 0,
              getTileUrl: () => p.file_url,
            },
          };
        },
      });
    } else {
      overlayViewerRef.current.setPano(pendingPhoto.id);
    }

    // Set initial POV for overlay to point back along connection
    try {
      if (active) {
        const calcH = autoAlign ? calcHeading(active, pendingPhoto) : null;
        const geoHeading = calcH !== null ? calcH : ((active.heading || 0) + currentHeading) % 360;
        const initialPixelHeading = geoHeading - (pendingPhoto.heading || 0);
        overlayViewerRef.current.setPov({ heading: initialPixelHeading, pitch: 0 });
      }
    } catch {}
  }, [pendingTo, autoAlign, mapsReady, active]);

  // Top-Right 360 viewer
  useEffect(() => {
    const previewPhoto = photos.find((p) => p.id === rightPendingTo) || active;
    if (!previewPhoto || !rightPanoRef.current || !mapsReady || !window.google?.maps) {
      rightViewerRef.current = null;
      rightPanoContainerRef.current = null;
      return;
    }

    const containerChanged = rightPanoContainerRef.current !== rightPanoRef.current;
    rightPanoContainerRef.current = rightPanoRef.current;

    if (!rightViewerRef.current || containerChanged) {
      rightViewerRef.current = new window.google.maps.StreetViewPanorama(rightPanoRef.current, {
        visible: true,
        pano: previewPhoto.id,
        zoomControl: false,
        panControl: false,
        addressControl: false,
        fullscreenControl: false,
        linksControl: false,
        enableCloseButton: false,
        clickToGo: false,
        disableDefaultUI: true,
        panoProvider: (panoId: string) => {
          const p =
            panoId === previewPhoto.id
              ? previewPhoto
              : photosRef.current.find((x) => x.id === panoId);
          if (!p) return null;
          return {
            location: { pano: p.id },
            copyright: "PanoPublish",
            tiles: {
              tileSize: new window.google.maps.Size(4096, 2048),
              worldSize: new window.google.maps.Size(4096, 2048),
              centerHeading: 0,
              getTileUrl: () => p.file_url,
            },
          };
        },
      });
    } else {
      rightViewerRef.current.setPano(previewPhoto.id);
    }
  }, [rightPendingTo, active?.id, mapsReady]);

  const handleOpenAddCustomHotspot = async () => {
    if (!active) {
      toast.error("Please select a scene first.");
      return;
    }
    const available = photos.filter((p) => p.id !== active.id);
    if (available.length === 0) {
      toast.error("Upload at least 2 scenes to add hotspots.");
      return;
    }

    let camPitch = -10;
    let camYaw = currentHeading;

    if (tour?.type === "custom" && marzViewRef.current) {
      try {
        const pRad = marzViewRef.current.pitch() || 0;
        const yRad = marzViewRef.current.yaw() || 0;
        camPitch = Math.round((pRad * 180) / Math.PI);
        camYaw = Math.round((((yRad * 180) / Math.PI) + 360) % 360);
      } catch {}
    } else if (viewerRef.current) {
      try {
        if (typeof viewerRef.current.getPitch === "function") {
          camPitch = Math.round(viewerRef.current.getPitch() || 0);
        }
        if (typeof viewerRef.current.getYaw === "function") {
          const rawY = viewerRef.current.getYaw() || 0;
          camYaw = Math.round((rawY + 360) % 360);
        }
      } catch {}
    }

    const metaJson = JSON.stringify({
      icon_type: "arrow",
      label: "",
      pitch: camPitch,
    });

    try {
      const { data, error } = await supabase
        .from("connections")
        .insert({
          tour_id: tourId,
          from_photo_id: active.id,
          to_photo_id: available[0].id,
          heading: camYaw,
          spacing: "3m",
          metadata: metaJson,
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success("Hotspot added at center of current view!");
      if (data) {
        setConns((prev) => [...prev, data as Conn]);
      }
      await markConnectionsUnsynced();
      load();
    } catch (err: any) {
      toast.error("Failed to add hotspot: " + err.message);
    }
  };

  const updateHotspotTarget = async (connId: string, toPhotoId: string) => {
    try {
      const { error } = await supabase
        .from("connections")
        .update({ to_photo_id: toPhotoId } as any)
        .eq("id", connId);
      if (error) throw error;
      toast.success("Target scene updated!");
      setConns((prev) =>
        prev.map((c) => (c.id === connId ? { ...c, to_photo_id: toPhotoId } : c)),
      );
      await markConnectionsUnsynced();
    } catch (err: any) {
      toast.error("Failed to update target scene: " + err.message);
    }
  };

  const updateHotspotIcon = async (conn: Conn, iconType: string) => {
    let meta: any = {};
    try {
      if (conn.metadata) meta = JSON.parse(conn.metadata);
    } catch {}
    meta.icon_type = iconType;
    const metaJson = JSON.stringify(meta);

    try {
      const { error } = await supabase
        .from("connections")
        .update({ metadata: metaJson } as any)
        .eq("id", conn.id);
      if (error) throw error;
      toast.success("Hotspot icon updated!");
      setConns((prev) =>
        prev.map((c) => (c.id === conn.id ? { ...c, metadata: metaJson } : c)),
      );
      await markConnectionsUnsynced();
    } catch (err: any) {
      toast.error("Failed to update icon: " + err.message);
    }
  };

  const resetHotspotPosition = async (connId: string) => {
    let camPitch = -10;
    let camYaw = currentHeading;

    if (tour?.type === "custom" && marzViewRef.current) {
      try {
        const pRad = marzViewRef.current.pitch() || 0;
        const yRad = marzViewRef.current.yaw() || 0;
        camPitch = Math.round((pRad * 180) / Math.PI);
        camYaw = Math.round((((yRad * 180) / Math.PI) + 360) % 360);
      } catch {}
    } else if (viewerRef.current) {
      try {
        if (typeof viewerRef.current.getPitch === "function") {
          camPitch = Math.round(viewerRef.current.getPitch() || 0);
        }
        if (typeof viewerRef.current.getYaw === "function") {
          const rawY = viewerRef.current.getYaw() || 0;
          camYaw = Math.round((rawY + 360) % 360);
        }
      } catch {}
    }

    const conn = conns.find((c) => c.id === connId);
    let meta: any = {};
    try {
      if (conn?.metadata) meta = JSON.parse(conn.metadata);
    } catch {}
    meta.pitch = camPitch;
    const metaJson = JSON.stringify(meta);

    try {
      const { error } = await supabase
        .from("connections")
        .update({ heading: camYaw, metadata: metaJson } as any)
        .eq("id", connId);
      if (error) throw error;
      toast.success("Hotspot position reset to view center!");
      setConns((prev) =>
        prev.map((c) =>
          c.id === connId ? { ...c, pitch: camPitch, heading: camYaw, metadata: metaJson } : c,
        ),
      );
      await markConnectionsUnsynced();
    } catch (err: any) {
      toast.error("Failed to reset position: " + err.message);
    }
  };

  const handlePointerDownHotspot = (e: React.PointerEvent, connId: string) => {
    e.stopPropagation();
    setDraggingHotspotId(connId);
  };

  const handlePointerMoveViewer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingHotspotId) return;

    if (tour?.type === "custom" && marzViewRef.current && panoRef.current) {
      try {
        const rect = panoRef.current.getBoundingClientRect();
        const coords = marzViewRef.current.screenToCoordinates({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        if (coords) {
          const newPitch = Math.round((coords.pitch * 180) / Math.PI);
          const newYaw = Math.round((((coords.yaw * 180) / Math.PI) + 360) % 360);

          setConns((prev) =>
            prev.map((c) =>
              c.id === draggingHotspotId ? { ...c, pitch: newPitch, heading: newYaw } : c,
            ),
          );
        }
      } catch (err) {
        console.warn("Drag coords calc error", err);
      }
    } else if (viewerRef.current && typeof viewerRef.current.mouseEventToCoords === "function") {
      try {
        const coords = viewerRef.current.mouseEventToCoords(e.nativeEvent);
        if (coords && coords.length === 2) {
          const newPitch = Math.round(coords[0]);
          const newYaw = (Math.round(coords[1]) + 360) % 360;

          setConns((prev) =>
            prev.map((c) =>
              c.id === draggingHotspotId ? { ...c, pitch: newPitch, heading: newYaw } : c,
            ),
          );
        }
      } catch (err) {
        console.warn("Drag coords calc error", err);
      }
    }
  };

  const handlePointerUpViewer = async () => {
    if (!draggingHotspotId) return;
    const targetId = draggingHotspotId;
    setDraggingHotspotId(null);

    const targetConn = conns.find((c) => c.id === targetId);
    if (targetConn) {
      let meta: any = {};
      try {
        if (targetConn.metadata) meta = JSON.parse(targetConn.metadata);
      } catch {}
      if (targetConn.pitch !== undefined) {
        meta.pitch = targetConn.pitch;
      }
      const metaJson = JSON.stringify(meta);

      try {
        const { error } = await supabase
          .from("connections")
          .update({ heading: targetConn.heading, metadata: metaJson } as any)
          .eq("id", targetId);
        if (error) throw error;
        toast.success("Hotspot position saved!", { duration: 1500 });
        await markConnectionsUnsynced();
      } catch (err: any) {
        toast.error("Failed to save position: " + err.message);
      }
    }
  };

  const handleEditCustomHotspot = (conn: Conn) => {
    setEditingCustomHotspotId(conn.id);
    setCustomHotspotTargetId(conn.to_photo_id);
    let meta: any = {};
    try {
      if (conn.metadata) meta = JSON.parse(conn.metadata);
    } catch {}
    setCustomHotspotIcon(meta.icon_type || "arrow");
    setCustomHotspotLabel(meta.label || "");
    setAddCustomHotspotOpen(true);
  };

  const handleSaveCustomHotspot = async () => {
    if (!active) return;
    if (!customHotspotTargetId) {
      toast.error("Please select a target scene to link.");
      return;
    }

    const metaJson = JSON.stringify({
      icon_type: customHotspotIcon,
      label: customHotspotLabel.trim(),
    });

    try {
      if (editingCustomHotspotId) {
        const { error } = await supabase
          .from("connections")
          .update({
            to_photo_id: customHotspotTargetId,
            heading: currentHeading,
            metadata: metaJson,
          } as any)
          .eq("id", editingCustomHotspotId);
        if (error) throw error;
        toast.success("Hotspot updated!");
      } else {
        const { error } = await supabase.from("connections").insert({
          tour_id: tourId,
          from_photo_id: active.id,
          to_photo_id: customHotspotTargetId,
          heading: currentHeading,
          spacing: "3m",
          metadata: metaJson,
        } as any);
        if (error) throw error;
        toast.success("Hotspot added!");
      }

      await markConnectionsUnsynced();
      setAddCustomHotspotOpen(false);
      setEditingCustomHotspotId(null);
      load();
    } catch (err: any) {
      toast.error("Failed to save hotspot: " + err.message);
    }
  };

  const handleDeleteCustomHotspot = async (connId: string) => {
    try {
      const { error } = await supabase.from("connections").delete().eq("id", connId);
      if (error) throw error;
      toast.success("Hotspot deleted!");
      setConns((prev) => prev.filter((c) => c.id !== connId));
      if (editingCustomHotspotId === connId) {
        setAddCustomHotspotOpen(false);
        setEditingCustomHotspotId(null);
      }
      await markConnectionsUnsynced();
      load();
    } catch (err: any) {
      toast.error("Failed to delete hotspot: " + err.message);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this scene? All linked hotspots will also be removed.",
      )
    )
      return;
    try {
      const p = photos.find((x) => x.id === photoId);
      // Delete referencing connections first
      await supabase
        .from("connections")
        .delete()
        .or(`from_photo_id.eq.${photoId},to_photo_id.eq.${photoId}`);

      if (p && p.filename) {
        try {
          await supabase.storage.from("tour-photos").remove([p.filename]);
        } catch {}
      }
      const { error } = await supabase.from("photos").delete().eq("id", photoId);
      if (error) throw error;

      toast.success("Scene deleted!");
      setPhotos((prev) => prev.filter((x) => x.id !== photoId));
      setConns((prev) =>
        prev.filter((c) => c.from_photo_id !== photoId && c.to_photo_id !== photoId),
      );
      if (active?.id === photoId) {
        setActiveIdx(0);
      }
      await markConnectionsUnsynced();
      load();
    } catch (err: any) {
      toast.error("Failed to delete scene: " + err.message);
    }
  };

  const handleSaveInitialView = async () => {
    if (!active) return;
    try {
      const { error } = await supabase
        .from("photos")
        .update({ heading: currentHeading } as any)
        .eq("id", active.id);
      if (error) throw error;
      toast.success("Initial view direction saved!");
      load();
    } catch (err: any) {
      toast.error("Failed to save initial view: " + err.message);
    }
  };

  const ensureConstellation = async (): Promise<string | null> => {
    let name = activeConstName.trim();
    if (!name) {
      name = tour?.name || "Default Constellation";
      setActiveConstName(name);
    }
    const existing = constellations.find((c) => c.name === name);
    if (existing) return existing.id;
    const { data, error } = await supabase
      .from("constellations")
      .insert({
        user_id: user!.id,
        tour_id: tourId,
        name,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    setConstellations((s) => [...s, data as any]);
    return (data as any).id;
  };

  const removeAllConnections = async (photoId: string) => {
    if (!confirm("Remove this scene from all connections?")) return;
    await supabase
      .from("connections")
      .delete()
      .or(`from_photo_id.eq.${photoId},to_photo_id.eq.${photoId}`);
    await markConnectionsUnsynced();
    toast.success("Scene disconnected");
    load();
  };

  const addConnection = async (toPhoto: Photo) => {
    if (!user || !active) return;
    if (toPhoto.id === active.id) return toast.info("Cannot connect a scene to itself");
    const cid = await ensureConstellation();
    if (!cid) return;

    // Always build connection in the direction of the green line (viewer center)
    const baseHeading = ((active.heading || 0) + currentHeading) % 360;
    const finalHeading = (baseHeading + alignFine[0] - 5 + 360) % 360;
    const geographicHeading = finalHeading;

    let targetLat = toPhoto.latitude;
    let targetLng = toPhoto.longitude;
    const distanceNum = parseInt(spacing.replace("m", "")) || 3;

    // Always recalculate coordinates based on active photo's position, green line direction, and spacing
    if (active.latitude && active.longitude) {
      if (window.google?.maps?.geometry?.spherical) {
        const fromLatLng = new window.google.maps.LatLng(active.latitude, active.longitude);
        const toLatLng = window.google.maps.geometry.spherical.computeOffset(
          fromLatLng,
          distanceNum,
          geographicHeading,
        );
        targetLat = toLatLng.lat();
        targetLng = toLatLng.lng();
      } else {
        return toast.error("Google Maps Geometry library not loaded");
      }
    }

    // Align the next scene's heading to match the same view set in the alignment window
    let toPhotoHeading = toPhoto.heading || 0;
    if (overlayViewerRef.current) {
      const overlayHeading = overlayViewerRef.current.getPov().heading || 0;
      // toPhotoHeading represents the target photo's North correction heading
      toPhotoHeading = (geographicHeading - overlayHeading + 360) % 360;
    }

    // Save recalculated coordinates and heading to Supabase
    const { error: photoErr } = await supabase
      .from("photos")
      .update({
        latitude: targetLat,
        longitude: targetLng,
        heading: toPhotoHeading,
      })
      .eq("id", toPhoto.id);

    if (photoErr) return toast.error("Failed to position target scene: " + photoErr.message);

    // Update local photos state to maintain smooth reactive map rendering
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === toPhoto.id
          ? {
              ...p,
              latitude: targetLat,
              longitude: targetLng,
              heading: toPhotoHeading,
            }
          : p,
      ),
    );

    // Save connection lines (both ways) to connections table
    const { error } = await supabase.from("connections").insert([
      {
        tour_id: tourId,
        from_photo_id: active.id,
        to_photo_id: toPhoto.id,
        constellation_name: activeConstName.trim(),
        heading: geographicHeading,
        spacing,
        is_locked: false,
      },
      {
        tour_id: tourId,
        from_photo_id: toPhoto.id,
        to_photo_id: active.id,
        constellation_name: activeConstName.trim(),
        heading: (geographicHeading + 180) % 360,
        spacing,
        is_locked: false,
      },
    ]);

    if (error) return toast.error("Failed to save connections: " + error.message);

    await markConnectionsUnsynced();
    toast.success("Scene connected and aligned successfully!");
    setPendingTo(null);
    load();
  };

  const onQuickConnect = useCallback(
    async (fromId: string, toId: string) => {
      if (!user) return;
      const fromPhoto = photos.find((p) => p.id === fromId);
      const toPhoto = photos.find((p) => p.id === toId);
      if (!fromPhoto || !toPhoto) return;
      if (fromPhoto.id === toPhoto.id) return;

      // Check if connection already exists
      const exists = conns.some(
        (c) =>
          (c.from_photo_id === fromPhoto.id && c.to_photo_id === toPhoto.id) ||
          (c.from_photo_id === toPhoto.id && c.to_photo_id === fromPhoto.id),
      );
      if (exists) {
        toast.info("Connection already exists between these scenes");
        return;
      }

      const cid = await ensureConstellation();
      if (!cid) return;

      const geographicHeading = calcHeading(fromPhoto, toPhoto) ?? 0;

      // Save connection lines (both ways) to connections table
      const { error } = await supabase.from("connections").insert([
        {
          tour_id: tourId,
          from_photo_id: fromPhoto.id,
          to_photo_id: toPhoto.id,
          constellation_name: activeConstName.trim(),
          heading: geographicHeading,
          spacing,
          is_locked: false,
        },
        {
          tour_id: tourId,
          from_photo_id: toPhoto.id,
          to_photo_id: fromPhoto.id,
          constellation_name: activeConstName.trim(),
          heading: (geographicHeading + 180) % 360,
          spacing,
          is_locked: false,
        },
      ]);

      if (error) {
        toast.error("Failed to save connections: " + error.message);
        return;
      }

      await markConnectionsUnsynced();
      toast.success("Quick connection created successfully!");
      load();
    },
    [
      user,
      photos,
      conns,
      tourId,
      activeConstName,
      spacing,
      ensureConstellation,
      load,
      markConnectionsUnsynced,
    ],
  );

  const onDeleteConnection = useCallback(async () => {
    if (!selectedConnection) return;
    const { fromId, toId } = selectedConnection;
    const fromP = photos.find((p) => p.id === fromId);
    const toP = photos.find((p) => p.id === toId);
    const fromName = fromP ? fromP.filename || `Scene ${photos.indexOf(fromP)}` : `Scene ${fromId}`;
    const toName = toP ? toP.filename || `Scene ${photos.indexOf(toP)}` : `Scene ${toId}`;

    if (
      !confirm(`Are you sure you want to delete the connection between ${fromName} and ${toName}?`)
    ) {
      return;
    }

    const tid = toast.loading("Deleting connection...");
    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabase.from("connections").delete().eq("from_photo_id", fromId).eq("to_photo_id", toId),
      supabase.from("connections").delete().eq("from_photo_id", toId).eq("to_photo_id", fromId),
    ]);

    if (err1 || err2) {
      toast.error("Failed to delete connection", { id: tid });
      return;
    }

    await markConnectionsUnsynced();
    toast.success("Connection deleted successfully", { id: tid });
    setSelectedConnection(null);
    load();
  }, [selectedConnection, photos, load, markConnectionsUnsynced]);

  const handleSaveConnectionMetadata = async () => {
    if (!selectedConnection || !activeConnObj) return;
    setSavingHotspot(true);
    const updatedMetadata = JSON.stringify({
      icon_type: hotspotIcon,
      label: hotspotLabel,
    });

    const { error } = await supabase
      .from("connections")
      .update({ metadata: updatedMetadata } as any)
      .eq("id", activeConnObj.id);

    setSavingHotspot(false);
    if (error) {
      toast.error("Failed to save hotspot settings: " + error.message);
    } else {
      toast.success("Hotspot settings updated!");
      load();
    }
  };

  const onConnectionSelect = useCallback((fromId: string | null, toId: string | null) => {
    if (fromId === null || toId === null) {
      setSelectedConnection(null);
    } else {
      setSelectedConnection({ fromId, toId });
    }
  }, []);

  const miniMap = usePanoramaMap(mapDivRef, {
    nodes: mapNodes,
    connections: mapConnections,
    activeNodeId: active?.id ?? null,
    selectedConnection: selectedConnection,
    onNodeSelect: (id) => {
      setSelectedConnection(null);
      handleNodeSelect(id);
    },
    onNodeMove: handleNodeMove,
    onNodeRotate: handleNodeRotate,
    onQuickConnect: onQuickConnect,
    onConnectionSelect: onConnectionSelect,
    centerLat: photoCenter.lat,
    centerLng: photoCenter.lng,
    mapsReady: mapsReady,
  });

  const modalMap = usePanoramaMap(modalMapDivRef, {
    nodes: mapNodes,
    connections: mapConnections,
    activeNodeId: active?.id ?? null,
    selectedConnection: selectedConnection,
    onNodeSelect: (id) => {
      setSelectedConnection(null);
      handleNodeSelect(id);
    },
    onNodeMove: handleNodeMove,
    onNodeRotate: handleNodeRotate,
    onQuickConnect: onQuickConnect,
    onConnectionSelect: onConnectionSelect,
    centerLat: photoCenter.lat,
    centerLng: photoCenter.lng,
    mapsReady: mapsReady && expandMap,
  });

  // Synchronize modes
  useEffect(() => {
    miniMap.setMode(mapMode);
    modalMap.setMode(mapMode);
  }, [mapMode, miniMap, modalMap]);

  // Synchronize map types
  useEffect(() => {
    if (miniMap.mapInstance.current) {
      miniMap.mapInstance.current.setMapTypeId(mapType);
    }
    if (modalMap.mapInstance.current) {
      modalMap.mapInstance.current.setMapTypeId(mapType);
    }
  }, [mapType, miniMap.mapInstance, modalMap.mapInstance]);

  // Center on active node change if in view mode
  useEffect(() => {
    if (active?.id) {
      miniMap.centerOnNode(active.id);
      modalMap.centerOnNode(active.id);
    }
  }, [active?.id, miniMap, modalMap]);

  // Automatically select the next unconnected photo for alignment preview
  useEffect(() => {
    const connectedIds = new Set(conns.flatMap((c) => [c.from_photo_id, c.to_photo_id]));

    // If we don't have a pending photo, or if the current pending photo has already been connected,
    // let's find the next available unconnected photo.
    const isCurrentPendingConnected = rightPendingTo ? connectedIds.has(rightPendingTo) : false;
    const needsNext =
      !rightPendingTo || isCurrentPendingConnected || (active && rightPendingTo === active.id);

    if (needsNext && photos.length > 0) {
      // Filter out photos that are already connected and the active photo
      const candidates = photos.filter(
        (p) => !connectedIds.has(p.id) && (active ? p.id !== active.id : true),
      );

      if (candidates.length > 0) {
        // Prioritize candidates on the same active floor/island
        const sameFloorCandidates = candidates.filter((p) => {
          const pIsland = p.island_id || "unassigned";
          const activeFloor = activeIslandId || "unassigned";
          return pIsland === activeFloor;
        });

        if (sameFloorCandidates.length > 0) {
          setRightPendingTo(sameFloorCandidates[0].id);
        } else {
          setRightPendingTo(candidates[0].id);
        }
      } else {
        // No unconnected photos left
        setRightPendingTo(null);
      }
    }
  }, [photos, conns, active?.id, activeIslandId, rightPendingTo]);

  const undoLast = async () => {
    const last = [...conns].sort((a, b) => (a.id < b.id ? 1 : -1))[0];
    if (!last) return;
    await supabase.from("connections").delete().eq("id", last.id);
    await markConnectionsUnsynced();
    toast.success("Undone");
    load();
  };

  const handleReassignIsland = async (photoId: string, islandId: string | null) => {
    const { error } = await supabase
      .from("photos")
      .update({ island_id: islandId })
      .eq("id", photoId);
    if (error) return toast.error(error.message);
    toast.success("Scene reassigned");
    load();
  };

  const setNorth = async () => {
    if (!active) return;
    const newHeading = (360 - currentHeading) % 360;

    setPhotos((prev) => prev.map((p) => (p.id === active.id ? { ...p, heading: newHeading } : p)));

    const { error } = await supabase
      .from("photos")
      .update({ heading: newHeading })
      .eq("id", active.id);
    if (error) {
      toast.error("Failed to save North direction");
    } else {
      await markConnectionsUnsynced();
      toast.success(`North set`);
    }
  };

  const fullscreenPano = () => {
    panoRef.current?.requestFullscreen?.();
  };

  const zoomPano = (delta: number) => {
    if (!viewerRef.current) return;
    try {
      const z = viewerRef.current.getZoom() || 1;
      viewerRef.current.setZoom(Math.max(0, z + (delta > 0 ? -1 : 1)));
    } catch {}
  };

  const activeConns = conns.filter(
    (c) => c.from_photo_id === active?.id || c.to_photo_id === active?.id,
  );
  const connectedIds = new Set(conns.flatMap((c) => [c.from_photo_id, c.to_photo_id]));
  const currentGeographicHeading = ((active?.heading || 0) + currentHeading) % 360;
  const displayHeading = currentGeographicHeading.toFixed(2);

  const activeFloorName = useMemo(() => {
    if (activeIslandId === "unassigned") return "Unassigned Floor";
    const found = islands.find((is) => is.id === activeIslandId);
    return found ? found.name : "Select level";
  }, [activeIslandId, islands]);

  const previewFloors = useMemo(() => {
    const list = islands.map((is) => ({ id: is.id, name: is.name }));
    const hasUnassigned = photos.some((p) => !p.island_id);
    if (hasUnassigned) {
      list.push({ id: "unassigned", name: "Unassigned Floor" });
    }
    return list;
  }, [islands, photos]);

  if (previewMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Floating Header */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 text-white shadow-2xl">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase">
              {tour?.name || "Virtual Tour Preview"}
            </h1>
            <p className="text-[10px] text-white/50">
              Viewing active scene: {active?.filename || "Scene"}
            </p>
          </div>
        </div>

        {/* Floating Level Selector */}
        <div className="absolute top-20 left-4 z-20 flex flex-col gap-1.5">
          <div className="text-[10px] text-white/40 uppercase font-black tracking-widest pl-1">
            Floor / Level
          </div>

          <div className="relative text-left">
            <button
              onClick={() => setLevelDropdownOpen(!levelDropdownOpen)}
              className="min-w-[160px] bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-bold shadow-2xl flex items-center justify-between gap-2 transition-all duration-200 active:scale-98"
            >
              <span>{activeFloorName}</span>
              <span
                className={`transform transition-transform duration-200 text-[10px] ${levelDropdownOpen ? "rotate-180" : ""}`}
              >
                ▼
              </span>
            </button>

            {levelDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-full bg-black/80 backdrop-blur-md border border-white/10 rounded-xl py-1.5 shadow-2xl flex flex-col gap-0.5 z-30 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {previewFloors.length === 0 ? (
                  <div className="px-3 py-1.5 text-[11px] text-white/40 italic">
                    No levels created
                  </div>
                ) : (
                  previewFloors.map((floor) => {
                    const isSelected = activeIslandId === floor.id;
                    return (
                      <button
                        key={floor.id}
                        onClick={() => {
                          handleExpandIsland(floor.id);
                          setLevelDropdownOpen(false);
                        }}
                        className={`text-left px-3 py-2 text-xs font-semibold w-full transition-colors flex items-center justify-between ${
                          isSelected
                            ? "bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-500"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span>{floor.name}</span>
                        {isSelected && <span className="text-emerald-400 text-[10px]">✓</span>}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Standalone Street View Panorama Viewer */}
        <div className="flex-1 relative bg-black">
          <div ref={panoRef} className="absolute inset-0" />
          {!active && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
              Select a scene to preview
            </div>
          )}

          {/* Zoom & Fullscreen Controls */}
          <div className="absolute right-4 top-4 flex flex-col gap-2 z-20">
            <button
              onClick={fullscreenPano}
              className="h-9 w-9 bg-black/60 hover:bg-black/80 text-white rounded-xl shadow flex items-center justify-center backdrop-blur border border-white/10 transition-transform active:scale-95"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => zoomPano(-10)}
              className="h-9 w-9 bg-black/60 hover:bg-black/80 text-white rounded-xl shadow flex items-center justify-center backdrop-blur border border-white/10 transition-transform active:scale-95 mt-2"
              title="Zoom In"
            >
              <ZoomIn className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => zoomPano(10)}
              className="h-9 w-9 bg-black/60 hover:bg-black/80 text-white rounded-xl shadow flex items-center justify-center backdrop-blur border border-white/10 transition-transform active:scale-95"
              title="Zoom Out"
            >
              <ZoomOut className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Compass Radar */}
          <div className="absolute bottom-4 right-4 h-16 w-16 rounded-full bg-black/70 border-2 border-white/30 flex items-center justify-center shadow-lg backdrop-blur z-20">
            <Navigation
              className="h-8 w-8 text-red-500 fill-red-500 drop-shadow"
              style={{ transform: `rotate(${-currentGeographicHeading}deg)` }}
            />
          </div>

          {/* Connected hotspots */}
          {active &&
            activeConns
              .filter((c) => c.from_photo_id === active.id)
              .map((c) => {
                const hotspotPixelHeading = (c.heading - (active?.heading || 0) + 360) % 360;
                const offset = ((hotspotPixelHeading - currentHeading + 540) % 360) - 180;
                if (Math.abs(offset) > 60) return null;

                return (
                  <div
                    key={c.id}
                    className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden"
                    style={{ transform: `translate(${offset * 5}px, 0)` }}
                  >
                    <div className="h-full w-0.5 bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.8)] absolute" />
                    <div
                      className="relative z-10 w-24 h-12 perspective-[100px] flex flex-col gap-1 items-center justify-center cursor-pointer pointer-events-auto hover:scale-110 transition-transform"
                      onClick={() => {
                        const idx = photos.findIndex((p) => p.id === c.to_photo_id);
                        if (idx !== -1) setActiveIdx(idx);
                      }}
                    >
                      <div className="w-16 h-16 border-t-[10px] border-l-[10px] border-white origin-center rotate-45 transform skew-x-12 translate-y-6 shadow-xl opacity-90" />
                      <div className="w-16 h-16 border-t-[10px] border-l-[10px] border-white origin-center rotate-45 transform skew-x-12 -translate-y-2 shadow-xl opacity-90" />
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Floating Close Button */}
        <div className="absolute bottom-4 left-4 z-20">
          <Button
            onClick={() => window.close()}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-2xl transition-all duration-200 hover:scale-102"
          >
            <X className="h-4 w-4" /> Close Preview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="Build Connections"
      breadcrumbs={[
        { label: "Tours", to: "/tours" },
        { label: tour?.name ?? "Tour" },
        { label: "Build Connections" },
      ]}
    >
      <SEO
        title="Build Connections"
        description="Connect virtual tour panoramas and build Street View walkthrough paths."
        noIndex={true}
      />
      <TourStepsNav
        tourId={tourId}
        activeTab="connections"
        tourType={tour?.type ?? undefined}
        onSave={async () => {
          const tid = toast.loading("Saving tour changes...");
          try {
            await load();
            toast.success("Tour saved successfully!", { id: tid });
          } catch (e: any) {
            toast.error("Failed to save tour: " + e.message, { id: tid });
          }
        }}
      />

      {tour?.type === "custom" ? (
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start animate-in fade-in duration-200">
          {/* LEFT COLUMN: Panoramas / Scenes List */}
          <div className="rounded-2xl border bg-card flex flex-col h-[750px] overflow-hidden shadow-sm">
            <div className="bg-slate-900 text-white p-3.5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Panorama List
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Select a scene to configure</p>
              </div>
              <span className="bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {photos.length} Scenes
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-slate-50/50">
              {photos.map((p, idx) => {
                const isActive = activeIdx === idx;
                const activeHotspotsCount = conns.filter((c) => c.from_photo_id === p.id).length;
                return (
                  <div
                    key={p.id}
                    onClick={() => setActiveIdx(idx)}
                    className={`rounded-xl border p-2 flex items-center gap-3 cursor-pointer transition-all duration-200 group ${
                      isActive
                        ? "bg-white border-[#0277bd] ring-2 ring-[#0277bd]/25 shadow-md scale-[1.01]"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs"
                    }`}
                  >
                    <div className="w-16 h-12 rounded-lg bg-slate-100 overflow-hidden relative shrink-0 border border-slate-200">
                      <img
                        src={p.file_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute top-0.5 left-0.5 bg-slate-900/90 text-white text-[9px] font-mono font-bold px-1 rounded shadow">
                        {String(idx).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {p.filename || `Scene ${idx}`}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                            activeHotspotsCount > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {activeHotspotsCount} {activeHotspotsCount === 1 ? "hotspot" : "hotspots"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(p.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Scene"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {isActive && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0277bd] shrink-0 shadow-sm" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: 360° Panorama Viewer + Interactive Hotspot Builder */}
          <div className="rounded-2xl border bg-card flex flex-col h-[750px] overflow-hidden shadow-sm relative">
            {/* Top Toolbar */}
            <div className="bg-slate-900 text-white p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Active Scene:
                </span>
                <span className="text-xs font-bold bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-sky-400">
                  {active ? active.filename || `Scene ${activeIdx}` : "None Selected"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleOpenAddCustomHotspot}
                  disabled={!active || photos.length < 2}
                  className="bg-[#0277bd] hover:bg-[#0266a1] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md border-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add Hotspot
                </Button>

                <Button
                  onClick={handleSaveInitialView}
                  disabled={!active}
                  variant="outline"
                  className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="h-4 w-4 text-emerald-400" /> Set Initial View
                </Button>
              </div>
            </div>

            {/* Interactive 360° Panorama Viewer */}
            <div className="flex-1 relative bg-black">
              <div
                ref={panoRef}
                className="absolute inset-0 select-none cursor-grab active:cursor-grabbing"
                onPointerMove={handlePointerMoveViewer}
                onPointerUp={handlePointerUpViewer}
              />

              {!active && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 text-sm z-20 bg-slate-950 gap-2.5 p-4 text-center select-none">
                  <MousePointer2 className="h-8 w-8 text-sky-400 animate-bounce" />
                  <div className="font-bold text-white text-base">Select a scene from the left list</div>
                  <p className="text-xs text-white/50 max-w-[280px]">
                    Choose a panorama to view in 360° and add interactive hotspots.
                  </p>
                </div>
              )}

              {/* Connected Hotspots overlay on 360 viewer */}
              {active &&
                conns
                  .filter((c) => c.from_photo_id === active.id)
                  .map((c) => {
                    const targetPhoto = photos.find((p) => p.id === c.to_photo_id);
                    let meta: any = {};
                    try {
                      if (c.metadata) meta = JSON.parse(c.metadata);
                    } catch {}

                    const containerW = panoRef.current?.clientWidth || 800;
                    const containerH = panoRef.current?.clientHeight || 600;

                    const coords = getHotspotScreenCoords(
                      c.heading,
                      meta.pitch ?? c.pitch ?? -10,
                      currentPov,
                      active?.heading || 0,
                      containerW,
                      containerH,
                    );

                    if (!coords.visible) return null;

                    const iconType = meta.icon_type || "arrow";
                    const labelText = meta.label || targetPhoto?.filename || "Linked Scene";
                    const isTargetPopoverOpen = editingTargetPopoverId === c.id;
                    const isIconPopoverOpen = editingIconPopoverId === c.id;
                    const isDragging = draggingHotspotId === c.id;

                    return (
                      <div
                        key={c.id}
                        className="absolute pointer-events-auto z-20 flex flex-col items-center select-none"
                        style={{
                          left: `${coords.x}px`,
                          top: `${coords.y}px`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        {/* Tooltip badge floating cleanly above hotspot */}
                        <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md border border-white/20 shadow-2xl whitespace-nowrap z-30 pointer-events-none">
                          {labelText}
                        </div>

                        {/* Hotspot Outer Container with Quick Action Control Ring */}
                        <div className="relative flex items-center justify-center">
                          {/* Quick Action Floating Controls around the hotspot (Screenshot 2 style) */}
                          <div className="absolute inset-0 pointer-events-none">
                            {/* 1. Move to Target Scene (Top Right) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetIdx = photos.findIndex((p) => p.id === c.to_photo_id);
                                if (targetIdx !== -1) setActiveIdx(targetIdx);
                              }}
                              className="absolute -top-3.5 -right-3.5 h-7 w-7 rounded-full bg-slate-900/95 hover:bg-emerald-600 text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20"
                              title="Move to target scene"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>

                            {/* 2. Reset Position (Top Left) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                resetHotspotPosition(c.id);
                              }}
                              className="absolute -top-3.5 -left-3.5 h-7 w-7 rounded-full bg-slate-900/95 hover:bg-amber-600 text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20"
                              title="Reset position to view center"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>

                            {/* 3. Delete Hotspot (Bottom Left) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomHotspot(c.id);
                              }}
                              className="absolute -bottom-3.5 -left-3.5 h-7 w-7 rounded-full bg-slate-900/95 hover:bg-red-600 text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20"
                              title="Delete hotspot"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            {/* 4. Edit Target Scene (Bottom Right) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingIconPopoverId(null);
                                setEditingTargetPopoverId(isTargetPopoverOpen ? null : c.id);
                              }}
                              className={`absolute -bottom-3.5 -right-3.5 h-7 w-7 rounded-full text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20 ${
                                isTargetPopoverOpen ? "bg-sky-600" : "bg-slate-900/95 hover:bg-sky-600"
                              }`}
                              title="Edit target scene"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>

                            {/* 5. Change Icon Type (Bottom Center) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTargetPopoverId(null);
                                setEditingIconPopoverId(isIconPopoverOpen ? null : c.id);
                              }}
                              className={`absolute -bottom-7 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20 ${
                                isIconPopoverOpen ? "bg-purple-600" : "bg-slate-900/95 hover:bg-purple-600"
                              }`}
                              title="Change icon style"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Main Center Hotspot Circle (Draggable Handle) */}
                          <div
                            onPointerDown={(e) => handlePointerDownHotspot(e, c.id)}
                            className={`w-12 h-12 rounded-full bg-[#0277bd] text-white flex items-center justify-center border-2 border-white shadow-2xl transition-transform cursor-grab active:cursor-grabbing ${
                              isDragging ? "scale-125 bg-sky-400 ring-4 ring-sky-300/50" : "hover:scale-110"
                            }`}
                            title="Click & drag cursor to move hotspot"
                          >
                            {iconType === "door" && <span className="text-xl">🚪</span>}
                            {iconType === "arrow" && <ArrowUp className="h-6 w-6" />}
                            {iconType === "double-arrow" && <span className="text-xl">⇡</span>}
                            {iconType === "chevron" && <span className="text-xl">⏫</span>}
                            {iconType === "info" && <Info className="h-6 w-6" />}
                            {iconType === "help" && <HelpCircle className="h-6 w-6" />}
                            {iconType === "cart" && <span className="text-xl">🛒</span>}
                            {iconType === "pin" && <MapPin className="h-6 w-6" />}
                            {iconType === "camera" && <Camera className="h-6 w-6" />}
                            {iconType === "eye" && <Eye className="h-6 w-6" />}
                          </div>
                        </div>

                        {/* Screenshot-2 "Select target scene" Popover Box */}
                        {isTargetPopoverOpen && (
                          <div
                            className="absolute left-1/2 bottom-full mb-8 -translate-x-1/2 bg-slate-900/95 backdrop-blur border border-slate-700 text-white rounded-xl shadow-2xl p-3 w-64 z-50 pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                              <span className="text-xs font-bold text-slate-200">Select target scene</span>
                              <button
                                type="button"
                                onClick={() => setEditingTargetPopoverId(null)}
                                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                              {photos
                                .filter((p) => p.id !== active.id)
                                .map((p, idx) => {
                                  const isSelected = c.to_photo_id === p.id;
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={async () => {
                                        await updateHotspotTarget(c.id, p.id);
                                        setEditingTargetPopoverId(null);
                                      }}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                                        isSelected
                                          ? "bg-[#0277bd] text-white font-bold"
                                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                      }`}
                                    >
                                      <span className="truncate">{p.filename || `Scene ${idx}`}</span>
                                      {isSelected && <span className="text-[10px] text-sky-200">✓</span>}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* Inline "Change Icon Type" Popover Box */}
                        {isIconPopoverOpen && (
                          <div
                            className="absolute left-1/2 bottom-full mb-8 -translate-x-1/2 bg-slate-900/95 backdrop-blur border border-slate-700 text-white rounded-xl shadow-2xl p-2.5 w-56 z-50 pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                              <span className="text-xs font-bold text-slate-200">Change Icon</span>
                              <button
                                type="button"
                                onClick={() => setEditingIconPopoverId(null)}
                                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-4 gap-1.5">
                              {[
                                { id: "arrow", icon: "⬆️", label: "Forward" },
                                { id: "door", icon: "🚪", label: "Door" },
                                { id: "double-arrow", icon: "⇡", label: "Double" },
                                { id: "chevron", icon: "⏫", label: "Chevron" },
                                { id: "info", icon: "ℹ️", label: "Info" },
                                { id: "help", icon: "❓", label: "Help" },
                                { id: "cart", icon: "🛒", label: "Cart" },
                                { id: "pin", icon: "📍", label: "Pin" },
                              ].map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={async () => {
                                    await updateHotspotIcon(c, item.id);
                                    setEditingIconPopoverId(null);
                                  }}
                                  className={`p-1.5 rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all ${
                                    iconType === item.id
                                      ? "bg-[#0277bd] text-white"
                                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                                  }`}
                                >
                                  <span className="text-base">{item.icon}</span>
                                  <span className="text-[8px] truncate">{item.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
            </div>

            {/* Bottom Panel: Hotspots configured for this active scene */}
            {active && (
              <div className="bg-slate-900 border-t border-slate-800 p-3 shrink-0 z-20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Hotspots for this scene ({conns.filter((c) => c.from_photo_id === active.id).length})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Click any hotspot card to edit or delete
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto pr-1">
                  {conns
                    .filter((c) => c.from_photo_id === active.id)
                    .map((c) => {
                      const targetPhoto = photos.find((p) => p.id === c.to_photo_id);
                      let meta: any = {};
                      try {
                        if (c.metadata) meta = JSON.parse(c.metadata);
                      } catch {}
                      const iconType = meta.icon_type || "arrow";
                      const labelText = meta.label || targetPhoto?.filename || "Linked Scene";

                      return (
                        <div
                          key={c.id}
                          className="bg-slate-800 border border-slate-700 hover:border-slate-600 text-white rounded-xl p-2 flex items-center gap-2.5 text-xs shadow-sm cursor-pointer transition-colors"
                          onClick={() => handleEditCustomHotspot(c)}
                        >
                          <div className="w-7 h-7 rounded-lg bg-[#0277bd] text-white flex items-center justify-center shrink-0">
                            {iconType === "door" && <span className="text-sm">🚪</span>}
                            {iconType === "arrow" && <ArrowUp className="h-4 w-4" />}
                            {iconType === "double-arrow" && <span className="text-sm">⇡</span>}
                            {iconType === "chevron" && <span className="text-sm">⏫</span>}
                            {iconType === "info" && <Info className="h-4 w-4" />}
                            {iconType === "help" && <HelpCircle className="h-4 w-4" />}
                            {iconType === "cart" && <span className="text-sm">🛒</span>}
                            {iconType === "pin" && <MapPin className="h-4 w-4" />}
                            {iconType === "camera" && <Camera className="h-4 w-4" />}
                            {iconType === "eye" && <Eye className="h-4 w-4" />}
                          </div>

                          <div className="flex-1 min-w-[120px]">
                            <div className="font-bold text-white text-[11px] truncate">
                              {labelText}
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">
                              Target: {targetPhoto?.filename || "Scene"}
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomHotspot(c.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete Hotspot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}

                  {conns.filter((c) => c.from_photo_id === active.id).length === 0 && (
                    <div className="text-xs text-slate-400 italic py-1">
                      No hotspots added yet. Face viewer in desired direction and click <b>"+ Add Hotspot"</b>.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[28fr_44fr_28fr] gap-3">
          {/* LEFT PANEL */}
          <div className="rounded-xl border bg-card flex flex-col h-[700px]">
          {/* Mini map */}
          <div className="relative h-[250px] flex-shrink-0 bg-muted overflow-hidden">
            <div ref={mapDivRef} className="w-full h-full" />
            {!MAPS_KEY && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-3 text-center">
                Add VITE_GOOGLE_MAPS_API_KEY to enable map.
              </div>
            )}
            {mapsReady && (
              <MapToolbar
                mapType={mapType}
                mode={mapMode}
                onMapTypeChange={setMapType}
                onModeChange={setMapMode}
                onLockAll={async () => {
                  await supabase
                    .from("connections")
                    .update({ is_locked: true })
                    .eq("tour_id", tourId);
                  load();
                }}
                onUnlockAll={async () => {
                  await supabase
                    .from("connections")
                    .update({ is_locked: false })
                    .eq("tour_id", tourId);
                  load();
                }}
                onFitBounds={miniMap.fitBounds}
                onCenterBusiness={() => {
                  if (tour?.latitude)
                    miniMap.mapInstance.current?.panTo({ lat: tour.latitude, lng: tour.longitude });
                }}
                onHelp={() => setHelpOpen(true)}
                onExpand={() => setExpandMap(true)}
                showLabels={showLabels}
                onToggleLabels={() => setShowLabels(!showLabels)}
                autoAlign={autoAlign}
                onToggleAutoAlign={() => setAutoAlign(!autoAlign)}
                onDeleteConnection={onDeleteConnection}
                canDeleteConnection={!!selectedConnection}
              />
            )}
          </div>

          {selectedConnection && activeConnObj && (
            <div className="mx-2 my-2 bg-slate-900 text-white p-4 rounded-xl border border-slate-700/60 shadow-lg space-y-3 shrink-0 animate-in slide-in-from-top duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Hotspot Settings
                </h4>
                <button
                  onClick={() => setSelectedConnection(null)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="text-[10px] text-slate-400 font-mono">
                Direction: Scene {photos.findIndex((p) => p.id === selectedConnection.fromId)} ➔ Scene {photos.findIndex((p) => p.id === selectedConnection.toId)}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                  Hotspot Icon
                </label>
                <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                  {[
                    { id: "arrow", label: "Arrow" },
                    { id: "double-arrow", label: "Double" },
                    { id: "chevron", label: "Chevron" },
                    { id: "info", label: "Info" },
                    { id: "help", label: "Help" },
                    { id: "cart", label: "Cart" },
                    { id: "pin", label: "Pin" },
                    { id: "door", label: "Door" },
                    { id: "camera", label: "Camera" },
                    { id: "eye", label: "Eye" }
                  ].map((icon) => {
                    const isSelected = hotspotIcon === icon.id;
                    return (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => setHotspotIcon(icon.id)}
                        className={`py-1 rounded text-[9px] font-bold text-center border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#0277bd] text-white border-[#0288d1]"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                        }`}
                        title={icon.label}
                      >
                        <span className="capitalize">{icon.id.replace("-", " ")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block font-bold">
                  Hover Label / Tooltip
                </label>
                <Input
                  className="bg-slate-950 border-slate-850 text-white text-xs h-9 focus-visible:ring-[#0277bd]"
                  placeholder="e.g. Enter Living Room"
                  value={hotspotLabel}
                  onChange={(e) => setHotspotLabel(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleSaveConnectionMetadata}
                  disabled={savingHotspot}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-8 text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {savingHotspot ? "Saving..." : "Save Settings"}
                </Button>
                <Button
                  onClick={onDeleteConnection}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold h-8 text-xs px-3 rounded-lg transition-colors cursor-pointer border-0"
                  title="Delete Connection"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-2 space-y-2.5">
            {/* Connected scenes grouped by island */}
            {[...islands, { id: "unassigned", name: "Unassigned", order_index: 999 }].map(
              (island) => {
                const islandPhotos = photos.filter((p) =>
                  island.id === "unassigned" ? !p.island_id : p.island_id === island.id,
                );
                const connectedIslandPhotos = islandPhotos.filter(
                  (p) => connectedIds.has(p.id) || (active && p.id === active.id),
                );
                if (connectedIslandPhotos.length === 0) return null;

                const isOpen = islandOpen[island.id];

                return (
                  <div
                    key={island.id}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-all duration-200"
                  >
                    <div
                      className="bg-slate-900 text-white px-3 py-2.5 flex items-center justify-between cursor-pointer text-xs font-semibold sticky top-0 z-10 hover:bg-slate-800 transition-colors"
                      onClick={() => handleToggleIsland(island.id, !!isOpen)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center border border-slate-700">
                          {isOpen ? (
                            <Minus className="h-3 w-3 text-slate-300" />
                          ) : (
                            <Plus className="h-3 w-3 text-slate-300" />
                          )}
                        </div>
                        <span className="font-bold tracking-wide uppercase">{island.name}</span>
                        <span className="text-[10px] bg-blue-600 text-white font-extrabold px-1.5 py-0.5 rounded-full border border-blue-500 shadow-sm ml-1.5">
                          {connectedIslandPhotos.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Fit map bounds to these specific photos
                            const targetMap = expandMap
                              ? modalMap.mapInstance.current
                              : miniMap.mapInstance.current;
                            if (targetMap && connectedIslandPhotos.length > 0) {
                              const bounds = new window.google.maps.LatLngBounds();
                              connectedIslandPhotos.forEach((p) => {
                                if (p.latitude && p.longitude) {
                                  bounds.extend({ lat: p.latitude, lng: p.longitude });
                                }
                              });
                              targetMap.fitBounds(bounds, 40);
                              toast.info(`Centered on ${island.name}`);
                            }
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Focus Map on Floor"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="p-2 space-y-2 bg-slate-50/70 border-t border-slate-100">
                        {connectedIslandPhotos.map((p) => {
                          const idx = photos.findIndex((x) => x.id === p.id);
                          const isActive = idx === activeIdx;
                          return (
                            <div
                              key={p.id}
                              onClick={() => setActiveIdx(idx)}
                              className={`relative rounded-xl bg-white overflow-hidden border cursor-pointer transition-all duration-300 group ${
                                isActive
                                  ? "border-orange-500 ring-2 ring-orange-500/25 shadow-md scale-[1.01]"
                                  : "border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm"
                              }`}
                            >
                              <div className="aspect-[16/9] relative bg-slate-100 w-full overflow-hidden">
                                <img
                                  src={p.file_url}
                                  alt=""
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />

                                {/* Left side node index identifier */}
                                <div className="absolute top-2 left-2 rounded-lg bg-slate-900/90 text-white font-extrabold px-2 py-0.5 text-xs shadow-md border border-slate-700/50">
                                  {idx}
                                </div>

                                {/* Disconnect/Remove connections button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeAllConnections(p.id);
                                  }}
                                  className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-200 shadow-md opacity-0 group-hover:opacity-100"
                                  title="Delete Scene Connections"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>

                                {/* GPS warning */}
                                {(p.latitude == null || p.latitude === 0) && (
                                  <div className="absolute bottom-2 left-2 rounded bg-amber-500 text-white font-bold px-2 py-0.5 text-[9px] flex items-center gap-1.5 shadow border border-amber-400">
                                    <AlertTriangle className="h-3 w-3 animate-bounce" /> NO GPS
                                  </div>
                                )}

                                {/* Active Pulse overlay */}
                                {isActive && (
                                  <div className="absolute bottom-2 right-2 rounded bg-orange-600 text-white font-black px-2 py-0.5 text-[9px] flex items-center gap-1 shadow border border-orange-500 tracking-wider uppercase animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>{" "}
                                    ACTIVE
                                  </div>
                                )}
                              </div>

                              {/* Dropdown controls inside scene card */}
                              <div
                                className="p-2 border-t border-slate-100 bg-white flex items-center justify-between gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                                  <span className="uppercase">Floor:</span>
                                  <select
                                    value={p.island_id || "unassigned"}
                                    onChange={async (e) => {
                                      const val =
                                        e.target.value === "unassigned" ? null : e.target.value;
                                      await handleReassignIsland(p.id, val);
                                    }}
                                    className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 outline-none font-bold text-slate-700 cursor-pointer transition-colors max-w-[125px]"
                                  >
                                    <option value="unassigned">Unassigned</option>
                                    {islands.map((i) => (
                                      <option key={i.id} value={i.id}>
                                        {i.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              },
            )}
            {photos.filter((p) => connectedIds.has(p.id)).length === 0 && (
              <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2.5">
                  <Plus className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-600 mb-1">
                  No connected scenes to display.
                </p>
                <p className="text-[10px] text-slate-400 max-w-[200px]">
                  Connect nodes by selecting a target on the right and clicking the map plus button.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CENTER PANEL */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col h-[700px]">
          <div className="bg-[#689f38] text-white px-3 py-1.5 text-xs flex items-center justify-between shadow z-10">
            <span className="font-mono font-medium">H: {displayHeading}</span>
            <button
              onClick={setNorth}
              className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded font-bold tracking-wide"
            >
              <Navigation className="h-3 w-3 fill-white" /> SET NORTH
            </button>
          </div>

          <div className="relative flex-1 bg-black">
            <div ref={panoRef} className="absolute inset-0" />
            {active && (
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-green-500 shadow-[0_0_8px_#22c55e] z-10 pointer-events-none" />
            )}
            {!active && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 text-sm z-20 bg-slate-950 gap-2.5 p-4 text-center select-none">
                <MousePointer2 className="h-8 w-8 text-white/40 animate-bounce" />
                <div className="font-bold text-white text-base">No active scene selected</div>
                <p className="text-xs text-white/50 max-w-[280px]">
                  Select a scene from the right-side list and click <b>"Set Active"</b> to start
                  building walkthrough connections.
                </p>
              </div>
            )}

            {pendingTo && (
              <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-green-500 shadow-[0_0_8px_#22c55e] z-0 pointer-events-none" />
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[95%] max-w-xl rounded-lg shadow-2xl pointer-events-auto flex flex-col z-20 border border-[#689f38]/30">
                  <div className="flex items-center justify-between px-3 py-2.5 bg-[#689f38] rounded-t-lg border-b border-[#558b2f]/30 text-white gap-3">
                    <div className="w-[28%] flex items-center">
                      <Slider
                        value={opacity}
                        onValueChange={setOpacity}
                        max={100}
                        step={1}
                        className="w-full cursor-pointer [&_[role=slider]]:bg-white [&_[role=slider]]:border-slate-200"
                      />
                    </div>
                    <div
                      className="flex items-center gap-1.5 text-xs font-bold select-none cursor-help text-white/90 hover:text-white transition-colors"
                      title="Spacing between your constellations as they are added to the map. As a rule of thumb, set this number to the same distance your scenes were captured. TourBuilder defaults to 3 meters as we've noticed the click-to-go navigation works good for most scenes at this distance."
                    >
                      <Info className="h-4 w-4 shrink-0" />
                      <span>spacing</span>
                      <select
                        value={spacing}
                        onChange={(e) => setSpacing(e.target.value)}
                        className="bg-white text-slate-800 border border-slate-200 rounded px-2 py-0.5 text-xs font-bold outline-none cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        {SPACINGS.map((sp) => (
                          <option key={sp} value={sp}>
                            {sp}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center shadow-sm rounded-lg overflow-hidden">
                      <button
                        onClick={() => setPendingTo(null)}
                        className="flex items-center gap-1 bg-[#ef5350] hover:bg-[#e53935] text-white px-3 py-1.5 text-xs font-bold transition-colors border-r border-red-600/30 cursor-pointer shadow-inner"
                      >
                        <X className="h-3 w-3" /> Cancel
                      </button>
                      <button
                        onClick={() => {
                          const p = photos.find((x) => x.id === pendingTo);
                          if (p) addConnection(p);
                        }}
                        className="flex items-center gap-1 bg-[#ff9800] hover:bg-[#ef6c00] text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-inner"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    </div>
                  </div>
                  <div className="relative w-full h-[280px] bg-transparent overflow-hidden rounded-b-lg">
                    <div
                      className="absolute inset-0 transition-opacity"
                      style={{ opacity: opacity[0] / 100 }}
                    >
                      <div ref={overlayPanoRef} className="w-full h-full" />
                    </div>
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-green-500 z-10 pointer-events-none shadow-[0_0_4px_#22c55e]" />
                  </div>
                </div>
              </div>
            )}

            <div className="absolute right-2 top-2 flex flex-col gap-1 z-10">
              <button
                onClick={fullscreenPano}
                className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white rounded shadow flex items-center justify-center backdrop-blur"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => zoomPano(-10)}
                className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white rounded shadow flex items-center justify-center backdrop-blur mt-2"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => zoomPano(10)}
                className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white rounded shadow flex items-center justify-center backdrop-blur"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
            </div>

            <div className="absolute bottom-4 right-4 h-16 w-16 rounded-full bg-black/70 border-2 border-white/50 flex items-center justify-center shadow-lg backdrop-blur">
              <Navigation
                className="h-8 w-8 text-red-500 fill-red-500 drop-shadow"
                style={{ transform: `rotate(${-currentGeographicHeading}deg)` }}
              />
            </div>

            {/* Connection Chevrons mapped from DB */}
            {active &&
              activeConns
                .filter((c) => c.from_photo_id === active.id)
                .map((c) => {
                  const hotspotPixelHeading = (c.heading - (active?.heading || 0) + 360) % 360;
                  const offset = ((hotspotPixelHeading - currentHeading + 540) % 360) - 180;
                  if (Math.abs(offset) > 60) return null;

                  return (
                    <div
                      key={c.id}
                      className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden"
                      style={{ transform: `translate(${offset * 5}px, 0)` }}
                    >
                      <div className="h-full w-0.5 bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.8)] absolute" />
                      <div
                        className="relative z-10 w-24 h-12 perspective-[100px] flex flex-col gap-1 items-center justify-center cursor-pointer pointer-events-auto hover:scale-110 transition-transform"
                        onClick={() => {
                          const idx = photos.findIndex((p) => p.id === c.to_photo_id);
                          if (idx !== -1) setActiveIdx(idx);
                        }}
                      >
                        <div className="w-16 h-16 border-t-[10px] border-l-[10px] border-white origin-center rotate-45 transform skew-x-12 translate-y-6 shadow-xl opacity-90" />
                        <div className="w-16 h-16 border-t-[10px] border-l-[10px] border-white origin-center rotate-45 transform skew-x-12 -translate-y-2 shadow-xl opacity-90" />
                      </div>
                    </div>
                  );
                })}
          </div>

          <div className="bg-gray-100 border-t text-gray-500 px-3 py-1.5 text-[10px] flex items-center justify-between">
            <span>Keyboard shortcuts</span>
            <span>(c) PanoPublish {new Date().getFullYear()}</span>
            <span>Terms</span>
            <span>Report a problem</span>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col h-[700px]">
          <div className="h-[200px] bg-black relative flex-shrink-0">
            {rightPendingTo || active ? (
              <>
                <div ref={rightPanoRef} className="w-full h-full" />
                <div className="absolute top-2 left-2 rounded-lg bg-slate-900/90 text-white font-extrabold px-2 py-0.5 text-xs shadow-md border border-slate-700/50 z-10">
                  {rightPendingTo
                    ? photos.findIndex((p) => p.id === rightPendingTo)
                    : `${active ? photos.findIndex((p) => p.id === active.id) : ""} (ACTIVE)`}
                </div>
                {/* Floating controls on top-right viewer */}
                <div className="absolute bottom-2 right-2 z-10 flex gap-2">
                  {rightPendingTo && (
                    <button
                      onClick={() => {
                        const idx = photos.findIndex((p) => p.id === rightPendingTo);
                        if (idx !== -1) {
                          setActiveIdx(idx);
                          setRightPendingTo(null);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-lg hover:scale-103 active:scale-97 transition-all uppercase cursor-pointer"
                    >
                      <Check className="h-3 w-3" /> Set Active
                    </button>
                  )}
                  {rightPendingTo && active && (
                    <button
                      onClick={() => setPendingTo(rightPendingTo)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-lg hover:scale-103 active:scale-97 transition-all uppercase cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Align & Connect
                    </button>
                  )}
                  {!rightPendingTo && active && (
                    <div className="bg-orange-600 text-white font-black text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg border border-orange-500 uppercase tracking-wider select-none">
                      Active Scene
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/50 text-sm gap-2">
                <MousePointer2 className="h-6 w-6 opacity-50" />
                Select scene to connect
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-2 space-y-2.5">
            {[...islands, { id: "unassigned", name: "Unassigned", order_index: 999 }].map(
              (island) => {
                const islandPhotos = photos.filter((p) =>
                  island.id === "unassigned" ? !p.island_id : p.island_id === island.id,
                );
                const unconnectedIslandPhotos = islandPhotos.filter((p) => !connectedIds.has(p.id));
                if (unconnectedIslandPhotos.length === 0) return null;

                const isOpen = rightIslandOpen[island.id];

                return (
                  <div
                    key={`right-${island.id}`}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-all duration-200"
                  >
                    <div
                      className="bg-sky-900 text-white px-3 py-2.5 flex items-center justify-between cursor-pointer text-xs font-semibold sticky top-0 z-10 hover:bg-sky-800 transition-colors"
                      onClick={() => handleToggleIsland(island.id, !!isOpen)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-sky-950 flex items-center justify-center border border-sky-800">
                          {isOpen ? (
                            <Minus className="h-3 w-3 text-sky-200" />
                          ) : (
                            <Plus className="h-3 w-3 text-sky-200" />
                          )}
                        </div>
                        <span className="font-bold tracking-wide uppercase">{island.name}</span>
                        <span className="text-[10px] bg-sky-600 text-white font-extrabold px-1.5 py-0.5 rounded-full border border-sky-500 shadow-sm ml-1.5">
                          {unconnectedIslandPhotos.length}
                        </span>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="bg-slate-50/40 pb-3 border-t border-slate-100">
                        {/* Premium Auto Align Panel */}
                        <div className="bg-gradient-to-r from-sky-950 to-sky-900 text-white px-3 py-2.5 space-y-2 mb-3 shadow-inner border-b border-sky-850">
                          <label className="flex items-center gap-2 text-[10px] font-bold tracking-wider cursor-pointer uppercase select-none">
                            <Checkbox
                              checked={autoAlign}
                              onCheckedChange={(v) => setAutoAlign(!!v)}
                              className="h-4 w-4 bg-white border-0 text-sky-950 rounded shadow-xs focus:ring-0"
                            />
                            AUTO ALIGN CONSTEL
                          </label>
                          <div className="flex items-center gap-2.5 text-[9px] font-black text-sky-200">
                            <span className="uppercase">Fine Align:</span>
                            <Slider
                              value={alignFine}
                              onValueChange={setAlignFine}
                              min={0}
                              max={10}
                              step={1}
                              className="flex-1 [&_[role=slider]]:bg-white [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-sky-500 [&_[role=slider]]:shadow"
                            />
                            <span className="font-mono bg-sky-950/80 px-1 py-0.5 rounded border border-sky-800/50">
                              {(alignFine[0] - 5).toFixed(0)}°
                            </span>
                          </div>
                        </div>

                        {/* Scene Cards Grid */}
                        <div className="px-2 grid grid-cols-2 gap-2">
                          {unconnectedIslandPhotos.map((p) => {
                            const idx = photos.findIndex((x) => x.id === p.id);
                            if (active && p.id === active.id) return null;
                            const isPending = rightPendingTo === p.id;
                            return (
                              <div
                                key={p.id}
                                className={`relative rounded-xl overflow-hidden border bg-white group shadow-xs transition-all duration-300 ${
                                  isPending
                                    ? "border-sky-500 ring-2 ring-sky-500/20 shadow-md scale-[1.02]"
                                    : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                                }`}
                              >
                                <div
                                  className="aspect-[4/3] relative cursor-pointer overflow-hidden"
                                  onClick={() => {
                                    if (!active) {
                                      setActiveIdx(idx);
                                    } else {
                                      setRightPendingTo(p.id);
                                    }
                                  }}
                                >
                                  <img
                                    src={p.file_url}
                                    alt=""
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />

                                  <div className="absolute top-2 left-2 rounded-lg bg-slate-900/90 text-white font-extrabold px-2 py-0.5 text-xs shadow-md border border-slate-700/50">
                                    {idx}
                                  </div>

                                  {active ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRightPendingTo(p.id);
                                        setPendingTo(p.id);
                                      }}
                                      className="absolute top-2 right-2 h-7 w-7 rounded-lg text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 bg-emerald-500 hover:bg-emerald-600 shadow-md z-20"
                                      title="Align & Connect"
                                    >
                                      <Plus className="h-4.5 w-4.5" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveIdx(idx);
                                      }}
                                      className="absolute top-2 right-2 h-7 w-7 rounded-lg text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 bg-blue-500 hover:bg-blue-600 shadow-md z-20"
                                      title="Set as Start Scene"
                                    >
                                      <Check className="h-4.5 w-4.5" />
                                    </button>
                                  )}

                                  {isPending && (
                                    <div className="absolute inset-0 bg-emerald-500/5 flex items-center justify-center pointer-events-none z-10">
                                      <div className="absolute bottom-2 right-2 rounded bg-emerald-600 text-white font-black px-2 py-0.5 text-[8px] flex items-center gap-1 shadow border border-emerald-500 tracking-wider uppercase">
                                        PENDING
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              },
            )}
            {photos.length <= 1 && (
              <div className="text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 py-8">
                Upload at least 2 scenes to start building connections.
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* Custom Hotspot Dialog */}
      <Dialog open={addCustomHotspotOpen} onOpenChange={setAddCustomHotspotOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">
              {editingCustomHotspotId ? "Edit Hotspot" : "Add Scene Hotspot"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Target Scene Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">Target Scene to Link</label>
              <select
                value={customHotspotTargetId}
                onChange={(e) => setCustomHotspotTargetId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs font-semibold outline-none cursor-pointer focus:border-[#0277bd]"
              >
                {photos
                  .filter((p) => active && p.id !== active.id)
                  .map((p, idx) => (
                    <option key={p.id} value={p.id}>
                      {p.filename || `Scene ${idx}`}
                    </option>
                  ))}
              </select>
            </div>

            {/* Icon Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">Hotspot Icon</label>
              <div className="grid grid-cols-5 gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                {[
                  { id: "door", label: "Door 🚪", icon: "🚪" },
                  { id: "arrow", label: "Forward ⬆️", icon: "⬆️" },
                  { id: "double-arrow", label: "Double ⇡", icon: "⇡" },
                  { id: "chevron", label: "Chevron ⏫", icon: "⏫" },
                  { id: "info", label: "Info ℹ️", icon: "ℹ️" },
                  { id: "help", label: "Help ❓", icon: "❓" },
                  { id: "cart", label: "Cart 🛒", icon: "🛒" },
                  { id: "pin", label: "Pin 📍", icon: "📍" },
                  { id: "camera", label: "Camera 📷", icon: "📷" },
                  { id: "eye", label: "Eye 👁️", icon: "👁️" },
                ].map((item) => {
                  const isSelected = customHotspotIcon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCustomHotspotIcon(item.id)}
                      className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#0277bd] text-white border-[#0288d1] shadow-md"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-850"
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="text-[9px] capitalize">{item.id.replace("-", " ")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tooltip Label */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">Hover Label / Tooltip (Optional)</label>
              <Input
                value={customHotspotLabel}
                onChange={(e) => setCustomHotspotLabel(e.target.value)}
                placeholder="e.g. Enter Living Room"
                className="bg-slate-950 border-slate-800 text-white text-xs h-10 focus-visible:ring-[#0277bd]"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between gap-2">
            {editingCustomHotspotId ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDeleteCustomHotspot(editingCustomHotspotId)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl px-3 cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Hotspot
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddCustomHotspotOpen(false)}
                className="bg-transparent text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveCustomHotspot}
                className="bg-[#0277bd] hover:bg-[#0266a1] text-white text-xs font-bold rounded-xl px-5 border-0 cursor-pointer"
              >
                Save Hotspot
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expanded Map Modal */}
      {expandMap && (
        <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
          <div className="flex items-center justify-between p-2 border-b bg-card">
            <h2 className="font-semibold px-2">Map Editor</h2>
            <Button variant="ghost" size="icon" onClick={() => setExpandMap(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 relative">
            <div ref={modalMapDivRef} className="w-full h-full" />
            {mapsReady && (
              <MapToolbar
                mapType={mapType}
                mode={mapMode}
                onMapTypeChange={setMapType}
                onModeChange={setMapMode}
                onLockAll={async () => {
                  await supabase
                    .from("connections")
                    .update({ is_locked: true })
                    .eq("tour_id", tourId);
                  load();
                }}
                onUnlockAll={async () => {
                  await supabase
                    .from("connections")
                    .update({ is_locked: false })
                    .eq("tour_id", tourId);
                  load();
                }}
                onFitBounds={modalMap.fitBounds}
                onCenterBusiness={() => {
                  if (tour?.latitude)
                    modalMap.mapInstance.current?.panTo({
                      lat: tour.latitude,
                      lng: tour.longitude,
                    });
                }}
                onHelp={() => setHelpOpen(true)}
                onExpand={() => setExpandMap(false)}
                showLabels={showLabels}
                onToggleLabels={() => setShowLabels(!showLabels)}
                autoAlign={autoAlign}
                onToggleAutoAlign={() => setAutoAlign(!autoAlign)}
                onDeleteConnection={onDeleteConnection}
                canDeleteConnection={!!selectedConnection}
              />
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
