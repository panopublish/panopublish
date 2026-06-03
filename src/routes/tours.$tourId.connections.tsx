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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Minus, Save, Undo2, Share2, ArrowRight, Eye, Navigation,
  Maximize2, ZoomIn, ZoomOut, HelpCircle, X, Check, Clock, CheckCheck,
  AlertTriangle, Info, MousePointer2
} from "lucide-react";
import { toast } from "sonner";
import { usePanoramaMap } from "@/hooks/usePanoramaMap";
import { MapToolbar } from "@/components/MapToolbar";
import { PanoramaNode, Connection, MapMode } from "@/types/panorama";

import { getEnv } from "@/lib/env";

export const Route = createFileRoute("/tours/$tourId/connections")({
  head: () => ({ meta: [{ title: "Build Connections — TourVista" }] }),
  component: ConnectionsPage,
});

const MAPS_KEY = getEnv('VITE_GOOGLE_MAPS_API_KEY');

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
};
type Constellation = { id: string; name: string };
type Island = { id: string; name: string; order_index: number };

declare global {
  interface Window {
    google?: any;
    pannellum?: { viewer: (el: string | HTMLElement, cfg: unknown) => { destroy: () => void; }; };
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
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places,geometry`;
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
  const navigate = useNavigate();
  const [previewMode, setPreviewMode] = useState(false);
  const mapsReady = useGoogleMaps();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
      setPreviewMode(isPreview);
    }
  }, []);

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
  const [rightPendingTo, setRightPendingTo] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<{ fromId: string, toId: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [islands, setIslands] = useState<Island[]>([]);
  const [islandOpen, setIslandOpen] = useState<Record<string, boolean>>({});
  const [rightIslandOpen, setRightIslandOpen] = useState<Record<string, boolean>>({});
  const [activeIslandId, setActiveIslandId] = useState<string | null>(null);
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
  
  const [opacity, setOpacity] = useState([100]);
  
  // Map Editor State
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [mapMode, setMapMode] = useState<MapMode>('select');
  const [showLabels, setShowLabels] = useState(true);
  const [expandMap, setExpandMap] = useState(false);

  const panoRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const overlayPanoRef = useRef<HTMLDivElement>(null);
  const overlayViewerRef = useRef<any>(null);
  const rightPanoRef = useRef<HTMLDivElement>(null);
  const rightViewerRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const modalMapDivRef = useRef<HTMLDivElement>(null);

  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; }, [photos]);

  const active = photos[activeIdx];

  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);

  const connsRef = useRef(conns);
  useEffect(() => { connsRef.current = conns; }, [conns]);

  const lastHeadingRef = useRef(0);
  const prevActiveIdRef = useRef<string | null>(null);
  const photoCenter = useMemo(() => {
    if (active?.latitude != null && active?.longitude != null) return { lat: active.latitude, lng: active.longitude };
    if (tour?.latitude != null && tour?.longitude != null) return { lat: tour.latitude, lng: tour.longitude };
    return { lat: 23.02463, lng: 72.56436 };
  }, [active, tour]);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: t }, { data: ps }, { data: cs }, { data: cons }, { data: is }] = await Promise.all([
      supabase.from("tours").select("name,latitude,longitude").eq("id", tourId).maybeSingle(),
      supabase.from("photos").select("*").eq("tour_id", tourId),
      supabase.from("connections").select("*").eq("tour_id", tourId),
      supabase.from("constellations").select("id,name").eq("tour_id", tourId).order("created_at"),
      supabase.from("islands").select("*").eq("tour_id", tourId).order("order_index"),
    ]);
    setTour(t as any);
    
    const sortedPhotos = (ps as any[] ?? []).sort((a, b) => {
      if (a.order_index != null && b.order_index != null) return a.order_index - b.order_index;
      return new Date(a.uploaded_at || 0).getTime() - new Date(b.uploaded_at || 0).getTime();
    });
    setPhotos(sortedPhotos);
    
    setConns((cs as any) ?? []);
    setConstellations((cons as any) ?? []);
    setIslands((is as any) ?? []);
    
    const iOpen: Record<string, boolean> = {};
    const riOpen: Record<string, boolean> = {};
    const firstPhoto = sortedPhotos[0];
    const initialIsland = firstPhoto ? (firstPhoto.island_id || 'unassigned') : 'unassigned';
    
    setActiveIslandId(initialIsland);
    
    (is || []).forEach((island: any) => {
      iOpen[island.id] = (island.id === initialIsland);
      riOpen[island.id] = (island.id === initialIsland);
    });
    iOpen['unassigned'] = ('unassigned' === initialIsland);
    riOpen['unassigned'] = ('unassigned' === initialIsland);
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

  useEffect(() => { load(); }, [load]);

  // Synchronize expanded island and map focus when active photo changes
  useEffect(() => {
    if (active) {
      const targetIslandId = active.island_id || 'unassigned';
      setActiveIslandId(targetIslandId);
      
      const newOpen: Record<string, boolean> = {};
      [...islands, { id: 'unassigned', name: 'Unassigned', order_index: 999 }].forEach(is => {
        newOpen[is.id] = (is.id === targetIslandId);
      });
      setIslandOpen(newOpen);
      setRightIslandOpen(newOpen);
    }
  }, [active?.id, islands]);

  // Derived state for map overlay (filtered by active island/floor)
  const mapNodes: PanoramaNode[] = useMemo(() => {
    const filteredPhotos = photos.filter(p => {
      const pIslandId = p.island_id || 'unassigned';
      return activeIslandId ? pIslandId === activeIslandId : true;
    });
    
    return filteredPhotos.map((p) => {
      const originalIndex = photos.findIndex(x => x.id === p.id);
      return {
        id: p.id,
        lat: p.latitude ?? tour?.latitude ?? 23.02463,
        lng: p.longitude ?? tour?.longitude ?? 72.56436,
        heading: (active && p.id === active.id) ? ((active.heading || 0) + currentHeading) % 360 : (p.heading ?? 0),
        label: showLabels ? String(originalIndex) : "",
        connectionCount: conns.filter(c => c.from_photo_id === p.id || c.to_photo_id === p.id).length,
        status: 'active'
      };
    });
  }, [photos, tour, conns, showLabels, active, currentHeading, activeIslandId]);

  const mapConnections: Connection[] = useMemo(() => {
    return conns
      .filter(c => {
        const fromP = photos.find(p => p.id === c.from_photo_id);
        const toP = photos.find(p => p.id === c.to_photo_id);
        if (!fromP || !toP) return false;
        
        const fromIsland = fromP.island_id || 'unassigned';
        const toIsland = toP.island_id || 'unassigned';
        
        if (activeIslandId) {
          return fromIsland === activeIslandId && toIsland === activeIslandId;
        }
        return true;
      })
      .map(c => ({
        id: c.id,
        fromId: c.from_photo_id,
        toId: c.to_photo_id,
        heading: c.heading,
        isLocked: c.is_locked
      }));
  }, [conns, photos, activeIslandId]);

  const handleExpandIsland = useCallback((islandId: string) => {
    setActiveIslandId(islandId);
    
    const newOpen: Record<string, boolean> = {};
    [...islands, { id: 'unassigned', name: 'Unassigned', order_index: 999 }].forEach(is => {
      newOpen[is.id] = (is.id === islandId);
    });
    setIslandOpen(newOpen);
    setRightIslandOpen(newOpen);

    const targetPhotos = photos.filter(p => (p.island_id || 'unassigned') === islandId);
    if (targetPhotos.length > 0) {
      // If the active photo is not in the expanded island, switch active photo to the first photo of this island
      const isAlreadyActive = targetPhotos.some(p => active && p.id === active.id);
      if (!isAlreadyActive) {
        const idx = photos.findIndex(p => p.id === targetPhotos[0].id);
        if (idx !== -1) {
          setActiveIdx(idx);
        }
      }
    }
  }, [islands, photos, active]);

  const handleToggleIsland = useCallback((islandId: string, isOpen: boolean) => {
    if (!isOpen) {
      handleExpandIsland(islandId);
    } else {
      setIslandOpen(prev => ({ ...prev, [islandId]: false }));
      setRightIslandOpen(prev => ({ ...prev, [islandId]: false }));
      setActiveIslandId(null); // Show all floors on map when collapsed
    }
  }, [handleExpandIsland]);

  // Handle Map Node Updates (Drag)
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const handleNodeMove = useCallback((id: string, lat: number, lng: number) => {
    // Optimistic
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, latitude: lat, longitude: lng } : p));
    // Debounce save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase.from("photos").update({ latitude: lat, longitude: lng }).eq("id", id);
      toast.success("Position saved", { duration: 1500 });
    }, 500);
  }, []);

  const handleNodeRotate = useCallback((heading: number) => {
    if (!active) return;
    setPhotos(prev => prev.map(p => p.id === active.id ? { ...p, heading } : p));
    // Debounce save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase.from("photos").update({ heading }).eq("id", active.id);
      toast.success("Heading saved", { duration: 1500 });
    }, 500);
  }, [active]);

  const handleNodeSelect = useCallback((id: string) => {
    if (mapMode === 'connect' && active) {
      const targetPhoto = photos.find(p => p.id === id);
      if (targetPhoto && targetPhoto.id !== active.id) {
        addConnection(targetPhoto);
        setMapMode('select');
      }
    } else {
      const idx = photos.findIndex(p => p.id === id);
      if (idx !== -1) setActiveIdx(idx);
    }
  }, [mapMode, active, photos]);

  // StreetViewPanorama Main Viewer
  useEffect(() => {
    if (!active || !panoRef.current || !mapsReady || !window.google?.maps) return;
    
    const photoById = new Map(photos.map(p => [p.id, p]));
    
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
          const p = photosRef.current.find(x => x.id === panoId);
          if (!p) return null;
          
          const activeConns = connsRef.current.filter(c => c.from_photo_id === panoId);
          const links = activeConns.map(c => {
            const targetPhoto = photosRef.current.find(x => x.id === c.to_photo_id);
            let dynamicHeading = c.heading;
            if (p && targetPhoto) {
              dynamicHeading = calcHeading(p, targetPhoto);
            }
            return {
              description: targetPhoto?.filename || 'Scene',
              heading: (dynamicHeading - (p.heading || 0) + 360) % 360,
              pano: c.to_photo_id,
            };
          });
 
          return {
            location: {
              pano: p.id,
              description: p.filename || 'Scene',
              latLng: new window.google.maps.LatLng(p.latitude || 0, p.longitude || 0),
            },
            links: links,
            copyright: 'TourVista',
            tiles: {
              tileSize: new window.google.maps.Size(4096, 2048),
              worldSize: new window.google.maps.Size(4096, 2048),
              centerHeading: 0,
              getTileUrl: () => p.file_url
            }
          };
        }
      });

      prevActiveIdRef.current = active.id;
      
      viewerRef.current.addListener('pov_changed', () => {
        const pov = viewerRef.current.getPov();
        if (pov) {
          const headingVal = (pov.heading + 360) % 360;
          setCurrentHeading(headingVal);
          lastHeadingRef.current = headingVal;
        }
      });
      
      viewerRef.current.addListener('pano_changed', () => {
        const newPano = viewerRef.current.getPano();
        const currentActive = activeRef.current;
        const currentPhotos = photosRef.current;
        
        if (newPano && currentActive && newPano !== currentActive.id) {
          // Transition POV to maintain geographic heading alignment
          const prevHeadingOffset = currentActive.heading || 0;
          const prevPovHeading = lastHeadingRef.current;
          const absoluteGeographicHeading = (prevPovHeading + prevHeadingOffset) % 360;
          
          const targetPhoto = currentPhotos.find(p => p.id === newPano);
          if (targetPhoto) {
            const newHeadingOffset = targetPhoto.heading || 0;
            const targetPovHeading = (absoluteGeographicHeading - newHeadingOffset + 360) % 360;
            
            const currentPov = viewerRef.current.getPov();
            viewerRef.current.setPov({
              heading: targetPovHeading,
              pitch: currentPov?.pitch ?? 0,
              zoom: currentPov?.zoom ?? 1
            });
            lastHeadingRef.current = targetPovHeading;
            setCurrentHeading(targetPovHeading);
          }
          
          const idx = currentPhotos.findIndex(p => p.id === newPano);
          if (idx !== -1) setActiveIdx(idx);
        } else {
          // Update currentHeading state when pano changes
          const pov = viewerRef.current.getPov();
          if (pov) {
            const headingVal = (pov.heading + 360) % 360;
            setCurrentHeading(headingVal);
            lastHeadingRef.current = headingVal;
          }
        }
      });
    } else {
      const prevId = prevActiveIdRef.current;
      const currentId = active.id;
      const viewerPano = viewerRef.current.getPano();
      
      if (viewerPano !== currentId) {
        if (prevId && prevId === viewerPano) {
          const prevPhoto = photosRef.current.find(p => p.id === prevId);
          if (prevPhoto) {
            const prevHeadingOffset = prevPhoto.heading || 0;
            const prevPovHeading = lastHeadingRef.current;
            const absoluteGeographicHeading = (prevPovHeading + prevHeadingOffset) % 360;
            const newHeadingOffset = active.heading || 0;
            const targetPovHeading = (absoluteGeographicHeading - newHeadingOffset + 360) % 360;
            
            viewerRef.current.setPano(active.id);
            
            const currentPov = viewerRef.current.getPov();
            viewerRef.current.setPov({
              heading: targetPovHeading,
              pitch: currentPov?.pitch ?? 0,
              zoom: currentPov?.zoom ?? 1
            });
            
            lastHeadingRef.current = targetPovHeading;
            setCurrentHeading(targetPovHeading);
          } else {
            viewerRef.current.setPano(active.id);
          }
        } else {
          viewerRef.current.setPano(active.id);
        }
      }
      
      prevActiveIdRef.current = active.id;

      const p = photosRef.current.find(x => x.id === active.id);
      if (p) {
        const activeConns = connsRef.current.filter(c => c.from_photo_id === active.id);
        const links = activeConns.map(c => {
          const targetPhoto = photosRef.current.find(x => x.id === c.to_photo_id);
          let dynamicHeading = c.heading;
          if (p && targetPhoto) {
            dynamicHeading = calcHeading(p, targetPhoto);
          }
          return {
            description: targetPhoto?.filename || 'Scene',
            heading: (dynamicHeading - (p.heading || 0) + 360) % 360,
            pano: c.to_photo_id,
          };
        });
        viewerRef.current.setLinks(links);
      }
    }
  }, [active?.id, mapsReady]);

  // Synchronize 3D chevron links dynamically when coordinates or headings update (e.g. during dragging)
  useEffect(() => {
    if (!viewerRef.current || !active) return;
    const p = photos.find(x => x.id === active.id);
    if (!p) return;
    
    const updateLinks = () => {
      const activeConns = conns.filter(c => c.from_photo_id === active.id);
      const links = activeConns.map(c => {
        const targetPhoto = photos.find(x => x.id === c.to_photo_id);
        let dynamicHeading = c.heading;
        if (targetPhoto) {
          dynamicHeading = calcHeading(p, targetPhoto);
        }
        return {
          description: targetPhoto?.filename || 'Scene',
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
    const pendingPhoto = photos.find(p => p.id === pendingTo);
    if (!pendingPhoto || !overlayPanoRef.current || !mapsReady || !window.google?.maps) {
      overlayViewerRef.current = null;
      return; 
    }
    
    if (!overlayViewerRef.current) {
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
          const p = photosRef.current.find(x => x.id === panoId);
          if (!p) return null;
          return {
            location: { pano: p.id },
            copyright: 'TourVista',
            tiles: {
              tileSize: new window.google.maps.Size(4096, 2048),
              worldSize: new window.google.maps.Size(4096, 2048),
              centerHeading: 0,
              getTileUrl: () => p.file_url
            }
          };
        }
      });
    } else {
      overlayViewerRef.current.setPano(pendingPhoto.id);
    }
    
    // Set initial POV for overlay to point back along connection
    try {
      if (active) {
        const geoHeading = autoAlign ? calcHeading(active, pendingPhoto) : ((active.heading || 0) + currentHeading);
        const initialPixelHeading = geoHeading - (pendingPhoto.heading || 0);
        overlayViewerRef.current.setPov({ heading: initialPixelHeading, pitch: 0 });
      }
    } catch {}

  }, [pendingTo, autoAlign, mapsReady, active]);

  // Top-Right 360 viewer
  useEffect(() => {
    const previewPhoto = photos.find(p => p.id === rightPendingTo) || active;
    if (!previewPhoto || !rightPanoRef.current || !mapsReady || !window.google?.maps) {
      rightViewerRef.current = null;
      return;
    }

    if (!rightViewerRef.current) {
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
          const p = photosRef.current.find(x => x.id === panoId);
          if (!p) return null;
          return {
            location: { pano: p.id },
            copyright: 'TourVista',
            tiles: {
              tileSize: new window.google.maps.Size(4096, 2048),
              worldSize: new window.google.maps.Size(4096, 2048),
              centerHeading: 0,
              getTileUrl: () => p.file_url
            }
          };
        }
      });
    } else {
      rightViewerRef.current.setPano(previewPhoto.id);
    }
  }, [rightPendingTo, active?.id, mapsReady]);

  const ensureConstellation = async (): Promise<string | null> => {
    let name = activeConstName.trim();
    if (!name) {
      name = tour?.name || "Default Constellation";
      setActiveConstName(name);
    }
    const existing = constellations.find((c) => c.name === name);
    if (existing) return existing.id;
    const { data, error } = await supabase.from("constellations").insert({
      user_id: user!.id, tour_id: tourId, name,
    }).select().single();
    if (error) { toast.error(error.message); return null; }
    setConstellations((s) => [...s, data as any]);
    return (data as any).id;
  };

  const removeAllConnections = async (photoId: string) => {
    if (!confirm("Remove this scene from all connections?")) return;
    await supabase.from("connections").delete().or(`from_photo_id.eq.${photoId},to_photo_id.eq.${photoId}`);
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
    const distanceNum = parseInt(spacing.replace('m', '')) || 3;

    // Always recalculate coordinates based on active photo's position, green line direction, and spacing
    if (active.latitude != null && active.longitude != null) {
      if (window.google?.maps?.geometry?.spherical) {
        const fromLatLng = new window.google.maps.LatLng(active.latitude, active.longitude);
        const toLatLng = window.google.maps.geometry.spherical.computeOffset(fromLatLng, distanceNum, geographicHeading);
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
    const { error: photoErr } = await supabase.from("photos").update({
      latitude: targetLat,
      longitude: targetLng,
      heading: toPhotoHeading
    }).eq("id", toPhoto.id);

    if (photoErr) return toast.error("Failed to position target scene: " + photoErr.message);

    // Update local photos state to maintain smooth reactive map rendering
    setPhotos(prev => prev.map(p => p.id === toPhoto.id ? { 
      ...p, 
      latitude: targetLat, 
      longitude: targetLng,
      heading: toPhotoHeading
    } : p));

    // Save connection lines (both ways) to connections table in Supabase
    const { error } = await supabase.from("connections").insert([
      {
        user_id: user.id,
        tour_id: tourId,
        constellation_id: cid,
        from_photo_id: active.id,
        to_photo_id: toPhoto.id,
        group_name: activeConstName.trim(),
        heading: geographicHeading,
        pitch: 0,
        spacing,
        is_locked: false,
      },
      {
        user_id: user.id,
        tour_id: tourId,
        constellation_id: cid,
        from_photo_id: toPhoto.id,
        to_photo_id: active.id,
        group_name: activeConstName.trim(),
        heading: (geographicHeading + 180) % 360,
        pitch: 0,
        spacing,
        is_locked: false,
      }
    ]);
    
    if (error) return toast.error("Failed to save connections: " + error.message);
    
    toast.success("Scene connected and aligned successfully!");
    setPendingTo(null);
    load();
  };

  const onQuickConnect = useCallback(async (fromId: string, toId: string) => {
    if (!user) return;
    const fromPhoto = photos.find(p => p.id === fromId);
    const toPhoto = photos.find(p => p.id === toId);
    if (!fromPhoto || !toPhoto) return;
    if (fromPhoto.id === toPhoto.id) return;
    
    // Check if connection already exists
    const exists = conns.some(c => 
      (c.from_photo_id === fromPhoto.id && c.to_photo_id === toPhoto.id) ||
      (c.from_photo_id === toPhoto.id && c.to_photo_id === fromPhoto.id)
    );
    if (exists) {
      toast.info("Connection already exists between these scenes");
      return;
    }

    const cid = await ensureConstellation();
    if (!cid) return;

    const geographicHeading = calcHeading(fromPhoto, toPhoto);

    // Save connection lines (both ways) to connections table in Supabase
    const { error } = await supabase.from("connections").insert([
      {
        user_id: user.id,
        tour_id: tourId,
        constellation_id: cid,
        from_photo_id: fromPhoto.id,
        to_photo_id: toPhoto.id,
        group_name: activeConstName.trim(),
        heading: geographicHeading,
        pitch: 0,
        spacing,
        is_locked: false,
      },
      {
        user_id: user.id,
        tour_id: tourId,
        constellation_id: cid,
        from_photo_id: toPhoto.id,
        to_photo_id: fromPhoto.id,
        group_name: activeConstName.trim(),
        heading: (geographicHeading + 180) % 360,
        pitch: 0,
        spacing,
        is_locked: false,
      }
    ]);

    if (error) {
      toast.error("Failed to save connections: " + error.message);
      return;
    }

    toast.success("Quick connection created successfully!");
    load();
  }, [user, photos, conns, tourId, activeConstName, spacing, ensureConstellation, load]);

  const onDeleteConnection = useCallback(async () => {
    if (!selectedConnection) return;
    const { fromId, toId } = selectedConnection;
    const fromP = photos.find(p => p.id === fromId);
    const toP = photos.find(p => p.id === toId);
    const fromName = fromP ? (fromP.filename || `Scene ${photos.indexOf(fromP)}`) : `Scene ${fromId}`;
    const toName = toP ? (toP.filename || `Scene ${photos.indexOf(toP)}`) : `Scene ${toId}`;

    if (!confirm(`Are you sure you want to delete the connection between ${fromName} and ${toName}?`)) {
      return;
    }

    const tid = toast.loading("Deleting connection...");
    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabase.from("connections").delete().eq("from_photo_id", fromId).eq("to_photo_id", toId),
      supabase.from("connections").delete().eq("from_photo_id", toId).eq("to_photo_id", fromId)
    ]);

    if (err1 || err2) {
      toast.error("Failed to delete connection", { id: tid });
      return;
    }

    toast.success("Connection deleted successfully", { id: tid });
    setSelectedConnection(null);
    load();
  }, [selectedConnection, photos, load]);

  const onConnectionSelect = useCallback((fromId: string | null, toId: string | null) => {
    if (fromId === null || toId === null) {
      setSelectedConnection(null);
    } else {
      setSelectedConnection({ fromId, toId });
    }
  }, []);

  const miniMap = usePanoramaMap(
    mapDivRef, 
    {
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
    }
  );

  const modalMap = usePanoramaMap(
    modalMapDivRef, 
    {
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
    }
  );

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
    const needsNext = !rightPendingTo || isCurrentPendingConnected || (active && rightPendingTo === active.id);
    
    if (needsNext && photos.length > 0) {
      // Filter out photos that are already connected and the active photo
      const candidates = photos.filter(p => !connectedIds.has(p.id) && (active ? p.id !== active.id : true));
      
      if (candidates.length > 0) {
        // Prioritize candidates on the same active floor/island
        const sameFloorCandidates = candidates.filter(p => {
          const pIsland = p.island_id || 'unassigned';
          const activeFloor = activeIslandId || 'unassigned';
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
    toast.success("Undone");
    load();
  };

  const handleReassignIsland = async (photoId: string, islandId: string | null) => {
    const { error } = await supabase.from("photos").update({ island_id: islandId }).eq("id", photoId);
    if (error) return toast.error(error.message);
    toast.success("Scene reassigned");
    load();
  };

  const setNorth = async () => {
    if (!active) return;
    const newHeading = (360 - currentHeading) % 360;
    
    setPhotos(prev => prev.map(p => p.id === active.id ? { ...p, heading: newHeading } : p));
    
    const { error } = await supabase.from("photos").update({ heading: newHeading }).eq("id", active.id);
    if (error) toast.error("Failed to save North direction");
    else toast.success(`North set`);
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

  const activeConns = conns.filter((c) => c.from_photo_id === active?.id || c.to_photo_id === active?.id);
  const connectedIds = new Set(conns.flatMap((c) => [c.from_photo_id, c.to_photo_id]));
  const currentGeographicHeading = ((active?.heading || 0) + currentHeading) % 360;
  const displayHeading = currentGeographicHeading.toFixed(2);

  const activeFloorName = useMemo(() => {
    if (activeIslandId === 'unassigned') return "Unassigned Floor";
    const found = islands.find(is => is.id === activeIslandId);
    return found ? found.name : "Select level";
  }, [activeIslandId, islands]);

  const previewFloors = useMemo(() => {
    const list = islands.map(is => ({ id: is.id, name: is.name }));
    const hasUnassigned = photos.some(p => !p.island_id);
    if (hasUnassigned) {
      list.push({ id: 'unassigned', name: 'Unassigned Floor' });
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
            <h1 className="text-sm font-black tracking-wider uppercase">{tour?.name || "Virtual Tour Preview"}</h1>
            <p className="text-[10px] text-white/50">Viewing active scene: {active?.filename || "Scene"}</p>
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
              <span className={`transform transition-transform duration-200 text-[10px] ${levelDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {levelDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-full bg-black/80 backdrop-blur-md border border-white/10 rounded-xl py-1.5 shadow-2xl flex flex-col gap-0.5 z-30 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {previewFloors.length === 0 ? (
                  <div className="px-3 py-1.5 text-[11px] text-white/40 italic">No levels created</div>
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
                            ? 'bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-500' 
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
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
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">Select a scene to preview</div>
          )}
          
          {/* Zoom & Fullscreen Controls */}
          <div className="absolute right-4 top-4 flex flex-col gap-2 z-20">
            <button onClick={fullscreenPano} className="h-9 w-9 bg-black/60 hover:bg-black/80 text-white rounded-xl shadow flex items-center justify-center backdrop-blur border border-white/10 transition-transform active:scale-95" title="Toggle Fullscreen"><Maximize2 className="h-4.5 w-4.5" /></button>
            <button onClick={() => zoomPano(-10)} className="h-9 w-9 bg-black/60 hover:bg-black/80 text-white rounded-xl shadow flex items-center justify-center backdrop-blur border border-white/10 transition-transform active:scale-95 mt-2" title="Zoom In"><ZoomIn className="h-4.5 w-4.5" /></button>
            <button onClick={() => zoomPano(10)} className="h-9 w-9 bg-black/60 hover:bg-black/80 text-white rounded-xl shadow flex items-center justify-center backdrop-blur border border-white/10 transition-transform active:scale-95" title="Zoom Out"><ZoomOut className="h-4.5 w-4.5" /></button>
          </div>

          {/* Compass Radar */}
          <div className="absolute bottom-4 right-4 h-16 w-16 rounded-full bg-black/70 border-2 border-white/30 flex items-center justify-center shadow-lg backdrop-blur z-20">
            <Navigation className="h-8 w-8 text-red-500 fill-red-500 drop-shadow" style={{ transform: `rotate(${-currentGeographicHeading}deg)` }} />
          </div>

          {/* Connected hotspots */}
          {active && activeConns.filter((c) => c.from_photo_id === active.id).map((c) => {
            const hotspotPixelHeading = (c.heading - (active?.heading || 0) + 360) % 360;
            const offset = ((hotspotPixelHeading - currentHeading + 540) % 360) - 180;
            if (Math.abs(offset) > 60) return null;
            
            return (
              <div key={c.id} className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden" style={{ transform: `translate(${offset * 5}px, 0)` }}>
                <div className="h-full w-0.5 bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.8)] absolute" />
                <div className="relative z-10 w-24 h-12 perspective-[100px] flex flex-col gap-1 items-center justify-center cursor-pointer pointer-events-auto hover:scale-110 transition-transform" onClick={() => {
                  const idx = photos.findIndex(p => p.id === c.to_photo_id);
                  if (idx !== -1) setActiveIdx(idx);
                }}>
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
    <AppShell title="Build Connections" breadcrumbs={[{ label: "Tours", to: "/tours" }, { label: tour?.name ?? "Tour" }, { label: "Build Connections" }]}>
      <TourStepsNav 
        tourId={tourId} 
        activeTab="connections" 
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
                onLockAll={async () => { await supabase.from("connections").update({ is_locked: true }).eq("tour_id", tourId); load(); }}
                onUnlockAll={async () => { await supabase.from("connections").update({ is_locked: false }).eq("tour_id", tourId); load(); }}
                onFitBounds={miniMap.fitBounds}
                onCenterBusiness={() => { if (tour?.latitude) miniMap.mapInstance.current?.panTo({ lat: tour.latitude, lng: tour.longitude }); }}
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

          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-2 space-y-2.5">
            {/* Connected scenes grouped by island */}
            {[...islands, { id: 'unassigned', name: 'Unassigned', order_index: 999 }].map((island) => {
              const islandPhotos = photos.filter(p => island.id === 'unassigned' ? !p.island_id : p.island_id === island.id);
              const connectedIslandPhotos = islandPhotos.filter(p => connectedIds.has(p.id));
              if (connectedIslandPhotos.length === 0) return null;
              
              const isOpen = islandOpen[island.id];
              
              return (
                <div key={island.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-all duration-200">
                  <div 
                    className="bg-slate-900 text-white px-3 py-2.5 flex items-center justify-between cursor-pointer text-xs font-semibold sticky top-0 z-10 hover:bg-slate-800 transition-colors"
                    onClick={() => handleToggleIsland(island.id, !!isOpen)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center border border-slate-700">
                        {isOpen ? <Minus className="h-3 w-3 text-slate-300" /> : <Plus className="h-3 w-3 text-slate-300" />}
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
                          const targetMap = expandMap ? modalMap.mapInstance.current : miniMap.mapInstance.current;
                          if (targetMap && connectedIslandPhotos.length > 0) {
                            const bounds = new window.google.maps.LatLngBounds();
                            connectedIslandPhotos.forEach(p => {
                              if (p.latitude != null && p.longitude != null) {
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
                        const idx = photos.findIndex(x => x.id === p.id);
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
                                onClick={(e) => { e.stopPropagation(); removeAllConnections(p.id); }}
                                className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-200 shadow-md opacity-0 group-hover:opacity-100"
                                title="Delete Scene Connections"
                              >
                                <Minus className="h-4 w-4" />
                              </button>

                              {/* GPS warning */}
                              {p.latitude == null && (
                                <div className="absolute bottom-2 left-2 rounded bg-amber-500 text-white font-bold px-2 py-0.5 text-[9px] flex items-center gap-1.5 shadow border border-amber-400">
                                  <AlertTriangle className="h-3 w-3 animate-bounce" /> NO GPS
                                </div>
                              )}

                              {/* Active Pulse overlay */}
                              {isActive && (
                                <div className="absolute bottom-2 right-2 rounded bg-orange-600 text-white font-black px-2 py-0.5 text-[9px] flex items-center gap-1 shadow border border-orange-500 tracking-wider uppercase animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> ACTIVE
                                </div>
                              )}
                            </div>

                            {/* Dropdown controls inside scene card */}
                            <div className="p-2 border-t border-slate-100 bg-white flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                                <span className="uppercase">Floor:</span>
                                <select
                                  value={p.island_id || "unassigned"}
                                  onChange={async (e) => {
                                    const val = e.target.value === "unassigned" ? null : e.target.value;
                                    await handleReassignIsland(p.id, val);
                                  }}
                                  className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 outline-none font-bold text-slate-700 cursor-pointer transition-colors max-w-[125px]"
                                >
                                  <option value="unassigned">Unassigned</option>
                                  {islands.map(i => (
                                    <option key={i.id} value={i.id}>{i.name}</option>
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
            })}
            {photos.filter(p => connectedIds.has(p.id)).length === 0 && (
              <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2.5">
                  <Plus className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-600 mb-1">No connected scenes to display.</p>
                <p className="text-[10px] text-slate-400 max-w-[200px]">Connect nodes by selecting a target on the right and clicking the map plus button.</p>
              </div>
            )}
          </div>
        </div>

        {/* CENTER PANEL */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col h-[700px]">
          <div className="bg-[#689f38] text-white px-3 py-1.5 text-xs flex items-center justify-between shadow z-10">
            <span className="font-mono font-medium">H: {displayHeading}</span>
            <button onClick={setNorth} className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded font-bold tracking-wide">
              <Navigation className="h-3 w-3 fill-white" /> SET NORTH
            </button>
          </div>

          <div className="relative flex-1 bg-black">
            <div ref={panoRef} className="absolute inset-0" />
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-green-500 shadow-[0_0_8px_#22c55e] z-10 pointer-events-none" />
            {!active && (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">Select a scene to preview</div>
            )}
            
            {pendingTo && (
              <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-green-500 shadow-[0_0_8px_#22c55e] z-0 pointer-events-none" />
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[90%] max-w-lg rounded-lg shadow-2xl pointer-events-auto flex flex-col z-20 border border-white/20">
                  <div className="flex items-center justify-between px-3 py-2 bg-black/85 backdrop-blur-md border-b border-white/10 rounded-t-lg">
                    <div className="w-1/3">
                      <Slider value={opacity} onValueChange={setOpacity} max={100} step={1} className="w-full cursor-pointer" />
                    </div>
                    <div className="flex items-center">
                      <button onClick={() => setPendingTo(null)} className="flex items-center gap-1 bg-white hover:bg-gray-100 text-[#e53935] px-3 py-1 text-xs font-bold transition-colors rounded-l border-r">
                        <X className="h-3 w-3" /> Cancel
                      </button>
                      <button onClick={() => { const p = photos.find((x) => x.id === pendingTo); if (p) addConnection(p); }} className="flex items-center gap-1 bg-[#ff9800] hover:bg-[#ef6c00] text-white px-3 py-1 text-xs font-bold transition-colors rounded-r shadow-inner">
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    </div>
                  </div>
                  <div className="relative w-full h-[280px] bg-transparent overflow-hidden rounded-b-lg">
                    <div className="absolute inset-0 transition-opacity" style={{ opacity: opacity[0] / 100 }}>
                      <div ref={overlayPanoRef} className="w-full h-full" />
                    </div>
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-green-500 z-10 pointer-events-none shadow-[0_0_4px_#22c55e]" />
                  </div>
                </div>
              </div>
            )}
            
            <div className="absolute right-2 top-2 flex flex-col gap-1 z-10">
              <button onClick={fullscreenPano} className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white rounded shadow flex items-center justify-center backdrop-blur"><Maximize2 className="h-4 w-4" /></button>
              <button onClick={() => zoomPano(-10)} className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white rounded shadow flex items-center justify-center backdrop-blur mt-2"><ZoomIn className="h-4 w-4" /></button>
              <button onClick={() => zoomPano(10)} className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white rounded shadow flex items-center justify-center backdrop-blur"><ZoomOut className="h-4 w-4" /></button>
            </div>
            
            <div className="absolute bottom-4 right-4 h-16 w-16 rounded-full bg-black/70 border-2 border-white/50 flex items-center justify-center shadow-lg backdrop-blur">
              <Navigation className="h-8 w-8 text-red-500 fill-red-500 drop-shadow" style={{ transform: `rotate(${-currentGeographicHeading}deg)` }} />
            </div>

            {/* Connection Chevrons mapped from DB */}
            {active && activeConns.filter((c) => c.from_photo_id === active.id).map((c) => {
              const hotspotPixelHeading = (c.heading - (active?.heading || 0) + 360) % 360;
              const offset = ((hotspotPixelHeading - currentHeading + 540) % 360) - 180;
              if (Math.abs(offset) > 60) return null;
              
              return (
                <div key={c.id} className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden" style={{ transform: `translate(${offset * 5}px, 0)` }}>
                  <div className="h-full w-0.5 bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.8)] absolute" />
                  <div className="relative z-10 w-24 h-12 perspective-[100px] flex flex-col gap-1 items-center justify-center cursor-pointer pointer-events-auto hover:scale-110 transition-transform" onClick={() => {
                    const idx = photos.findIndex(p => p.id === c.to_photo_id);
                    if (idx !== -1) setActiveIdx(idx);
                  }}>
                    <div className="w-16 h-16 border-t-[10px] border-l-[10px] border-white origin-center rotate-45 transform skew-x-12 translate-y-6 shadow-xl opacity-90" />
                    <div className="w-16 h-16 border-t-[10px] border-l-[10px] border-white origin-center rotate-45 transform skew-x-12 -translate-y-2 shadow-xl opacity-90" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-gray-100 border-t text-gray-500 px-3 py-1.5 text-[10px] flex items-center justify-between">
            <span>Keyboard shortcuts</span>
            <span>(c) TourVista {new Date().getFullYear()}</span>
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
                    ? photos.findIndex(p => p.id === rightPendingTo) 
                    : `${photos.findIndex(p => p.id === active.id)} (ACTIVE)`
                  }
                </div>
                {/* Floating "Align & Connect" button overlay on top-right viewer to trigger middle overlay */}
                {rightPendingTo && (
                  <div className="absolute bottom-2 right-2 z-10">
                    <button
                      onClick={() => setPendingTo(rightPendingTo)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-lg hover:scale-103 active:scale-97 transition-all uppercase cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Align & Connect
                    </button>
                  </div>
                )}
                {!rightPendingTo && (
                  <div className="absolute bottom-2 right-2 z-10 bg-orange-600 text-white font-black text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg border border-orange-500 uppercase tracking-wider select-none">
                    Active Scene
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/50 text-sm gap-2">
                <MousePointer2 className="h-6 w-6 opacity-50" />
                Select scene to connect
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-2 space-y-2.5">
            {[...islands, { id: 'unassigned', name: 'Unassigned', order_index: 999 }].map((island) => {
              const islandPhotos = photos.filter(p => island.id === 'unassigned' ? !p.island_id : p.island_id === island.id);
              const unconnectedIslandPhotos = islandPhotos.filter(p => !connectedIds.has(p.id));
              if (unconnectedIslandPhotos.length === 0) return null;
              
              const isOpen = rightIslandOpen[island.id];
              
              return (
                <div key={`right-${island.id}`} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-all duration-200">
                  <div 
                    className="bg-sky-900 text-white px-3 py-2.5 flex items-center justify-between cursor-pointer text-xs font-semibold sticky top-0 z-10 hover:bg-sky-800 transition-colors"
                    onClick={() => handleToggleIsland(island.id, !!isOpen)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-sky-950 flex items-center justify-center border border-sky-800">
                        {isOpen ? <Minus className="h-3 w-3 text-sky-200" /> : <Plus className="h-3 w-3 text-sky-200" />}
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
                          <span className="font-mono bg-sky-950/80 px-1 py-0.5 rounded border border-sky-800/50">{(alignFine[0] - 5).toFixed(0)}°</span>
                        </div>
                      </div>

                      {/* Scene Cards Grid */}
                      <div className="px-2 grid grid-cols-2 gap-2">
                        {unconnectedIslandPhotos.map((p) => {
                          const idx = photos.findIndex(x => x.id === p.id);
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
                              <div className="aspect-[4/3] relative cursor-pointer overflow-hidden" onClick={() => setRightPendingTo(p.id)}>
                                <img 
                                  src={p.file_url} 
                                  alt="" 
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                />
                                
                                <div className="absolute top-2 left-2 rounded-lg bg-slate-900/90 text-white font-extrabold px-2 py-0.5 text-xs shadow-md border border-slate-700/50">
                                  {idx}
                                </div>
                                
                                <button
                                  onClick={(e) => { e.stopPropagation(); setRightPendingTo(p.id); setPendingTo(p.id); }}
                                  className="absolute top-2 right-2 h-7 w-7 rounded-lg text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 bg-emerald-500 hover:bg-emerald-600 shadow-md z-20"
                                  title="Align & Connect"
                                >
                                  <Plus className="h-4.5 w-4.5" />
                                </button>
                                
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
            })}
            {photos.length <= 1 && (
              <div className="text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 py-8">
                Upload at least 2 scenes to start building connections.
              </div>
            )}
          </div>
        </div>
      </div>

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
                onLockAll={async () => { await supabase.from("connections").update({ is_locked: true }).eq("tour_id", tourId); load(); }}
                onUnlockAll={async () => { await supabase.from("connections").update({ is_locked: false }).eq("tour_id", tourId); load(); }}
                onFitBounds={modalMap.fitBounds}
                onCenterBusiness={() => { if (tour?.latitude) modalMap.mapInstance.current?.panTo({ lat: tour.latitude, lng: tour.longitude }); }}
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
