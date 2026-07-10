import { useEffect, useRef, useCallback, useState, RefObject } from "react";
import { PanoramaNode, Connection, MapMode } from "../types/panorama";
import {
  IPanoramaOverlayManager,
  createPanoramaOverlayManager,
} from "../lib/PanoramaOverlayManager";

export function usePanoramaMap(
  mapRef: RefObject<HTMLDivElement | null>,
  options: {
    nodes: PanoramaNode[];
    connections: Connection[];
    activeNodeId: string | null;
    selectedConnection?: { fromId: string; toId: string } | null;
    onNodeSelect: (id: string) => void;
    onNodeMove: (id: string, lat: number, lng: number) => void;
    onNodeRotate?: (heading: number) => void;
    onQuickConnect?: (fromId: string, toId: string) => void;
    onConnectionSelect?: (fromId: string | null, toId: string | null) => void;
    centerLat?: number;
    centerLng?: number;
    mapsReady?: boolean;
  },
) {
  const mapInstanceRef = useRef<any>(null);
  const overlayRef = useRef<IPanoramaOverlayManager | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Store fresh callbacks in refs to avoid stale closures in custom overlay
  const onNodeSelectRef = useRef(options.onNodeSelect);
  const onNodeMoveRef = useRef(options.onNodeMove);
  const onNodeRotateRef = useRef(options.onNodeRotate);
  const onQuickConnectRef = useRef(options.onQuickConnect);
  const onConnectionSelectRef = useRef(options.onConnectionSelect);

  // Keep references always updated to the freshest values
  useEffect(() => {
    onNodeSelectRef.current = options.onNodeSelect;
    onNodeMoveRef.current = options.onNodeMove;
    onNodeRotateRef.current = options.onNodeRotate;
    onQuickConnectRef.current = options.onQuickConnect;
    onConnectionSelectRef.current = options.onConnectionSelect;
  }, [
    options.onNodeSelect,
    options.onNodeMove,
    options.onNodeRotate,
    options.onQuickConnect,
    options.onConnectionSelect,
  ]);

  // Initialize Google Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !window.google?.maps) return;

    const lat = options.centerLat ?? 20.5937;
    const lng = options.centerLng ?? 78.9629;

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 19,
      mapTypeId: "roadmap",
      disableDefaultUI: true,
      gestureHandling: "greedy",
    });

    // Clear connection selection when clicking on empty map area
    window.google.maps.event.addListener(mapInstanceRef.current, "click", () => {
      onConnectionSelectRef.current?.(null, null);
    });

    // Initialize overlay
    overlayRef.current = createPanoramaOverlayManager({
      nodes: options.nodes,
      connections: options.connections,
      activeNodeId: options.activeNodeId,
      selectedConnection: options.selectedConnection,
      onNodeClick: (id) => {
        // Clear connection selection when a node is clicked
        onConnectionSelectRef.current?.(null, null);
        onNodeSelectRef.current(id);
      },
      onNodeDrag: (id, lat, lng) => {
        onNodeMoveRef.current(id, lat, lng);
      },
      onRotateActiveNode: (heading) => {
        onNodeRotateRef.current?.(heading);
      },
      onQuickConnect: (fromId, toId) => {
        onQuickConnectRef.current?.(fromId, toId);
      },
      onConnectionSelect: (fromId, toId) => {
        onConnectionSelectRef.current?.(fromId, toId);
      },
    });

    overlayRef.current.setMap(mapInstanceRef.current);

    // Trigger redraws on bounds change
    window.google.maps.event.addListener(mapInstanceRef.current, "bounds_changed", () => {
      overlayRef.current?.draw();
    });

    // Handle map resize observer for canvas matching
    const resizeObserver = new ResizeObserver(() => {
      overlayRef.current?.draw();
    });
    resizeObserver.observe(mapRef.current);

    setMapReady(true);

    return () => {
      resizeObserver.disconnect();
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
      }
      mapInstanceRef.current = null;
    };
  }, [mapRef, options.mapsReady]); // Re-run when mapsReady becomes true

  // Update overlay when nodes/connections/active change
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.updateNodes(
        options.nodes,
        options.connections,
        options.activeNodeId,
        options.selectedConnection,
      );
    }
  }, [options.nodes, options.connections, options.activeNodeId, options.selectedConnection]);

  // Expose fitBounds
  const fitBounds = useCallback(() => {
    if (!mapInstanceRef.current || options.nodes.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    options.nodes.forEach((n) => bounds.extend({ lat: n.lat, lng: n.lng }));
    mapInstanceRef.current.fitBounds(bounds, 60); // 60px padding
  }, [options.nodes]);

  // Expose centerOnNode
  const centerOnNode = useCallback(
    (nodeId: string) => {
      const node = options.nodes.find((n) => n.id === nodeId);
      if (node && mapInstanceRef.current) {
        mapInstanceRef.current.panTo({ lat: node.lat, lng: node.lng });
      }
    },
    [options.nodes],
  );

  const setMode = useCallback((mode: MapMode) => {
    if (overlayRef.current) {
      overlayRef.current.setMode(mode);
    }
  }, []);

  return { fitBounds, centerOnNode, setMode, mapInstance: mapInstanceRef, mapReady };
}
