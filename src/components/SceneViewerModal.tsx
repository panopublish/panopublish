import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, MapPin } from "lucide-react";
import { formatDateIN } from "@/lib/format";

type Photo = {
  id: string;
  file_url: string;
  filename: string | null;
  size_bytes: number | null;
  latitude: number | null;
  longitude: number | null;
  uploaded_at: string;
};

type Tab = "flat" | "360" | "raw" | "google";

declare global {
  interface Window {
    pannellum?: { viewer: (el: HTMLElement | string, cfg: unknown) => { destroy: () => void } };
  }
}

export function SceneViewerModal({
  photos,
  startIndex,
  onClose,
}: {
  photos: Photo[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [tab, setTab] = useState<Tab>("flat");
  const [loading, setLoading] = useState(false);
  const panoRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<{ destroy: () => void } | null>(null);

  const photo = photos[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photos.length, onClose]);

  // Pannellum lifecycle
  useEffect(() => {
    if (tab !== "360" || !photo) return;
    let cancelled = false;
    setLoading(true);

    const init = () => {
      if (cancelled || !panoRef.current || !window.pannellum) return;
      try {
        if (viewerRef.current) viewerRef.current.destroy();
        viewerRef.current = window.pannellum.viewer(panoRef.current, {
          type: "equirectangular",
          panorama: photo.file_url,
          autoLoad: true,
          showControls: true,
          mouseZoom: true,
          hfov: 100,
        });
      } catch (e) {
        console.error("Pannellum init failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (window.pannellum) init();
    else {
      const t = setInterval(() => {
        if (window.pannellum) {
          clearInterval(t);
          init();
        }
      }, 200);
      return () => clearInterval(t);
    }

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {
          /* noop */
        }
        viewerRef.current = null;
      }
    };
  }, [tab, photo?.id, photo?.file_url]);

  // destroy on unmount
  useEffect(
    () => () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {
          /* noop */
        }
        viewerRef.current = null;
      }
    },
    [],
  );

  if (!photo) return null;

  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex((i) => (i + 1) % photos.length);

  const tabs: { key: Tab; label: string }[] = [
    { key: "flat", label: "Flat" },
    { key: "360", label: "360°" },
    { key: "raw", label: "RAW" },
    { key: "google", label: "Google" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main viewer area */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center bg-foreground/5">
        {/* Scene number badge */}
        <div className="absolute top-4 left-4 z-10 rounded bg-foreground text-background px-2 py-0.5 text-xs font-semibold">
          {index}
        </div>

        {/* Prev / Next */}
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/80 hover:bg-background flex items-center justify-center shadow"
          aria-label="Previous"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/80 hover:bg-background flex items-center justify-center shadow"
          aria-label="Next"
        >
          <ChevronRight className="h-7 w-7" />
        </button>

        {/* Tab content */}
        {tab === "flat" && (
          <img
            src={photo.file_url}
            alt={photo.filename ?? ""}
            className="max-h-full max-w-full object-contain"
          />
        )}

        {tab === "360" && (
          <div className="relative w-full h-full">
            <div ref={panoRef} className="w-full h-full" />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}

        {tab === "raw" && (
          <div className="relative max-h-full max-w-full">
            <img src={photo.file_url} alt="" className="max-h-[80vh] max-w-full object-contain" />
            <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-foreground/80 text-background p-3 text-xs space-y-1">
              <div>
                <span className="opacity-70">Filename:</span> {photo.filename ?? "—"}
              </div>
              <div>
                <span className="opacity-70">Size:</span>{" "}
                {((photo.size_bytes ?? 0) / 1024 / 1024).toFixed(2)} MB
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="opacity-70">GPS:</span>
                {photo.latitude != null && photo.longitude != null
                  ? `${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}`
                  : "Not available"}
              </div>
              <div>
                <span className="opacity-70">Uploaded:</span> {formatDateIN(photo.uploaded_at)}
              </div>
            </div>
          </div>
        )}

        {tab === "google" && (
          <div className="text-center max-w-md p-6">
            <img
              src={photo.file_url}
              alt=""
              className="max-h-[50vh] mx-auto rounded-lg mb-4 opacity-80"
            />
            <p className="text-sm text-muted-foreground">
              This scene will appear on Google Street View after publishing. Click{" "}
              <strong>Publish to Google</strong> to make it live.
            </p>
          </div>
        )}
      </div>

      {/* Bottom label */}
      <div className="text-center py-3 text-sm font-medium border-t">
        {photo.filename ?? `Scene ${index}`}
      </div>
    </div>
  );
}
