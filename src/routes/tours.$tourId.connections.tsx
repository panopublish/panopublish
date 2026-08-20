import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TourStepsNav } from "@/components/TourStepsNav";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LazyThumbnail } from "@/components/LazyThumbnail";
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
  Tag,
  BedDouble,
  Images,
  PlayCircle,
  LayoutPanelTop,
  Star,
  DoorOpen,
  ChevronsUp,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { usePanoramaMap } from "@/hooks/usePanoramaMap";
import { MapToolbar } from "@/components/MapToolbar";
import { PanoramaNode, Connection, MapMode } from "@/types/panorama";

import { getEnv } from "@/lib/env";

import { SEO } from "@/components/SEO";

// Premium Handcrafted Vector Icon Components for Custom Tours
const ForwardIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
);

const ChevronIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m17 11-5-5-5 5" />
    <path d="m17 18-5-5-5 5" />
  </svg>
);

const DoorIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 4h3a2 2 0 0 1 2 2v14" />
    <path d="M2 20h20" />
    <path d="M13 20V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16" />
    <circle cx="9" cy="12" r="1" fill="currentColor" />
  </svg>
);

const RoomIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
    <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
    <path d="M12 4v6" />
    <path d="M2 18h20" />
  </svg>
);

const LiftIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="3" />
    <path d="m8 10 4-4 4 4" />
    <path d="m8 14 4 4 4-4" />
  </svg>
);

const StairsIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19h4v-4h4v-4h4V7h4" />
  </svg>
);

const InfoHotspotIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const WebsiteIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

// Exactly 8 requested hotspot icon styles for custom virtual tours
const HOTSPOT_ICONS = [
  { id: "arrow", label: "Forward", icon: ForwardIcon },
  { id: "chevron", label: "Chevron", icon: ChevronIcon },
  { id: "door", label: "Door", icon: DoorIcon },
  { id: "bed", label: "Room", icon: RoomIcon },
  { id: "lift", label: "Lift", icon: LiftIcon },
  { id: "stairs", label: "Stairs", icon: StairsIcon },
  { id: "info", label: "Info", icon: InfoHotspotIcon },
  { id: "link", label: "Website", icon: WebsiteIcon },
];

const renderHotspotIcon = (type: string, className = "h-5 w-5") => {
  switch (type) {
    case "chevron":
    case "double-arrow":
    case "double":
      return <ChevronIcon className={className} />;
    case "door":
      return <DoorIcon className={className} />;
    case "bed":
      return <RoomIcon className={className} />;
    case "lift":
      return <LiftIcon className={className} />;
    case "stairs":
      return <StairsIcon className={className} />;
    case "info":
    case "help":
      return <InfoHotspotIcon className={className} />;
    case "link":
    case "website":
      return <WebsiteIcon className={className} />;
    case "gallery":
    case "camera":
      return <Images className={className} />;
    case "video":
      return <PlayCircle className={className} />;
    case "floorplan":
      return <LayoutPanelTop className={className} />;
    case "star":
    case "eye":
      return <Star className={`${className} fill-white/20`} />;
    case "warning":
      return <AlertTriangle className={className} />;
    case "pin":
    case "cart":
      return <MapPin className={className} />;
    case "arrow":
    default:
      return <ForwardIcon className={className} />;
  }
};

