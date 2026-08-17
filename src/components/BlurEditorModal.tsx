import React, { useEffect, useRef, useState } from "react";
import { X, Hand, Droplets, Eraser, Save, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Photo = {
  id: string;
  file_url: string;
  filename: string | null;
  file_path: string;
  island_id: string | null;
};

type EditMode = "pan" | "blur" | "erase";

// High-performance binary metadata injector to copy EXIF/XMP GPano headers from original image bytes
function copyJpegMetadataFromBytes(originalBuffer: ArrayBuffer, newBuffer: ArrayBuffer): Blob {
  try {
    const originalBytes = new Uint8Array(originalBuffer);

    // 1. Parse original JPEG APP segments
    if (originalBytes[0] !== 0xff || originalBytes[1] !== 0xd8) {
      return new Blob([newBuffer], { type: "image/jpeg" });
    }

    const appSegments: Uint8Array[] = [];
    let pos = 2;
    while (pos < originalBytes.length) {
      if (originalBytes[pos] === 0xff) {
        const marker = originalBytes[pos + 1];
        if (marker >= 0xe0 && marker <= 0xef) {
          const length = (originalBytes[pos + 2] << 8) + originalBytes[pos + 3];
          const segment = originalBytes.slice(pos, pos + 2 + length);
          appSegments.push(segment);
          pos += 2 + length;
        } else if (marker === 0xd9 || marker === 0xda) {
          break;
        } else {
          const length = (originalBytes[pos + 2] << 8) + originalBytes[pos + 3];
          pos += 2 + length;
        }
      } else {
        pos++;
      }
    }

    // 2. Parse new JPEG array buffer (from canvas)
    const newBytes = new Uint8Array(newBuffer);
    if (newBytes[0] !== 0xff || newBytes[1] !== 0xd8) {
      return new Blob([newBuffer], { type: "image/jpeg" });
    }

    let newPos = 2;
    let imageStartPos = 2;
    while (newPos < newBytes.length) {
      if (newBytes[newPos] === 0xff) {
        const marker = newBytes[newPos + 1];
        if (marker >= 0xe0 && marker <= 0xef) {
          const length = (newBytes[newPos + 2] << 8) + newBytes[newPos + 3];
          newPos += 2 + length;
        } else {
          imageStartPos = newPos;
          break;
        }
      } else {
        newPos++;
      }
    }

    // 3. Reconstruct JPEG with headers preserved
    const headerSize = appSegments.reduce((sum, seg) => sum + seg.length, 0);
    const finalSize = 2 + headerSize + (newBytes.length - imageStartPos);
    const finalBytes = new Uint8Array(finalSize);

    finalBytes[0] = 0xff;
    finalBytes[1] = 0xd8;

    let writePos = 2;
    for (const segment of appSegments) {
      finalBytes.set(segment, writePos);
      writePos += segment.length;
    }
    finalBytes.set(newBytes.subarray(imageStartPos), writePos);

    return new Blob([finalBytes], { type: "image/jpeg" });
  } catch (err) {
    console.error("Error copy-pasting JPEG metadata:", err);
    return new Blob([newBuffer], { type: "image/jpeg" });
  }
}

declare global {
  interface Window {
    pannellum?: { viewer: (el: string | HTMLElement, cfg: unknown) => { destroy: () => void } };
  }
}

function ensurePannellumLoaded(): Promise<void> {
  if (typeof window !== "undefined" && window.pannellum) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") return resolve();

    if (!document.getElementById("pannellum-css")) {
      const link = document.createElement("link");
      link.id = "pannellum-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
      document.head.appendChild(link);
    }

    if (window.pannellum) {
      resolve();
      return;
    }

    const existingScript = document.getElementById("pannellum-js") as HTMLScriptElement;
    if (existingScript) {
      if (window.pannellum) {
        resolve();
      } else {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Pannellum JS")));
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "pannellum-js";
    script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Pannellum JS"));
    document.head.appendChild(script);
  });
}

export function BlurEditorModal({
  photo,
  onClose,
  onSave,
}: {
  photo: Photo;
  onClose: () => void;
  onSave: (blob: Blob) => Promise<void>;
}) {
  const [mode, setMode] = useState<EditMode>("pan");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brushSize, setBrushSize] = useState(15);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [blurStrength, setBlurStrength] = useState(10);

  const [heading, setHeading] = useState(0);
  const [pitch, setPitch] = useState(0);

  const panoRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<any>(null);

  // In-memory original buffer & full-res image
  const originalBufferRef = useRef<ArrayBuffer | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);

  // Working resolution editing canvases (Max width 2048 for 60 FPS editing performance)
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const blurredImageRef = useRef<HTMLCanvasElement | null>(null);

  // Drawing state
  const isDrawingRef = useRef(false);
  const strokePointsRef = useRef<{ pitch: number; yaw: number }[]>([]);
  const lastScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  const sliderTimerRef = useRef<NodeJS.Timeout | null>(null);

  const applyBlurStrength = (strength: number) => {
    const img = originalImageRef.current;
    const blurredCanvas = blurredImageRef.current;
    if (!img || !blurredCanvas) return;
    const blurredCtx = blurredCanvas.getContext("2d");
    if (blurredCtx) {
      blurredCtx.clearRect(0, 0, blurredCanvas.width, blurredCanvas.height);
      blurredCtx.filter = `blur(${strength}px)`;
      blurredCtx.drawImage(img, 0, 0, blurredCanvas.width, blurredCanvas.height);
      blurredCtx.filter = "none";
    }
  };

  const handleBlurStrengthChange = (strength: number) => {
    setBlurStrength(strength);
    if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
    sliderTimerRef.current = setTimeout(() => {
      applyBlurStrength(strength);
      rebuildDisplayCanvas();
      reloadPannellumTexture();
    }, 50);
  };

  // Pre-fetch original image buffer and initialize editor
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function loadResources() {
      try {
        await ensurePannellumLoaded();
        if (cancelled) return;

        // Concurrently fetch original buffer for EXIF metadata preservation
        fetch(photo.file_url)
          .then((r) => r.arrayBuffer())
          .then((buf) => {
            if (!cancelled) originalBufferRef.current = buf;
          })
          .catch((err) => console.warn("Buffer fetch fallback:", err));

        // Load image via HTML Image element for instant browser-cached decoding
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = photo.file_url;

        img.onload = () => {
          if (cancelled) return;
          originalImageRef.current = img;

          // Compute editing resolution (Max 2048 width for ultra-smooth rendering)
          const maxDim = 2048;
          let w = img.width;
          let h = img.height;
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }

          // 1. Working Display Canvas
          const displayCanvas = document.createElement("canvas");
          displayCanvas.width = w;
          displayCanvas.height = h;
          const displayCtx = displayCanvas.getContext("2d");
          if (displayCtx) {
            displayCtx.drawImage(img, 0, 0, w, h);
          }
          displayCanvasRef.current = displayCanvas;

          // 2. Working Blurred Reference
          const blurredCanvas = document.createElement("canvas");
          blurredCanvas.width = w;
          blurredCanvas.height = h;
          const blurredCtx = blurredCanvas.getContext("2d");
          if (blurredCtx) {
            blurredCtx.filter = `blur(${blurStrength}px)`;
            blurredCtx.drawImage(img, 0, 0, w, h);
            blurredCtx.filter = "none";
          }
          blurredImageRef.current = blurredCanvas;

          // 3. Mask Canvas
          const maskCanvas = document.createElement("canvas");
          maskCanvas.width = w;
          maskCanvas.height = h;
          const maskCtx = maskCanvas.getContext("2d");
          if (maskCtx) {
            maskCtx.clearRect(0, 0, w, h);
          }
          maskCanvasRef.current = maskCanvas;

          // 4. Initialize 360 viewer directly
          initPannellum(photo.file_url);
        };

        img.onerror = () => {
          if (cancelled) return;
          toast.error("Failed to load panoramic image for editing.");
          setLoading(false);
        };
      } catch (e) {
        if (cancelled) return;
        console.error("Error loading editor resources:", e);
        toast.error("Network error loading image.");
        setLoading(false);
      }
    }

    loadResources();

    return () => {
      cancelled = true;
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {}
      }
    };
  }, [photo.id, photo.file_url]);

  // Initializing Pannellum
  const initPannellum = (url: string) => {
    if (!panoRef.current || !window.pannellum) {
      setLoading(false);
      return;
    }
    try {
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }

      viewerRef.current = window.pannellum.viewer(panoRef.current, {
        type: "equirectangular",
        panorama: url,
        autoLoad: true,
        showControls: false,
        mouseZoom: true,
        hfov: 100,
        yaw: 0,
        pitch: 0,
      });

      viewerRef.current.on("load", () => {
        setLoading(false);
        updateDirectionReadouts();
      });
      viewerRef.current.on("error", () => {
        setLoading(false);
      });
      viewerRef.current.on("animatefinished", updateDirectionReadouts);
      viewerRef.current.on("zoomchange", updateDirectionReadouts);

      const t = setInterval(() => {
        if (viewerRef.current) {
          try {
            setHeading((viewerRef.current.getYaw() + 360) % 360);
            setPitch(viewerRef.current.getPitch());
          } catch {}
        }
      }, 250);

      // Fallback timeout to guarantee spinner is hidden
      setTimeout(() => setLoading(false), 500);

      return () => clearInterval(t);
    } catch (err) {
      console.error("Pannellum init error", err);
      setLoading(false);
    }
  };

  const updateDirectionReadouts = () => {
    if (!viewerRef.current) return;
    try {
      setHeading((viewerRef.current.getYaw() + 360) % 360);
      setPitch(viewerRef.current.getPitch());
    } catch {}
  };

  // Instant blob-based texture update while maintaining camera POV
  const reloadPannellumTexture = () => {
    if (!viewerRef.current || !displayCanvasRef.current || !panoRef.current || !window.pannellum)
      return;

    displayCanvasRef.current.toBlob(
      (blob) => {
        if (!blob || !viewerRef.current || !panoRef.current || !window.pannellum) return;

        const newObjectUrl = URL.createObjectURL(blob);
        const yaw = viewerRef.current.getYaw();
        const pitch = viewerRef.current.getPitch();
        const hfov = viewerRef.current.getHfov();

        // Revoke old object URL to prevent memory leaks
        if (currentObjectUrlRef.current) {
          URL.revokeObjectURL(currentObjectUrlRef.current);
        }
        currentObjectUrlRef.current = newObjectUrl;

        try {
          viewerRef.current.destroy();
          viewerRef.current = window.pannellum.viewer(panoRef.current, {
            type: "equirectangular",
            panorama: newObjectUrl,
            autoLoad: true,
            showControls: false,
            mouseZoom: true,
            yaw: yaw,
            pitch: pitch,
            hfov: hfov,
          });
        } catch (err) {
          console.warn("Failed to update panorama texture", err);
        }
      },
      "image/jpeg",
      0.85,
    );
  };

  // Composite working blurred canvas masked onto display canvas
  const rebuildDisplayCanvas = () => {
    const displayCanvas = displayCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const originalImg = originalImageRef.current;
    const blurredCanvas = blurredImageRef.current;

    if (!displayCanvas || !maskCanvas || !originalImg || !blurredCanvas) return;

    const ctx = displayCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    ctx.drawImage(originalImg, 0, 0, displayCanvas.width, displayCanvas.height);

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = displayCanvas.width;
    tempCanvas.height = displayCanvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx) {
      tempCtx.drawImage(blurredCanvas, 0, 0);
      tempCtx.globalCompositeOperation = "destination-in";
      tempCtx.drawImage(maskCanvas, 0, 0);
      tempCtx.globalCompositeOperation = "source-over";

      ctx.drawImage(tempCanvas, 0, 0);
    }
  };

  // Real-time overlay canvas interactions
  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === "pan" || !viewerRef.current || !overlayCanvasRef.current) return;

    isDrawingRef.current = true;
    strokePointsRef.current = [];

    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    lastScreenPosRef.current = { x: localX, y: localY };
    setMousePos({ x: localX, y: localY });

    const coords = viewerRef.current.mouseEventToCoords(e.nativeEvent);
    if (coords) {
      strokePointsRef.current.push({ pitch: coords[0], yaw: coords[1] });
    }

    drawBrushOnScreen(localX, localY, localX, localY);
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!overlayCanvasRef.current || !viewerRef.current) return;

    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    setMousePos({ x: localX, y: localY });

    if (!isDrawingRef.current) return;

    const lastPos = lastScreenPosRef.current || { x: localX, y: localY };

    const coords = viewerRef.current.mouseEventToCoords(e.nativeEvent);
    if (coords) {
      strokePointsRef.current.push({ pitch: coords[0], yaw: coords[1] });
    }

    drawBrushOnScreen(lastPos.x, lastPos.y, localX, localY);
    lastScreenPosRef.current = { x: localX, y: localY };
  };

  const handleOverlayMouseUpOrLeave = () => {
    setMousePos(null);

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastScreenPosRef.current = null;

    if (mode === "blur" || mode === "erase") {
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        bakeStrokeToCanvas(maskCanvas, mode);
        rebuildDisplayCanvas();
        reloadPannellumTexture();
      }
    }

    clearScreenOverlay();
  };

  const drawBrushOnScreen = (x1: number, y1: number, x2: number, y2: number) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = mode === "blur" ? "rgba(2, 119, 189, 0.4)" : "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = brushSize * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const clearScreenOverlay = () => {
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const bakeStrokeToCanvas = (targetCanvas: HTMLCanvasElement, strokeMode: "blur" | "erase") => {
    const points = strokePointsRef.current;
    if (points.length === 0 || !viewerRef.current) return;

    const ctx = targetCanvas.getContext("2d");
    if (!ctx) return;

    const W = targetCanvas.width;
    const H = targetCanvas.height;

    const containerWidth = viewerRef.current.getContainer().clientWidth || 1000;
    const hfov = viewerRef.current.getHfov() || 100;
    const equirectangularBrushSize = (brushSize / containerWidth) * (hfov / 360) * W;

    ctx.lineWidth = equirectangularBrushSize * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (strokeMode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "white";
    }

    ctx.beginPath();
    const startPx = mapSphereToEquirectangular(points[0].pitch, points[0].yaw, W, H);
    ctx.moveTo(startPx.x, startPx.y);

    for (let i = 1; i < points.length; i++) {
      const px = mapSphereToEquirectangular(points[i].pitch, points[i].yaw, W, H);
      const prevPx = mapSphereToEquirectangular(points[i - 1].pitch, points[i - 1].yaw, W, H);

      if (Math.abs(px.x - prevPx.x) > W * 0.8) {
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px.x, px.y);
      } else {
        ctx.lineTo(px.x, px.y);
      }
    }

    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  };

  const mapSphereToEquirectangular = (pitch: number, yaw: number, W: number, H: number) => {
    let normYaw = yaw;
    while (normYaw < -180) normYaw += 360;
    while (normYaw > 180) normYaw -= 360;

    const x = ((normYaw + 180) / 360) * W;
    const y = ((90 - pitch) / 180) * H;

    return { x, y };
  };

  useEffect(() => {
    if (loading) return;
    const resize = () => {
      const canvas = overlayCanvasRef.current;
      const pano = panoRef.current;
      if (canvas && pano) {
        canvas.width = pano.clientWidth;
        canvas.height = pano.clientHeight;
      }
    };

    window.addEventListener("resize", resize);
    setTimeout(resize, 200);

    return () => window.removeEventListener("resize", resize);
  }, [loading]);

  // Full-resolution high-quality export on Save
  const handleSave = async () => {
    const originalImg = originalImageRef.current;
    const maskCanvas = maskCanvasRef.current;
    const originalBuffer = originalBufferRef.current;

    if (!originalImg || !maskCanvas || !originalBuffer) {
      return toast.error("Image resources not ready.");
    }

    setSaving(true);

    try {
      const fullW = originalImg.width;
      const fullH = originalImg.height;

      // 1. Create full-resolution blurred image
      const fullBlurredCanvas = document.createElement("canvas");
      fullBlurredCanvas.width = fullW;
      fullBlurredCanvas.height = fullH;
      const fullBlurredCtx = fullBlurredCanvas.getContext("2d");
      if (!fullBlurredCtx) throw new Error("Could not get canvas context");

      // Scale blur radius proportionally for full resolution
      const scaleFactor = fullW / maskCanvas.width;
      const fullBlurRadius = blurStrength * scaleFactor;

      fullBlurredCtx.filter = `blur(${fullBlurRadius}px)`;
      fullBlurredCtx.drawImage(originalImg, 0, 0, fullW, fullH);
      fullBlurredCtx.filter = "none";

      // 2. Create full-resolution mask canvas
      const fullMaskCanvas = document.createElement("canvas");
      fullMaskCanvas.width = fullW;
      fullMaskCanvas.height = fullH;
      const fullMaskCtx = fullMaskCanvas.getContext("2d");
      if (fullMaskCtx) {
        fullMaskCtx.drawImage(maskCanvas, 0, 0, fullW, fullH);
      }

      // 3. Composite full-resolution final image
      const fullFinalCanvas = document.createElement("canvas");
      fullFinalCanvas.width = fullW;
      fullFinalCanvas.height = fullH;
      const fullFinalCtx = fullFinalCanvas.getContext("2d");
      if (!fullFinalCtx) throw new Error("Could not get final canvas context");

      fullFinalCtx.drawImage(originalImg, 0, 0, fullW, fullH);

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = fullW;
      tempCanvas.height = fullH;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.drawImage(fullBlurredCanvas, 0, 0);
        tempCtx.globalCompositeOperation = "destination-in";
        tempCtx.drawImage(fullMaskCanvas, 0, 0);
        tempCtx.globalCompositeOperation = "source-over";

        fullFinalCtx.drawImage(tempCanvas, 0, 0);
      }

      // 4. Export JPEG Blob
      fullFinalCanvas.toBlob(
        async (newBlob) => {
          if (!newBlob) {
            toast.error("Failed to generate image file.");
            setSaving(false);
            return;
          }
          try {
            const newArrayBuffer = await newBlob.arrayBuffer();

            // In-memory JPEG metadata injection (0 network calls!)
            const finalMetadataBlob = copyJpegMetadataFromBytes(originalBuffer, newArrayBuffer);
            await onSave(finalMetadataBlob);
          } catch (err: any) {
            toast.error("Error saving image: " + err.message);
            setSaving(false);
          }
        },
        "image/jpeg",
        0.95,
      );
    } catch (err: any) {
      toast.error("Error preparing image export: " + err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      {/* Uploading & Processing Indicator */}
      {saving && (
        <div className="absolute inset-0 z-55 flex items-center justify-center bg-white/95 backdrop-blur-xs select-none">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center justify-center border text-center border-slate-100 animate-fade-in">
            <div className="relative w-24 h-12 bg-slate-100 rounded-lg overflow-hidden border flex items-center justify-center mb-6">
              {photo.file_url ? (
                <img src={photo.file_url} alt="" className="w-full h-full object-cover opacity-60" />
              ) : (
                <div className="w-full h-full bg-slate-200" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-200">
                <div className="h-full bg-emerald-500 animate-[pulse_1.5s_infinite] w-full" />
              </div>
            </div>

            <h3 className="text-xl font-black text-slate-800 tracking-tight leading-snug mb-2">
              Sit back and relax for a moment.
            </h3>
            <p className="text-sm font-semibold text-slate-500 mb-6">Your image is uploading now!</p>

            <div className="w-full max-w-[280px] aspect-[4/3] rounded-2xl overflow-hidden relative flex items-center justify-center bg-slate-50 border border-slate-100 shadow-inner">
              <img
                src="/robot_beach_upload.webp"
                alt="Robot Relaxing on Beach illustration"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center gap-2 text-slate-400 mt-6 font-bold text-xs">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> PROCESSING IMAGE...
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#0277bd] text-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col h-[85vh] relative animate-scale-up">
        {/* TOP BAR */}
        <div className="px-4 py-3 bg-[#01579b]/80 border-b border-white/10 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-2 bg-[#002f56]/40 p-1 rounded-xl">
            <button
              onClick={() => setMode("pan")}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === "pan" ? "bg-white text-[#01579b] shadow" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Hand className="h-4 w-4" /> Pan
            </button>
            <button
              onClick={() => setMode("blur")}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === "blur" ? "bg-white text-[#01579b] shadow" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Droplets className="h-4 w-4" /> Blur
            </button>
            <button
              onClick={() => setMode("erase")}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === "erase" ? "bg-white text-[#01579b] shadow" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Eraser className="h-4 w-4" /> Erase
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-[#8bc34a] hover:bg-[#7cb342] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-1 shadow cursor-pointer active:scale-97 transition-all"
            >
              <Save className="h-4 w-4" /> Save
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-1 shadow cursor-pointer active:scale-97 transition-all"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>

        {/* 360 VIEWER VIEWPORT */}
        <div className="flex-1 min-h-0 relative bg-slate-950 flex items-center justify-center overflow-hidden">
          <div ref={panoRef} className="absolute inset-0 w-full h-full" />

          {mode !== "pan" && (
            <canvas
              ref={overlayCanvasRef}
              onMouseDown={handleOverlayMouseDown}
              onMouseMove={handleOverlayMouseMove}
              onMouseUp={handleOverlayMouseUpOrLeave}
              onMouseLeave={handleOverlayMouseUpOrLeave}
              className="absolute inset-0 w-full h-full z-10 pointer-events-auto cursor-none"
            />
          )}

          {mode !== "pan" && mousePos && !loading && (
            <div
              style={{
                position: "absolute",
                left: mousePos.x,
                top: mousePos.y,
                width: brushSize * 2,
                height: brushSize * 2,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                borderRadius: "50%",
                border: "1.5px solid rgba(0, 0, 0, 0.8)",
                boxShadow: "0 0 0 1.5px rgba(255, 255, 255, 0.9)",
                zIndex: 40,
              }}
            />
          )}

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3 z-30">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <span className="text-xs font-semibold text-white/80">Loading 360 Viewport...</span>
            </div>
          )}

          {mode !== "pan" && !loading && (
            <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/10 z-20 flex items-center gap-2 select-none pointer-events-none uppercase tracking-wide">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              {`Draw on panorama to apply ${mode === "blur" ? "blur" : "erase"}. Release mouse to update texture.`}
            </div>
          )}
        </div>

        {/* BOTTOM METADATA BAR */}
        <div className="px-4 py-3 bg-[#01579b]/80 border-t border-white/10 flex items-center justify-between text-xs flex-shrink-0 z-10 select-none">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-bold">
              <span>Heading:</span>
              <span className="bg-[#002f56]/30 px-2 py-0.5 rounded border border-white/5 font-mono w-14 text-center block">
                {Math.round(heading)}°
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span>Pitch:</span>
              <span className="bg-[#002f56]/30 px-2 py-0.5 rounded border border-white/5 font-mono w-12 text-center block">
                {Math.round(pitch)}°
              </span>
            </div>
          </div>

          {mode === "blur" && (
            <div className="flex items-center gap-2.5 font-bold mr-4">
              <span>Blur Strength:</span>
              <input
                type="range"
                min="5"
                max="50"
                value={blurStrength}
                onChange={(e) => handleBlurStrengthChange(parseInt(e.target.value))}
                className="w-24 accent-white cursor-pointer h-1 bg-white/20 rounded-lg appearance-none outline-none focus:ring-0"
              />
              <span className="font-mono bg-[#002f56]/30 px-1.5 py-0.5 rounded border border-white/5 w-10 text-center block">
                {blurStrength}px
              </span>
            </div>
          )}

          {mode !== "pan" && (
            <div className="flex items-center gap-2.5 font-bold">
              <span>Brush Size:</span>
              <input
                type="range"
                min="10"
                max="60"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-24 accent-white cursor-pointer h-1 bg-white/20 rounded-lg appearance-none outline-none focus:ring-0"
              />
              <span className="font-mono bg-[#002f56]/30 px-1.5 py-0.5 rounded border border-white/5 w-8 text-center block">
                {brushSize}px
              </span>
            </div>
          )}

          <div className="text-white/60 font-medium font-mono text-[10px] hidden sm:block">{photo.filename}</div>
        </div>
      </div>
    </div>
  );
}