export const Route = createFileRoute("/tours/$tourId/connections")({
  head: () => ({
    meta: [
      { title: "Build Connections — PanoPublish" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    // Load 360° viewer libs only on the connections route, not globally
    links: [
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css",
      },
    ],
    scripts: [
      {
        src: "https://cdn.jsdelivr.net/npm/marzipano@0.10.2/dist/marzipano.js",
        defer: true,
      },
      {
        src: "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js",
        defer: true,
      },
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
type Island = {
  id: string;
  name: string;
  order_index: number;
  is_level?: boolean;
  level_number?: number;
  level_name?: string;
};

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
  const [ready, setReady] = useState(() => typeof window !== "undefined" && !!window.google?.maps);

  useEffect(() => {
    if (!MAPS_KEY) return;
    if (window.google?.maps) {
      setReady(true);
      return;
    }

    const interval = setInterval(() => {
      if (window.google?.maps) {
        setReady(true);
        clearInterval(interval);
      }
    }, 100);

    const existing = document.querySelector<HTMLScriptElement>("script[src*='maps.googleapis.com']");
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.google?.maps) setReady(true);
      });
      return () => clearInterval(interval);
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places,geometry`;
    s.async = true;
    s.defer = true;
    s.dataset.gmaps = "1";
    s.onload = () => {
      if (window.google?.maps) setReady(true);
    };
    document.head.appendChild(s);

    return () => clearInterval(interval);
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

  const [loading, setLoading] = useState(true);
  const isInitialLoadRef = useRef(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [conns, setConns] = useState<Conn[]>([]);
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [activeConstName, setActiveConstName] = useState("");
  const [tour, setTour] = useState<{
    name: string;
    latitude: number | null;
    longitude: number | null;
    type?: string | null;
    nadir_type?: string | null;
    nadir_size?: string | null;
    nadir_pos?: string | null;
    nadir_logo_url?: string | null;
    custom_settings?: string | null;
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

  const customThemeColor = useMemo(() => {
    try {
      if (tour?.custom_settings) {
        const s = JSON.parse(tour.custom_settings);
        if (s?.branding?.theme_color) return s.branding.theme_color;
      }
    } catch {}
    return "#0277bd";
  }, [tour?.custom_settings]);

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
  const [isPanoLoading, setIsPanoLoading] = useState(false);
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
  const [addFloorOpen, setAddFloorOpen] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const [newFloorNumber, setNewFloorNumber] = useState<number>(1);

  // High-priority preload active 360 panorama image to prevent black screen delay
  useEffect(() => {
    if (active?.file_url) {
      setIsPanoLoading(true);
      const img = new Image();
      // @ts-ignore
      img.fetchPriority = "high";
      img.onload = () => {
        setIsPanoLoading(false);
      };
      img.onerror = () => {
        setIsPanoLoading(false);
      };
      img.src = active.file_url;
    }
  }, [active?.id, active?.file_url]);

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
  const [customHotspotInfoContent, setCustomHotspotInfoContent] = useState<string>("");
  const [editingCustomHotspotId, setEditingCustomHotspotId] = useState<string | null>(null);
  const [previewInfoContent, setPreviewInfoContent] = useState<string | null>(null);

  // Interactive Hotspot Popovers & Dragging State
  const [draggingHotspotId, setDraggingHotspotId] = useState<string | null>(null);
  const draggingHotspotIdRef = useRef<string | null>(null);
  const [editingTargetPopoverId, setEditingTargetPopoverId] = useState<string | null>(null);
  const [editingIconPopoverId, setEditingIconPopoverId] = useState<string | null>(null);
  const [editingTagPopoverId, setEditingTagPopoverId] = useState<string | null>(null);
  const [editingInfoPopoverId, setEditingInfoPopoverId] = useState<string | null>(null);
  const [infoInputVal, setInfoInputVal] = useState<string>("");
  const [editingWebsitePopoverId, setEditingWebsitePopoverId] = useState<string | null>(null);
  const [websiteInputVal, setWebsiteInputVal] = useState<string>("");
  const [tagInputVal, setTagInputVal] = useState<string>("");
  const [tagError, setTagError] = useState<string>("");
  const [sceneTags, setSceneTags] = useState<Record<string, string>>({});

  const headingBadgeRef = useRef<HTMLSpanElement>(null);
  const compassNeedleRef = useRef<SVGSVGElement>(null);
  const panoRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const marzSceneRef = useRef<any>(null);
  const marzViewRef = useRef<any>(null);
  const marzHotspotsRef = useRef<Record<string, { el: HTMLDivElement; hotspot: any }>>({});
  const [portalContainers, setPortalContainers] = useState<Array<{ id: string; el: HTMLDivElement; conn: Conn }>>([]);
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
    if (isInitialLoadRef.current) {
      setLoading(true);
    }
    try {
      const [{ data: t }, { data: ps }, { data: cs }, { data: cons }, { data: is }] =
        await Promise.all([
          supabase
            .from("tours")
            .select(
              "name,latitude,longitude,type,nadir_type,nadir_size,nadir_pos,nadir_logo_url,custom_settings",
            )
            .eq("id", tourId)
            .maybeSingle(),
          supabase.from("photos").select("*").eq("tour_id", tourId),
          supabase.from("connections").select("*").eq("tour_id", tourId),
          supabase.from("constellations").select("id,name").eq("tour_id", tourId).order("created_at"),
          supabase.from("islands").select("*").eq("tour_id", tourId).order("order_index"),
        ]);
      setTour(t as any);
      if (t?.custom_settings) {
        try {
          const parsed = JSON.parse(t.custom_settings);
          setSceneTags(parsed.scene_tags || {});
        } catch (_) {}
      } else {
        setSceneTags({});
      }
      if (typeof window !== "undefined" && t?.type) {
        try {
          sessionStorage.setItem(`tour_type_${tourId}`, t.type);
        } catch (_) {}
      }

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
    } finally {
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        setLoading(false);
      }
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

      // Open the active island without force-collapsing other islands
      setIslandOpen((prev) => ({ ...prev, [targetIslandId]: true }));
      setRightIslandOpen((prev) => ({ ...prev, [targetIslandId]: true }));
    }
  }, [active?.id]);

  // Derived state for map overlay (filtered by active island/floor)
  const mapNodes: PanoramaNode[] = useMemo(() => {
    const filteredPhotos = photos.filter((p) => {
      const pIslandId = p.island_id || "unassigned";
      if (!activeIslandId || activeIslandId === "all") return true;
      if (pIslandId === activeIslandId) return true;
      // Show photos connected across floors to the active scene
      if (
        active &&
        conns.some(
          (c) =>
            (c.from_photo_id === active.id && c.to_photo_id === p.id) ||
            (c.to_photo_id === active.id && c.from_photo_id === p.id),
        )
      ) {
        return true;
      }
      return false;
    });

    // Compute the preview coordinates for pendingTo dynamically
    let previewLat: number | null = null;
    let previewLng: number | null = null;

    if (active && pendingTo && active.latitude && active.longitude) {
      const distanceNum = parseInt(spacing.replace("m", "")) || 3;
      const baseHeading = ((active.heading || 0) + currentHeading) % 360;
      const finalHeading = (baseHeading + alignFine[0] - 5 + 360) % 360;
      const geographicHeading = finalHeading;

      if (window.google?.maps?.geometry?.spherical) {
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

        if (activeIslandId && activeIslandId !== "all") {
          return fromIsland === activeIslandId || toIsland === activeIslandId;
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

  const createGoogleMapsPanoProvider = useCallback(() => {
    return (panoId: string) => {
      const p =
        activeRef.current && panoId === activeRef.current.id
          ? activeRef.current
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
            p.latitude || 0,
            p.longitude || 0,
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
    };
  }, []);

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
            // Limit scene cache to prevent GPU memory exhaustion on large tours
            const cacheKeys = Object.keys(customScenesCacheRef.current);
            if (cacheKeys.length >= 6) {
              const oldestKey = cacheKeys[0];
              try {
                viewer.destroyScene(customScenesCacheRef.current[oldestKey].scene);
              } catch {}
              delete customScenesCacheRef.current[oldestKey];
            }

            let maxTexSize = 4096;
            try {
              const testCanvas = document.createElement("canvas");
              const testGl =
                testCanvas.getContext("webgl") ||
                testCanvas.getContext("experimental-webgl");
              if (testGl) {
                maxTexSize = (testGl as WebGLRenderingContext).getParameter(
                  (testGl as WebGLRenderingContext).MAX_TEXTURE_SIZE,
                ) || 4096;
              }
            } catch {}
            const targetGeomWidth = Math.min(4000, maxTexSize);

            const source = PanoEngine.ImageUrlSource.fromString(active.file_url, {
              crossOrigin: "anonymous",
            });
            const geometry = new PanoEngine.EquirectGeometry([{ width: targetGeomWidth }]);
            const limitor = PanoEngine.RectilinearView.limit.traditional(
              2048,
              (100 * Math.PI) / 180,
            );

            const initialYawRad = ((active.heading || 0) * Math.PI) / 180;
            const view = new PanoEngine.RectilinearView(
              { yaw: initialYawRad, pitch: 0, fov: Math.PI / 2 },
              limitor,
            );

            const scene = viewer.createScene({
              source: source,
              geometry: geometry,
              view: view,
            });

            cached = { scene, view };
            customScenesCacheRef.current[active.id] = cached;

            let povDebounceTimer: any = null;
            const syncPov = () => {
              if (view && !cancelled) {
                try {
                  const yRad = view.yaw() || 0;
                  const pRad = view.pitch() || 0;
                  const fovRad = view.fov() || Math.PI / 2;

                  const yDeg = Math.round(((yRad * 180) / Math.PI + 360) % 360);
                  lastHeadingRef.current = yDeg;

                  // Ultra-fast 60fps direct DOM updates (0 React re-render lag)
                  if (headingBadgeRef.current) {
                    headingBadgeRef.current.textContent = `H: ${yDeg}°`;
                  }
                  if (compassNeedleRef.current) {
                    const geographicH = ((activeRef.current?.heading || 0) + yDeg) % 360;
                    compassNeedleRef.current.style.transform = `rotate(${-geographicH}deg)`;
                  }

                  // Debounce React state updates to avoid re-rendering entire component tree on drag
                  clearTimeout(povDebounceTimer);
                  povDebounceTimer = setTimeout(() => {
                    if (!cancelled) {
                      setCurrentHeading(yDeg);
                    }
                  }, 120);
                } catch {}
              }
            };

            view.addEventListener("change", syncPov);
          }

          marzSceneRef.current = cached.scene;
          marzViewRef.current = cached.view;

          cached.view.setYaw(((active.heading || 0) * Math.PI) / 180);
          cached.view.setPitch(0);
          cached.scene.switchTo({ transitionDuration: 300 }, (err: any) => {
            // Ignore cancelled transition errors during fast scene clicks
          });
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
          motionTracking: false,
          motionTrackingControl: false,
          clickToGo: false,
          panoProvider: createGoogleMapsPanoProvider(),
        });

        prevActiveIdRef.current = active.id;

        let povDebounceTimer: any = null;
        viewerRef.current.addListener("pov_changed", () => {
          const pov = viewerRef.current.getPov();
          if (pov) {
            const headingVal = (pov.heading + 360) % 360;
            lastHeadingRef.current = headingVal;

            // Ultra-fast 60fps direct DOM updates (0 React re-render lag)
            if (headingBadgeRef.current) {
              headingBadgeRef.current.textContent = `H: ${Math.round(headingVal)}°`;
            }
            if (compassNeedleRef.current) {
              const geographicH = ((activeRef.current?.heading || 0) + headingVal) % 360;
              compassNeedleRef.current.style.transform = `rotate(${-geographicH}deg)`;
            }

            // Debounce React state updates to avoid re-rendering entire component tree on drag
            clearTimeout(povDebounceTimer);
            povDebounceTimer = setTimeout(() => {
              setCurrentHeading(headingVal);
            }, 120);
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

  // Native Marzipano 3D Hotspots Sync (Zero lag, Zero 3D drift during 360 image rotation)
  useEffect(() => {
    if (tour?.type !== "custom" || !active || !marzSceneRef.current) {
      setPortalContainers([]);
      return;
    }

    const scene = marzSceneRef.current;
    const container = scene.hotspotContainer();
    if (!container) return;

    const activeConns = conns.filter((c) => c.from_photo_id === active.id);
    const activeConnIds = new Set(activeConns.map((c) => c.id));

    // Destroy hotspots that no longer belong to active scene
    Object.keys(marzHotspotsRef.current).forEach((id) => {
      if (!activeConnIds.has(id)) {
        try {
          container.destroyHotspot(marzHotspotsRef.current[id].hotspot);
        } catch {}
        delete marzHotspotsRef.current[id];
      }
    });

    const newPortals: Array<{ id: string; el: HTMLDivElement; conn: Conn }> = [];

    activeConns.forEach((c) => {
      let meta: any = {};
      try {
        if (c.metadata) meta = JSON.parse(c.metadata);
      } catch {}

      const targetYawDeg = (c.heading + 360) % 360;
      const yawRad = (targetYawDeg * Math.PI) / 180;
      const pitchDeg = meta.pitch ?? c.pitch ?? -10;
      const pitchRad = (pitchDeg * Math.PI) / 180;

      let existing = marzHotspotsRef.current[c.id];
      if (!existing) {
        const el = document.createElement("div");
        el.className = "custom-marzipano-hotspot";
        el.style.position = "absolute";
        el.style.transform = "translate(-50%, -50%)";
        el.style.pointerEvents = "auto";
        el.style.userSelect = "none";
        el.style.zIndex = "20";

        const hotspot = container.createHotspot(el, { yaw: yawRad, pitch: pitchRad });
        existing = { el, hotspot };
        marzHotspotsRef.current[c.id] = existing;
      } else if (draggingHotspotIdRef.current !== c.id) {
        existing.hotspot.setPosition({ yaw: yawRad, pitch: pitchRad });
      }

      newPortals.push({ id: c.id, el: existing.el, conn: c });
    });

    setPortalContainers(newPortals);
  }, [active?.id, active?.heading, conns, photos, tour?.type]);

  const handleStartMarzipanoDrag = (
    e: React.PointerEvent | React.MouseEvent,
    connId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === "function") {
      e.nativeEvent.stopImmediatePropagation();
    }

    const viewer = viewerRef.current;
    const view = marzViewRef.current;
    const panoEl = panoRef.current;
    if (!view || !panoEl) return;

    const targetEl = e.currentTarget as HTMLElement;
    try {
      if ("pointerId" in e && typeof targetEl.setPointerCapture === "function") {
        targetEl.setPointerCapture((e as React.PointerEvent).pointerId);
      }
    } catch {}

    if (viewer && typeof viewer.controls === "function" && viewer.controls()) {
      try {
        viewer.controls().disable();
      } catch {}
    }

    setDraggingHotspotId(connId);
    draggingHotspotIdRef.current = connId;

    const conn = conns.find((c) => c.id === connId);
    let meta: any = {};
    try {
      if (conn?.metadata) meta = JSON.parse(conn.metadata);
    } catch {}

    const targetYawDeg = ((conn?.heading ?? 0) + 360) % 360;
    let latestYawRad = (targetYawDeg * Math.PI) / 180;
    let latestPitchRad = ((meta.pitch ?? conn?.pitch ?? -10) * Math.PI) / 180;

    const updateCoordsFromClient = (clientX: number, clientY: number) => {
      const rect = panoEl.getBoundingClientRect();
      const coords = view.screenToCoordinates({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });

      if (coords) {
        latestYawRad = coords.yaw;
        latestPitchRad = coords.pitch;

        const entry = marzHotspotsRef.current[connId];
        if (entry?.hotspot) {
          entry.hotspot.setPosition({ yaw: coords.yaw, pitch: coords.pitch });
        }
      }
    };

    const handleMove = (moveEvt: MouseEvent | TouchEvent | PointerEvent) => {
      const clientX =
        "touches" in moveEvt && moveEvt.touches.length > 0
          ? moveEvt.touches[0].clientX
          : (moveEvt as MouseEvent).clientX;
      const clientY =
        "touches" in moveEvt && moveEvt.touches.length > 0
          ? moveEvt.touches[0].clientY
          : (moveEvt as MouseEvent).clientY;

      updateCoordsFromClient(clientX, clientY);
    };

    const handleEnd = async (endEvt: MouseEvent | TouchEvent | PointerEvent) => {
      const clientX =
        "changedTouches" in endEvt && endEvt.changedTouches.length > 0
          ? endEvt.changedTouches[0].clientX
          : (endEvt as MouseEvent).clientX;
      const clientY =
        "changedTouches" in endEvt && endEvt.changedTouches.length > 0
          ? endEvt.changedTouches[0].clientY
          : (endEvt as MouseEvent).clientY;

      if (clientX !== undefined && clientY !== undefined) {
        updateCoordsFromClient(clientX, clientY);
      }

      try {
        if ("pointerId" in endEvt && typeof targetEl.releasePointerCapture === "function") {
          targetEl.releasePointerCapture((endEvt as PointerEvent).pointerId);
        }
      } catch {}

      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);

      if (viewer && typeof viewer.controls === "function" && viewer.controls()) {
        try {
          viewer.controls().enable();
        } catch {}
      }

      setDraggingHotspotId(null);
      draggingHotspotIdRef.current = null;

      const relYawDeg = (latestYawRad * 180) / Math.PI;
      const absHeading = Number((((relYawDeg % 360) + 360) % 360).toFixed(2));
      const finalPitch = Number(((latestPitchRad * 180) / Math.PI).toFixed(2));

      meta.pitch = finalPitch;
      const metaJson = JSON.stringify(meta);

      setConns((prev) =>
        prev.map((c) =>
          c.id === connId
            ? { ...c, heading: absHeading, pitch: finalPitch, metadata: metaJson }
            : c,
        ),
      );

      try {
        const { error } = await supabase
          .from("connections")
          .update({ heading: absHeading, metadata: metaJson } as any)
          .eq("id", connId);
        if (error) throw error;
        toast.success("Hotspot placed successfully!", { duration: 1500 });
        await markConnectionsUnsynced();
      } catch (err: any) {
        toast.error("Failed to save position: " + err.message);
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleEnd);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
  };

  // Synchronize 3D chevron links dynamically when coordinates or headings update (e.g. during dragging)
  useEffect(() => {
    if (!viewerRef.current || !active || tour?.type === "custom" || typeof viewerRef.current.setLinks !== "function") return;
    const p = photos.find((x) => x.id === active.id);
    if (!p) return;

    const updateLinks = () => {
      if (!viewerRef.current || typeof viewerRef.current.setLinks !== "function") return;
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
        // Silently ignore if viewer is unmounted or in transition
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

  const handleSaveInfoContent = async (conn: Conn, content: string) => {
    let meta: any = {};
    try {
      if (conn.metadata) meta = JSON.parse(conn.metadata);
    } catch {}
    meta.info_content = content.trim();
    meta.label = content.trim();
    const metaJson = JSON.stringify(meta);

    try {
      const { error } = await supabase
        .from("connections")
        .update({ metadata: metaJson } as any)
        .eq("id", conn.id);
      if (error) throw error;
      toast.success("Hotspot information saved!");
      setConns((prev) =>
        prev.map((c) => (c.id === conn.id ? { ...c, metadata: metaJson } : c)),
      );
      setEditingInfoPopoverId(null);
      await markConnectionsUnsynced();
    } catch (err: any) {
      toast.error("Failed to save information: " + err.message);
    }
  };

  const handleSaveWebsiteUrl = async (conn: Conn, url: string) => {
    let meta: any = {};
    try {
      if (conn.metadata) meta = JSON.parse(conn.metadata);
    } catch {}
    meta.url = url.trim();
    meta.link = url.trim();
    meta.label = url.trim();
    const metaJson = JSON.stringify(meta);

    try {
      const { error } = await supabase
        .from("connections")
        .update({ metadata: metaJson } as any)
        .eq("id", conn.id);
      if (error) throw error;
      toast.success("Website link saved!");
      setConns((prev) =>
        prev.map((c) => (c.id === conn.id ? { ...c, metadata: metaJson } : c)),
      );
      setEditingWebsitePopoverId(null);
      await markConnectionsUnsynced();
    } catch (err: any) {
      toast.error("Failed to save website link: " + err.message);
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

  const handleSaveSceneTag = async (sceneId: string, rawTag: string) => {
    const trimmed = rawTag.trim();
    if (trimmed) {
      // Uniqueness check: is trimmed already assigned to another scene?
      const duplicatePhotoId = Object.keys(sceneTags).find(
        (pId) => pId !== sceneId && sceneTags[pId]?.toLowerCase().trim() === trimmed.toLowerCase(),
      );
      if (duplicatePhotoId) {
        const dupPhoto = photos.find((p) => p.id === duplicatePhotoId);
        const dupName = dupPhoto?.filename || "another scene";
        setTagError(`Tag "${trimmed}" is already used on ${dupName}. Tags must be unique.`);
        return false;
      }
    }

    const updatedTags = { ...sceneTags };
    if (trimmed) {
      updatedTags[sceneId] = trimmed;
    } else {
      delete updatedTags[sceneId];
    }

    setSceneTags(updatedTags);

    let parsedSettings: any = {};
    try {
      if (tour?.custom_settings) parsedSettings = JSON.parse(tour.custom_settings);
    } catch {}
    parsedSettings.scene_tags = updatedTags;
    const customSettingsStr = JSON.stringify(parsedSettings);

    try {
      const { error } = await supabase
        .from("tours")
        .update({ custom_settings: customSettingsStr } as any)
        .eq("id", tourId);
      if (error) throw error;
      setTour((prev: any) => (prev ? { ...prev, custom_settings: customSettingsStr } : null));
      toast.success(trimmed ? `Tag "${trimmed}" saved!` : "Tag removed!");
      setEditingTagPopoverId(null);
      setTagError("");
      await markConnectionsUnsynced();
      return true;
    } catch (err: any) {
      toast.error("Failed to save tag: " + err.message);
      return false;
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
    setCustomHotspotInfoContent(meta.info_content || "");
    setAddCustomHotspotOpen(true);
  };

  const handleSaveCustomHotspot = async () => {
    if (!active) return;
    // Info hotspots don't need a target scene — they show content inline
    if (customHotspotIcon !== "info" && !customHotspotTargetId) {
      toast.error("Please select a target scene to link.");
      return;
    }

    const metaJson = JSON.stringify({
      icon_type: customHotspotIcon,
      label: customHotspotLabel.trim(),
      ...(customHotspotIcon === "info" && { info_content: customHotspotInfoContent.trim() }),
    });

    try {
      if (editingCustomHotspotId) {
        const { error } = await supabase
          .from("connections")
          .update({
            to_photo_id: customHotspotIcon === "info" ? (customHotspotTargetId || active.id) : customHotspotTargetId,
            metadata: metaJson,
          } as any)
          .eq("id", editingCustomHotspotId);
        if (error) throw error;
        toast.success("Hotspot updated!");
      } else {
        const { error } = await supabase.from("connections").insert({
          tour_id: tourId,
          from_photo_id: active.id,
          to_photo_id: customHotspotIcon === "info" ? active.id : customHotspotTargetId,
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
      setCustomHotspotInfoContent("");
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
    // currentHeading is the 360 viewer's current camera yaw angle in degrees (0..360)
    const newPhotoHeading = currentHeading;

    try {
      // 1. Save the new photo heading (initial view yaw angle) in Supabase
      const { error: photoErr } = await supabase
        .from("photos")
        .update({ heading: newPhotoHeading } as any)
        .eq("id", active.id);
      if (photoErr) throw photoErr;

      // 2. Update local photo heading state for immediate reactive rendering
      setPhotos((prev) =>
        prev.map((p) => (p.id === active.id ? { ...p, heading: newPhotoHeading } : p)),
      );

      toast.success("Initial view saved for this scene!");
      await markConnectionsUnsynced();
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

  const handleCreateFloor = async () => {
    if (!user || !newFloorName.trim()) return;
    try {
      const { data, error } = await supabase
        .from("islands")
        .insert({
          user_id: user.id,
          tour_id: tourId,
          name: newFloorName.trim(),
          order_index: islands.length,
          is_level: true,
          level_number: Number(newFloorNumber) || islands.length + 1,
          level_name: newFloorName.trim().slice(0, 3).toUpperCase(),
        })
        .select()
        .single();

      if (error) throw error;
      toast.success(`Floor "${newFloorName}" added!`);
      setNewFloorName("");
      setAddFloorOpen(false);
      load();
    } catch (err: any) {
      toast.error("Failed to add floor: " + err.message);
    }
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

          {/* Connected hotspots — 3D projected to match builder positions exactly (custom tours only) */}
          {tour?.type === "custom" &&
            active &&
            (() => {
              const containerW = panoRef.current?.clientWidth || 0;
              const containerH = panoRef.current?.clientHeight || 0;
              return activeConns
                .filter((c) => c.from_photo_id === active.id)
                .map((c) => {
                  let meta: any = {};
                  try {
                    if (c.metadata) meta = JSON.parse(c.metadata);
                  } catch {}
                  const iconType = meta.icon_type || "arrow";
                  const pitchDeg = meta.pitch ?? c.pitch ?? -10;
                  const { x, y, visible } = getHotspotScreenCoords(
                    c.heading,
                    pitchDeg,
                    currentPov,
                    active.heading || 0,
                    containerW,
                    containerH,
                  );
                  if (!visible) return null;
                  const labelText =
                    meta.label || photos.find((p) => p.id === c.to_photo_id)?.filename || "";

                  return (
                    <div
                      key={c.id}
                      className="absolute z-20 pointer-events-auto select-none"
                      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
                    >
                      <button
                        className={`flex flex-col items-center gap-1 group transition-transform hover:scale-110 active:scale-95 ${
                          iconType === "info" ? "cursor-help" : "cursor-pointer"
                        }`}
                        onClick={() => {
                          if (iconType === "info") {
                            setPreviewInfoContent(meta.info_content || "No information provided.");
                          } else {
                            const idx = photos.findIndex((p) => p.id === c.to_photo_id);
                            if (idx !== -1) setActiveIdx(idx);
                          }
                        }}
                        title={
                          labelText ||
                          (iconType === "info" ? "Click for information" : "Go to scene")
                        }
                      >
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-2xl transition-colors ${
                            iconType === "info"
                              ? "bg-sky-600 hover:bg-sky-500"
                              : "bg-[#0277bd] hover:bg-[#0288d1]"
                          }`}
                        >
                          {iconType === "door" && <span className="text-xl">🚪</span>}
                          {iconType === "arrow" && <ArrowUp className="h-6 w-6 text-white" />}
                          {iconType === "double-arrow" && <span className="text-xl">⇡</span>}
                          {iconType === "chevron" && <span className="text-xl">⏫</span>}
                          {iconType === "info" && <Info className="h-6 w-6 text-white" />}
                          {iconType === "help" && <HelpCircle className="h-6 w-6 text-white" />}
                          {iconType === "cart" && <span className="text-xl">🛒</span>}
                          {iconType === "pin" && <MapPin className="h-6 w-6 text-white" />}
                          {iconType === "camera" && <Camera className="h-6 w-6 text-white" />}
                          {iconType === "eye" && <Eye className="h-6 w-6 text-white" />}
                        </div>
                        {labelText && (
                          <span className="bg-slate-900/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 shadow whitespace-nowrap max-w-[140px] truncate">
                            {labelText}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                });
            })()}

          {/* Info hotspot content popup */}
          {tour?.type === "custom" && previewInfoContent !== null && (
            <div
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setPreviewInfoContent(null)}
            >
              <div
                className="bg-slate-900/95 border border-white/20 text-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center shrink-0">
                      <Info className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-bold text-white">Information</span>
                  </div>
                  <button
                    onClick={() => setPreviewInfoContent(null)}
                    className="text-white/50 hover:text-white transition-colors p-1 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{previewInfoContent}</p>
              </div>
            </div>
          )}
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

  if (loading || !tour) {
    return (
      <AppShell
        title="Build Connections"
        breadcrumbs={[
          { label: "Tours", to: "/tours" },
          { label: "Tour" },
          { label: "Build Connections" },
        ]}
      >
        <SEO
          title="Build Connections"
          description="Connect virtual tour panoramas and build walkthrough paths."
          noIndex={true}
        />
        <TourStepsNav tourId={tourId} activeTab="connections" tourType={tour?.type ?? undefined} />
        <div className="max-w-[1400px] mx-auto h-[750px] rounded-2xl border bg-card flex flex-col items-center justify-center gap-3 shadow-sm animate-in fade-in duration-150">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#0277bd] animate-spin" />
          <span className="text-xs font-bold text-slate-500">Loading tour environment...</span>
        </div>
      </AppShell>
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
                    <div className="w-16 h-12 rounded-lg bg-slate-200 overflow-hidden relative shrink-0 border border-slate-200">
                      <LazyThumbnail
                        src={p.file_url}
                        alt=""
                        aspectRatio="aspect-auto"
                        className="group-hover:scale-105 transition-transform relative z-10"
                      />
                      <span className="absolute top-0.5 left-0.5 bg-slate-900/90 text-white text-[9px] font-mono font-bold px-1 rounded shadow z-20">
                        {String(idx).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {p.filename || `Scene ${idx}`}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                            activeHotspotsCount > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {activeHotspotsCount} {activeHotspotsCount === 1 ? "hotspot" : "hotspots"}
                        </span>
                        {sceneTags[p.id] && (
                          <span className="px-1.5 py-0.5 rounded font-bold text-[9px] bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 max-w-[120px] truncate" title={`Tag: ${sceneTags[p.id]}`}>
                            <Tag className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{sceneTags[p.id]}</span>
                          </span>
                        )}
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
                tour?.type === "custom" &&
                portalContainers.map(({ id, el, conn: c }) => {
                  const targetPhoto = photos.find((p) => p.id === c.to_photo_id);
                  let meta: any = {};
                  try {
                    if (c.metadata) meta = JSON.parse(c.metadata);
                  } catch {}

                  const iconType = meta.icon_type || "arrow";
                  const targetTag = sceneTags[c.to_photo_id];
                  const labelText = (iconType === "link" || iconType === "website")
                    ? (meta.url || meta.link || meta.label || "")
                    : (iconType === "info" ? (meta.info_content || meta.label || "") : (targetTag || ""));
                  const isTargetPopoverOpen = editingTargetPopoverId === c.id;
                  const isIconPopoverOpen = editingIconPopoverId === c.id;
                  const isDragging = draggingHotspotId === c.id;

                  return createPortal(
                    <div key={c.id} className="flex flex-col items-center select-none">
                      {/* Tooltip badge floating cleanly above hotspot (only if tagged or info) */}
                      {labelText ? (
                        <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md border border-white/20 shadow-2xl whitespace-nowrap z-30 pointer-events-none">
                          {labelText}
                        </div>
                      ) : null}

                      {/* Hotspot Outer Container with Quick Action Control Ring */}
                      <div className="relative flex items-center justify-center">
                        {/* Quick Action Floating Controls around the hotspot */}
                        <div className="absolute inset-0 pointer-events-none">
                          {iconType === "info" ? (
                            <>
                              {/* Info Hotspot Controls: Delete, Edit Info Text, Change Icon */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomHotspot(c.id);
                                }}
                                className="absolute -bottom-3.5 -left-3.5 h-7 w-7 rounded-full bg-slate-900/95 hover:bg-red-600 text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20"
                                title="Delete info hotspot"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingIconPopoverId(null);
                                  setEditingTargetPopoverId(null);
                                  setEditingTagPopoverId(null);
                                  setEditingWebsitePopoverId(null);
                                  setInfoInputVal(meta.info_content || meta.label || "");
                                  setEditingInfoPopoverId(editingInfoPopoverId === c.id ? null : c.id);
                                }}
                                className={`absolute -bottom-3.5 -right-3.5 h-7 w-7 rounded-full text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20 ${
                                  editingInfoPopoverId === c.id || (meta.info_content || meta.label)
                                    ? "bg-sky-600 ring-2 ring-sky-400/50"
                                    : "bg-slate-900/95 hover:bg-sky-600"
                                }`}
                                title="Edit info text"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTargetPopoverId(null);
                                  setEditingTagPopoverId(null);
                                  setEditingInfoPopoverId(null);
                                  setEditingWebsitePopoverId(null);
                                  setEditingIconPopoverId(isIconPopoverOpen ? null : c.id);
                                }}
                                className={`absolute -bottom-7 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20 ${
                                  isIconPopoverOpen ? "bg-purple-600" : "bg-slate-900/95 hover:bg-purple-600"
                                }`}
                                title="Change icon style"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (iconType === "link" || iconType === "website") ? (
                            <>
                              {/* Website Hotspot Controls: Delete, Edit Website Link, Change Icon */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomHotspot(c.id);
                                }}
                                className="absolute -bottom-3.5 -left-3.5 h-7 w-7 rounded-full bg-slate-900/95 hover:bg-red-600 text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20"
                                title="Delete website hotspot"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingIconPopoverId(null);
                                  setEditingTargetPopoverId(null);
                                  setEditingTagPopoverId(null);
                                  setEditingInfoPopoverId(null);
                                  setWebsiteInputVal(meta.url || meta.link || meta.label || "");
                                  setEditingWebsitePopoverId(editingWebsitePopoverId === c.id ? null : c.id);
                                }}
                                className={`absolute -bottom-3.5 -right-3.5 h-7 w-7 rounded-full text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20 ${
                                  editingWebsitePopoverId === c.id || (meta.url || meta.link)
                                    ? "bg-emerald-600 ring-2 ring-emerald-400/50"
                                    : "bg-slate-900/95 hover:bg-emerald-600"
                                }`}
                                title="Edit website URL"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTargetPopoverId(null);
                                  setEditingTagPopoverId(null);
                                  setEditingInfoPopoverId(null);
                                  setEditingWebsitePopoverId(null);
                                  setEditingIconPopoverId(isIconPopoverOpen ? null : c.id);
                                }}
                                className={`absolute -bottom-7 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20 ${
                                  isIconPopoverOpen ? "bg-purple-600" : "bg-slate-900/95 hover:bg-purple-600"
                                }`}
                                title="Change icon style"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Navigation Hotspot Controls: Move to Scene, Tag, Delete, Edit Target, Change Icon */}
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
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTargetPopoverId(null);
                                  setEditingIconPopoverId(null);
                                  setEditingInfoPopoverId(null);
                                  setEditingWebsitePopoverId(null);
                                  const targetSceneId = c.to_photo_id || active.id;
                                  setTagInputVal(sceneTags[targetSceneId] || "");
                                  setTagError("");
                                  setEditingTagPopoverId(editingTagPopoverId === c.id ? null : c.id);
                                }}
                                className={`absolute -top-3.5 -left-3.5 h-7 w-7 rounded-full text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20 ${
                                  editingTagPopoverId === c.id || (sceneTags[c.to_photo_id])
                                    ? "bg-amber-600 ring-2 ring-amber-400/50"
                                    : "bg-slate-900/95 hover:bg-amber-600"
                                }`}
                                title={
                                  sceneTags[c.to_photo_id]
                                    ? `Tag: "${sceneTags[c.to_photo_id]}" (Click to edit)`
                                    : "Assign unique scene navigation tag"
                                }
                              >
                                <Tag className="h-3.5 w-3.5" />
                              </button>
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
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingIconPopoverId(null);
                                  setEditingTagPopoverId(null);
                                  setEditingInfoPopoverId(null);
                                  setEditingWebsitePopoverId(null);
                                  setEditingTargetPopoverId(isTargetPopoverOpen ? null : c.id);
                                }}
                                className={`absolute -bottom-3.5 -right-3.5 h-7 w-7 rounded-full text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20 ${
                                  isTargetPopoverOpen ? "bg-sky-600" : "bg-slate-900/95 hover:bg-sky-600"
                                }`}
                                title="Edit target scene"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTargetPopoverId(null);
                                  setEditingTagPopoverId(null);
                                  setEditingInfoPopoverId(null);
                                  setEditingWebsitePopoverId(null);
                                  setEditingIconPopoverId(isIconPopoverOpen ? null : c.id);
                                }}
                                className={`absolute -bottom-7 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full text-white border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-115 pointer-events-auto cursor-pointer z-20 ${
                                  isIconPopoverOpen ? "bg-purple-600" : "bg-slate-900/95 hover:bg-purple-600"
                                }`}
                                title="Change icon style"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Main Center Hotspot Circle (Draggable Handle) */}
                        <div
                          onPointerDown={(e) => handleStartMarzipanoDrag(e, c.id)}
                          onMouseDown={(e) => handleStartMarzipanoDrag(e, c.id)}
                          onTouchStart={(e) => handleStartMarzipanoDrag(e as any, c.id)}
                          className={`w-12 h-12 rounded-full text-white flex items-center justify-center border-2 border-white shadow-2xl transition-transform cursor-grab active:cursor-grabbing ${
                            isDragging ? "scale-125 ring-4 ring-white/50" : "hover:scale-110"
                          }`}
                          style={{ backgroundColor: customThemeColor }}
                          title="Click & drag cursor to move hotspot"
                        >
                          {renderHotspotIcon(iconType, "h-6 w-6")}
                        </div>
                      </div>

                      {/* Popovers */}
                      {editingTagPopoverId === c.id && (
                        <div
                          className="absolute left-1/2 bottom-full mb-8 -translate-x-1/2 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 text-white rounded-2xl shadow-2xl p-3.5 w-72 z-50 pointer-events-auto ring-1 ring-white/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                            <div className="flex items-center gap-1.5">
                              <Tag className="h-3.5 w-3.5 text-amber-400" />
                              <span className="text-xs font-bold text-slate-200">Scene Navigation Tag</span>
                            </div>
                            <button type="button" onClick={() => setEditingTagPopoverId(null)} className="text-slate-400 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                          </div>
                          <input
                            type="text"
                            value={tagInputVal}
                            onChange={(e) => {
                              setTagInputVal(e.target.value);
                              if (tagError) setTagError("");
                            }}
                            placeholder="e.g. Reception, Poolside, Room 101"
                            className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                          />
                          {tagError && <p className="text-[11px] text-red-400 font-medium">{tagError}</p>}
                          <div className="flex items-center justify-between pt-1">
                            {sceneTags[c.to_photo_id || active.id] ? (
                              <button type="button" onClick={() => handleSaveSceneTag(c.to_photo_id || active.id, "")} className="text-[11px] text-red-400 hover:underline">Remove Tag</button>
                            ) : <span />}
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => { setEditingTagPopoverId(null); setTagError(""); }} className="px-2 py-1 text-xs text-slate-400 hover:text-white">Cancel</button>
                              <Button type="button" size="sm" onClick={() => handleSaveSceneTag(c.to_photo_id || active.id, tagInputVal)} className="bg-amber-600 hover:bg-amber-500 text-white text-xs h-7 px-3 font-semibold">Save Tag</Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {editingInfoPopoverId === c.id && (
                        <div
                          className="absolute left-1/2 bottom-full mb-8 -translate-x-1/2 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 text-white rounded-2xl shadow-2xl p-3.5 w-72 z-50 pointer-events-auto ring-1 ring-white/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                            <div className="flex items-center gap-1.5">
                              <Info className="h-3.5 w-3.5 text-sky-400" />
                              <span className="text-xs font-bold text-slate-200">Hotspot Information</span>
                            </div>
                            <button type="button" onClick={() => setEditingInfoPopoverId(null)} className="text-slate-400 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                          </div>
                          <div className="text-[11px] text-slate-400 mb-2">Enter text description shown when viewers click this info icon in the tour.</div>
                          <div className="space-y-2.5">
                            <textarea rows={3} value={infoInputVal} onChange={(e) => setInfoInputVal(e.target.value)} placeholder="e.g. Master Bedroom with ensuite bath..." className="w-full bg-slate-950/90 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 resize-none" />
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button type="button" onClick={() => setEditingInfoPopoverId(null)} className="px-2.5 py-1 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
                              <Button type="button" size="sm" onClick={() => handleSaveInfoContent(c, infoInputVal)} className="bg-[#0277bd] hover:bg-[#01579b] text-white text-xs h-7 px-3 font-semibold">Save Info</Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {editingWebsitePopoverId === c.id && (
                        <div
                          className="absolute left-1/2 bottom-full mb-8 -translate-x-1/2 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 text-white rounded-2xl shadow-2xl p-3.5 w-76 z-50 pointer-events-auto ring-1 ring-white/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                            <div className="flex items-center gap-1.5">
                              <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-xs font-bold text-slate-200">Website Link</span>
                            </div>
                            <button type="button" onClick={() => setEditingWebsitePopoverId(null)} className="text-slate-400 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                          </div>
                          <div className="text-[11px] text-slate-400 mb-2">Enter website URL to open in a new tab when viewers click this hotspot.</div>
                          <div className="space-y-2.5">
                            <input type="url" value={websiteInputVal} onChange={(e) => setWebsiteInputVal(e.target.value)} placeholder="https://example.com" className="w-full bg-slate-950/90 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500" />
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button type="button" onClick={() => setEditingWebsitePopoverId(null)} className="px-2.5 py-1 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
                              <Button type="button" size="sm" onClick={() => handleSaveWebsiteUrl(c, websiteInputVal)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 px-3 font-semibold">Save Link</Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {isTargetPopoverOpen && (
                        <div
                          className="absolute left-1/2 bottom-full mb-8 -translate-x-1/2 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 text-white rounded-2xl shadow-2xl p-3 w-64 z-50 pointer-events-auto ring-1 ring-white/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                            <span className="text-xs font-bold text-slate-200">Connect to Scene</span>
                            <button type="button" onClick={() => setEditingTargetPopoverId(null)} className="text-slate-400 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                          </div>
                          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                            {photos.filter((p) => p.id !== active.id).map((p, idx) => (
                              <button key={p.id} type="button" onClick={async () => { await updateHotspotTarget(c.id, p.id); setEditingTargetPopoverId(null); }} className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white">{p.filename || `Scene ${idx}`}</button>
                            ))}
                          </div>
                        </div>
                      )}

                      {isIconPopoverOpen && (
                        <div
                          className="absolute left-1/2 bottom-full mb-8 -translate-x-1/2 bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 text-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-4 w-84 z-50 pointer-events-auto ring-1 ring-white/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-lg bg-purple-500/20 text-purple-400">
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-100">Hotspot Icon</div>
                                <div className="text-[10px] text-slate-400">Select icon style for this spot</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditingIconPopoverId(null)}
                              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            {HOTSPOT_ICONS.map((item) => {
                              const isSelected = iconType === item.id;
                              const IconComp = item.icon;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={async () => {
                                    await updateHotspotIcon(c, item.id);
                                    setEditingIconPopoverId(null);
                                  }}
                                  className={`group relative p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200 text-center border cursor-pointer ${
                                    isSelected
                                      ? "bg-gradient-to-b from-sky-500/25 to-sky-600/35 border-sky-400 text-white shadow-[0_0_16px_rgba(56,189,248,0.35)] ring-2 ring-sky-400/60 scale-[1.03]"
                                      : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-sky-400/50 hover:bg-slate-800 hover:text-white hover:shadow-md hover:scale-[1.03]"
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                                  )}
                                  <div
                                    className={`p-2 rounded-lg transition-all duration-200 ${
                                      isSelected
                                        ? "bg-gradient-to-tr from-sky-600 to-sky-400 text-white shadow-md"
                                        : "bg-slate-700/40 text-sky-400 group-hover:text-white group-hover:bg-sky-500/30"
                                    }`}
                                  >
                                    <IconComp className="h-4 w-4" />
                                  </div>
                                  <span className="text-[10px] font-bold tracking-tight truncate w-full">
                                    {item.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>,
                    el,
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
                            {renderHotspotIcon(iconType, "h-4 w-4")}
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
            {/* Floor List Header / Quick Add */}
            <div className="flex items-center justify-between px-1.5 py-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Floor Groups ({islands.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setNewFloorNumber(islands.length + 1);
                  setNewFloorName(`Level ${islands.length + 1}`);
                  setAddFloorOpen(true);
                }}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer border border-blue-200"
              >
                <Plus className="h-3 w-3" /> Add Floor
              </button>
            </div>

            {/* Connected scenes grouped by island */}
            {[...islands, { id: "unassigned", name: "Unassigned", order_index: 999 }].map(
              (island) => {
                const islandPhotos = photos.filter((p) =>
                  island.id === "unassigned" ? !p.island_id : p.island_id === island.id,
                );
                // Allow connected photos, active photo, OR single standalone photo on this island!
                const connectedIslandPhotos = islandPhotos.filter(
                  (p) => connectedIds.has(p.id) || (active && p.id === active.id) || islandPhotos.length === 1,
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
                              <div className="aspect-[16/9] relative bg-slate-200 w-full overflow-hidden">
                                <LazyThumbnail
                                  src={p.file_url}
                                  alt=""
                                  aspectRatio="aspect-auto"
                                  className="group-hover:scale-105 transition-transform relative z-10"
                                />

                                {/* Left side node index identifier */}
                                <div className="absolute top-2 left-2 rounded-lg bg-slate-900/90 text-white font-extrabold px-2 py-0.5 text-xs shadow-md border border-slate-700/50 z-20">
                                  {idx}
                                </div>

                                {/* Disconnect/Remove connections minus button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeAllConnections(p.id);
                                  }}
                                  className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-red-500 hover:bg-red-600 active:scale-95 text-white flex items-center justify-center transition-all duration-200 shadow-md z-20 cursor-pointer"
                                  title="Remove Scene from Connections (-)"
                                >
                                  <Minus className="h-4.5 w-4.5 stroke-[2.5]" />
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
            <span ref={headingBadgeRef} className="font-mono font-medium">H: {displayHeading}</span>
            <button
              onClick={setNorth}
              className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded font-bold tracking-wide"
            >
              <Navigation className="h-3 w-3 fill-white" /> SET NORTH
            </button>
          </div>

          <div className="relative flex-1 bg-black">
            <div ref={panoRef} className="absolute inset-0" />
            {active && isPanoLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-950/80 z-20 gap-3 backdrop-blur-xs transition-opacity duration-300">
                <div className="w-9 h-9 rounded-full border-3 border-emerald-400 border-t-transparent animate-spin" />
                <div className="text-xs font-bold tracking-wider text-slate-200">Loading 360 Panorama...</div>
              </div>
            )}
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
                ref={compassNeedleRef}
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
            {/* Unconnected scenes header / Quick Add Floor */}
            <div className="flex items-center justify-between px-1.5 py-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Scenes by Floor
              </span>
              <button
                type="button"
                onClick={() => {
                  setNewFloorNumber(islands.length + 1);
                  setNewFloorName(`Level ${islands.length + 1}`);
                  setAddFloorOpen(true);
                }}
                className="text-[10px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer border border-sky-200"
              >
                <Plus className="h-3 w-3" /> Add Floor
              </button>
            </div>

            {[...islands, { id: "unassigned", name: "Unassigned", order_index: 999 }].map(
              (island) => {
                const islandPhotos = photos.filter((p) =>
                  island.id === "unassigned" ? !p.island_id : p.island_id === island.id,
                );
                const unconnectedIslandPhotos = islandPhotos.filter((p) => !connectedIds.has(p.id));
                const isSingleSceneFloor = islandPhotos.length === 1;

                if (unconnectedIslandPhotos.length === 0 && !isSingleSceneFloor) return null;

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
                          {unconnectedIslandPhotos.length || (isSingleSceneFloor ? 1 : 0)}
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
                          {(unconnectedIslandPhotos.length > 0 ? unconnectedIslandPhotos : islandPhotos).map((p) => {
                            const idx = photos.findIndex((x) => x.id === p.id);
                            const isActiveScene = active && p.id === active.id;
                            const isPending = rightPendingTo === p.id;
                            return (
                              <div
                                key={p.id}
                                className={`relative rounded-xl overflow-hidden border bg-white group shadow-xs transition-all duration-300 ${
                                  isPending
                                    ? "border-sky-500 ring-2 ring-sky-500/20 shadow-md scale-[1.02]"
                                    : isActiveScene
                                      ? "border-orange-400 ring-2 ring-orange-400/20"
                                      : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                                }`}
                              >
                                <div
                                    className="aspect-[4/3] relative cursor-pointer overflow-hidden"
                                    onClick={() => {
                                      if (!active) {
                                        setActiveIdx(idx);
                                      } else if (!isActiveScene) {
                                        setRightPendingTo(p.id);
                                      }
                                    }}
                                  >
                                    <LazyThumbnail
                                      src={p.file_url}
                                      alt=""
                                      aspectRatio="aspect-auto"
                                      className="group-hover:scale-105 transition-transform relative z-10"
                                    />

                                    <div className="absolute top-2 left-2 rounded-lg bg-slate-900/90 text-white font-extrabold px-2 py-0.5 text-xs shadow-md border border-slate-700/50 z-20">
                                    {idx}
                                  </div>

                                  {active && !isActiveScene ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRightPendingTo(p.id);
                                        setPendingTo(p.id);
                                      }}
                                      className="absolute top-2 right-2 h-7 w-7 rounded-lg text-white flex items-center justify-center transition-all duration-200 bg-emerald-500 hover:bg-emerald-600 active:scale-95 shadow-md z-20 cursor-pointer"
                                      title="Align & Connect (+)"
                                    >
                                      <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
                                    </button>
                                  ) : !isActiveScene ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveIdx(idx);
                                      }}
                                      className="absolute top-2 right-2 h-7 w-7 rounded-lg text-white flex items-center justify-center transition-all duration-200 bg-blue-500 hover:bg-blue-600 active:scale-95 shadow-md z-20 cursor-pointer"
                                      title="Set as Start Scene"
                                    >
                                      <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                                    </button>
                                  ) : (
                                    <div className="absolute top-2 right-2 rounded bg-orange-600 text-white font-black px-1.5 py-0.5 text-[8px] uppercase tracking-wider z-20">
                                      Active
                                    </div>
                                  )}

                                  {isPending && (
                                    <div className="absolute inset-0 bg-emerald-500/5 flex items-center justify-center pointer-events-none z-10">
                                      <div className="absolute bottom-2 right-2 rounded bg-emerald-600 text-white font-black px-2 py-0.5 text-[8px] flex items-center gap-1 shadow border border-emerald-500 tracking-wider uppercase">
                                        PENDING
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Reassign floor dropdown in right panel */}
                                <div
                                  className="p-1.5 border-t border-slate-100 bg-white flex items-center justify-between gap-1 text-[10px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="text-slate-400 font-bold uppercase text-[9px]">
                                    Floor:
                                  </span>
                                  <select
                                    value={p.island_id || "unassigned"}
                                    onChange={async (e) => {
                                      const val =
                                        e.target.value === "unassigned" ? null : e.target.value;
                                      await handleReassignIsland(p.id, val);
                                    }}
                                    className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 outline-none font-bold text-slate-700 cursor-pointer transition-colors max-w-[100px]"
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
            <DialogDescription className="text-xs text-slate-400">
              Configure navigation links or information popups for this 360 scene.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Target Scene Selector — hidden for info icon type */}
            {customHotspotIcon !== "info" && (
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
            )}

            {/* Info Content — only visible when info icon is selected */}
            {customHotspotIcon === "info" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-sky-400" /> Information Content
                </label>
                <p className="text-[10px] text-slate-400">
                  This text will appear in a popup when the user clicks the info hotspot — no scene navigation occurs.
                </p>
                <textarea
                  value={customHotspotInfoContent}
                  onChange={(e) => setCustomHotspotInfoContent(e.target.value)}
                  placeholder="e.g. This room features original hardwood floors and 12-foot ceilings..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs font-medium outline-none resize-none focus:border-[#0277bd] focus:ring-1 focus:ring-[#0277bd] placeholder:text-slate-600"
                />
              </div>
            )}

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
              <label className="text-xs font-bold text-slate-300 block">
                {customHotspotIcon === "info" ? "Hotspot Title / Tooltip (Optional)" : "Hover Label / Tooltip (Optional)"}
              </label>
              <Input
                value={customHotspotLabel}
                onChange={(e) => setCustomHotspotLabel(e.target.value)}
                placeholder={customHotspotIcon === "info" ? "e.g. About This Room" : "e.g. Enter Living Room"}
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
      {/* Add Floor / Island Dialog */}
      <Dialog open={addFloorOpen} onOpenChange={setAddFloorOpen}>
        <DialogContent className="max-w-sm bg-white rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-800 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <Plus className="h-4 w-4" />
              </span>
              Add New Floor / Level
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a new building level or floor plan grouping for this tour.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Floor Name</label>
              <Input
                placeholder="e.g. 1st Floor, Level 1, Terrace"
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Level Number (Street View)</label>
              <Input
                type="number"
                placeholder="e.g. 1 (for 1st Floor), 2 (for 2nd Floor), 0 (Ground)"
                value={newFloorNumber}
                onChange={(e) => setNewFloorNumber(Number(e.target.value))}
                className="rounded-xl font-mono"
              />
              <p className="text-[10px] text-slate-400">
                Google Maps uses level numbers (0 = Ground, 1 = 1st floor, -1 = Basement).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAddFloorOpen(false)}
              className="rounded-xl border-slate-200 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFloor}
              disabled={!newFloorName.trim()}
              className="bg-[#0277bd] hover:bg-[#0266a1] text-white font-bold rounded-xl px-5 border-0 cursor-pointer"
            >
              Add Floor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
