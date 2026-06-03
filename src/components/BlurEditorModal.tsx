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

// High-performance binary metadata injector to copy EXIF/XMP GPano headers from original image to blurred canvas image
async function copyJpegMetadata(originalUrl: string, newBlob: Blob): Promise<Blob> {
  try {
    // 1. Fetch original image array buffer
    const originalRes = await fetch(originalUrl);
    const originalBuffer = await originalRes.arrayBuffer();
    const originalBytes = new Uint8Array(originalBuffer);

    // 2. Parse original JPEG APP segments
    if (originalBytes[0] !== 0xFF || originalBytes[1] !== 0xD8) {
      console.warn("Original image is not a valid JPEG. Skipping metadata injection.");
      return newBlob;
    }

    const appSegments: Uint8Array[] = [];
    let pos = 2;
    while (pos < originalBytes.length) {
      if (originalBytes[pos] === 0xFF) {
        const marker = originalBytes[pos + 1];
        
        // APP segments are 0xFFE0 to 0xFFEF
        if (marker >= 0xE0 && marker <= 0xEF) {
          const length = (originalBytes[pos + 2] << 8) + originalBytes[pos + 3];
          const segment = originalBytes.slice(pos, pos + 2 + length);
          appSegments.push(segment);
          pos += 2 + length;
        } else if (marker === 0xD9 || marker === 0xDA) {
          // End of headers
          break;
        } else {
          // Other segment, skip it
          const length = (originalBytes[pos + 2] << 8) + originalBytes[pos + 3];
          pos += 2 + length;
        }
      } else {
        pos++;
      }
    }

    // 3. Parse new JPEG array buffer (from canvas)
    const newBuffer = await newBlob.arrayBuffer();
    const newBytes = new Uint8Array(newBuffer);

    if (newBytes[0] !== 0xFF || newBytes[1] !== 0xD8) {
      console.warn("New canvas image is not a valid JPEG. Skipping metadata injection.");
      return newBlob;
    }

    // Find the first segment in the new JPEG that is NOT an APP segment
    let newPos = 2;
    let imageStartPos = 2;
    while (newPos < newBytes.length) {
      if (newBytes[newPos] === 0xFF) {
        const marker = newBytes[newPos + 1];
        if (marker >= 0xE0 && marker <= 0xEF) {
          const length = (newBytes[newPos + 2] << 8) + newBytes[newPos + 3];
          newPos += 2 + length;
        } else {
          // Found first non-APP segment (e.g., DQT 0xFFDB, SOF 0xFFC0, etc.)
          imageStartPos = newPos;
          break;
        }
      } else {
        newPos++;
      }
    }

    // 4. Reconstruct the JPEG binary
    const headerSize = appSegments.reduce((sum, seg) => sum + seg.length, 0);
    const finalSize = 2 + headerSize + (newBytes.length - imageStartPos);
    const finalBytes = new Uint8Array(finalSize);

    // Write SOI
    finalBytes[0] = 0xFF;
    finalBytes[1] = 0xD8;

    // Write original APP segments
    let writePos = 2;
    for (const segment of appSegments) {
      finalBytes.set(segment, writePos);
      writePos += segment.length;
    }

    // Write the remaining image data from the new canvas JPEG
    finalBytes.set(newBytes.subarray(imageStartPos), writePos);

    // Return the new Blob with preserved metadata!
    return new Blob([finalBytes], { type: "image/jpeg" });
  } catch (err) {
    console.error("Error copy-pasting JPEG metadata:", err);
    return newBlob; // Fallback
  }
}

declare global {
  interface Window {
    pannellum?: { viewer: (el: string | HTMLElement, cfg: unknown) => { destroy: () => void; }; };
  }
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
  const [brushSize, setBrushSize] = useState(25); // Screen pixels radius
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  
  // Heading and Pitch readout states
  const [heading, setHeading] = useState(0);
  const [pitch, setPitch] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const panoRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<any>(null);

  // Equirectangular Canvas references for backing editor state
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const blurredImageRef = useRef<HTMLCanvasElement | null>(null);

  // Drawing state
  const isDrawingRef = useRef(false);
  const strokePointsRef = useRef<{ pitch: number; yaw: number }[]>([]);
  const lastScreenPosRef = useRef<{ x: number; y: number } | null>(null);

  // Load and prepare canvases
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = photo.file_url;
    img.onload = () => {
      if (cancelled) return;
      originalImageRef.current = img;

      // 1. Display Canvas (updates Pannellum texture)
      const displayCanvas = document.createElement("canvas");
      displayCanvas.width = img.width;
      displayCanvas.height = img.height;
      const displayCtx = displayCanvas.getContext("2d");
      if (displayCtx) {
        displayCtx.drawImage(img, 0, 0);
      }
      displayCanvasRef.current = displayCanvas;

      // 2. Blurred reference image
      const blurredCanvas = document.createElement("canvas");
      blurredCanvas.width = img.width;
      blurredCanvas.height = img.height;
      const blurredCtx = blurredCanvas.getContext("2d");
      if (blurredCtx) {
        // Modern canvas blur filter (light blur for professional styling)
        blurredCtx.filter = "blur(5px)";
        blurredCtx.drawImage(img, 0, 0);
      }
      blurredImageRef.current = blurredCanvas;

      // 3. Mask Canvas
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;
      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        maskCtx.clearRect(0, 0, img.width, img.height);
      }
      maskCanvasRef.current = maskCanvas;

      // 4. Initialize 360 viewer
      initPannellum(photo.file_url);
    };

    img.onerror = () => {
      if (cancelled) return;
      toast.error("Failed to load panoramic image for editing.");
      setLoading(false);
    };

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {}
      }
    };
  }, [photo.id, photo.file_url]);

  // Initializing Pannellum
  const initPannellum = (url: string) => {
    if (!panoRef.current || !window.pannellum) return;
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

      viewerRef.current.on("animatefinished", updateDirectionReadouts);
      viewerRef.current.on("zoomchange", updateDirectionReadouts);
      
      // Update reading parameters continuously
      const t = setInterval(() => {
        if (viewerRef.current) {
          try {
            setHeading((viewerRef.current.getYaw() + 360) % 360);
            setPitch(viewerRef.current.getPitch());
          } catch {}
        }
      }, 200);

      setLoading(false);
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

  // Re-load config in Pannellum with updated canvas data URL while keeping viewport
  const reloadPannellumTexture = () => {
    if (!viewerRef.current || !displayCanvasRef.current || !panoRef.current || !window.pannellum) return;
    try {
      const dataUrl = displayCanvasRef.current.toDataURL("image/jpeg", 0.9);
      const yaw = viewerRef.current.getYaw();
      const pitch = viewerRef.current.getPitch();
      const hfov = viewerRef.current.getHfov();

      viewerRef.current.destroy();

      viewerRef.current = window.pannellum.viewer(panoRef.current, {
        type: "equirectangular",
        panorama: dataUrl,
        autoLoad: true,
        showControls: false,
        mouseZoom: true,
        yaw: yaw,
        pitch: pitch,
        hfov: hfov,
      });
    } catch (err) {
      console.warn("Failed to reload Pannellum panorama texture", err);
    }
  };

  // Draw continuous lines on display canvas using mask composition
  const rebuildDisplayCanvas = () => {
    const displayCanvas = displayCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const originalImg = originalImageRef.current;
    const blurredCanvas = blurredImageRef.current;

    if (!displayCanvas || !maskCanvas || !originalImg || !blurredCanvas) return;

    const ctx = displayCanvas.getContext("2d");
    if (!ctx) return;

    // 1. Draw base original image
    ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    ctx.drawImage(originalImg, 0, 0);

    // 2. Composite blurred reference masked by maskCanvas
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

  // Screen mouse events handlers
  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === "pan" || !viewerRef.current || !overlayCanvasRef.current) return;

    isDrawingRef.current = true;
    strokePointsRef.current = [];
    
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    
    lastScreenPosRef.current = { x: localX, y: localY };
    setMousePos({ x: localX, y: localY });

    // Record starting coordinates
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

    // Always update mouse position to position the brush circle ring dynamically
    setMousePos({ x: localX, y: localY });

    if (!isDrawingRef.current) return;

    const lastPos = lastScreenPosRef.current || { x: localX, y: localY };

    // Record yaw/pitch coordinate
    const coords = viewerRef.current.mouseEventToCoords(e.nativeEvent);
    if (coords) {
      strokePointsRef.current.push({ pitch: coords[0], yaw: coords[1] });
    }

    drawBrushOnScreen(lastPos.x, lastPos.y, localX, localY);
    lastScreenPosRef.current = { x: localX, y: localY };
  };

  const handleOverlayMouseUpOrLeave = () => {
    // Clear cursor ring if mouse leaves/up
    setMousePos(null);

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastScreenPosRef.current = null;

    // Bake the stroke coordinates to the 2D equirectangular mask canvas
    bakeStrokeToEquirectangular();

    // Rebuild texture and reload Pannellum
    rebuildDisplayCanvas();
    reloadPannellumTexture();

    // Clear overlay canvas
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

  // Convert all gathered stroke coordinates to equirectangular pixel drawings
  const bakeStrokeToEquirectangular = () => {
    const maskCanvas = maskCanvasRef.current;
    const points = strokePointsRef.current;
    if (!maskCanvas || points.length === 0 || !viewerRef.current) return;

    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;

    const W = maskCanvas.width;
    const H = maskCanvas.height;

    // Scale brush size relative to image size vs container width
    const containerWidth = viewerRef.current.getContainer().clientWidth || 1000;
    const hfov = viewerRef.current.getHfov() || 100;
    
    // Physical mapping of brush size
    const equirectangularBrushSize = (brushSize / containerWidth) * (hfov / 360) * W;

    ctx.lineWidth = equirectangularBrushSize * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (mode === "erase") {
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
      
      // Handle equirectangular seams wrapping horizontally
      const prevPx = mapSphereToEquirectangular(points[i - 1].pitch, points[i - 1].yaw, W, H);
      if (Math.abs(px.x - prevPx.x) > W * 0.8) {
        // Seam boundary hit! Break path and restart
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px.x, px.y);
      } else {
        ctx.lineTo(px.x, px.y);
      }
    }

    ctx.stroke();
    ctx.globalCompositeOperation = "source-over"; // Reset composite
  };

  const mapSphereToEquirectangular = (pitch: number, yaw: number, W: number, H: number) => {
    // Normalise yaw to [-180, 180]
    let normYaw = yaw;
    while (normYaw < -180) normYaw += 360;
    while (normYaw > 180) normYaw -= 360;

    const x = ((normYaw + 180) / 360) * W;
    const y = ((90 - pitch) / 180) * H;

    return { x, y };
  };

  // Adjust canvas size to match overlay DOM exactly during resize
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
    // Initial size
    setTimeout(resize, 300);

    return () => window.removeEventListener("resize", resize);
  }, [loading]);

  const handleSave = () => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;

    setSaving(true);
    displayCanvas.toBlob(async (blob) => {
      if (blob) {
        try {
          // Inject original EXIF/XMP metadata headers so Google Street View publishing does not fail
          const metadataPreservedBlob = await copyJpegMetadata(photo.file_url, blob);
          await onSave(metadataPreservedBlob);
        } catch (err: any) {
          toast.error("Error saving image: " + err.message);
          setSaving(false);
        }
      } else {
        toast.error("Failed to generate image file.");
        setSaving(false);
      }
    }, "image/jpeg", 0.95);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      {/* Visual upload loading indicator state as requested */}
      {saving && (
        <div className="absolute inset-0 z-55 flex items-center justify-center bg-white/95 backdrop-blur-xs select-none">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center justify-center border text-center border-slate-100 animate-fade-in">
            {/* Miniature preview placeholder with pulse bar */}
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
            <p className="text-sm font-semibold text-slate-500 mb-6">
              Your image is uploading now!
            </p>

            {/* Generated illustration embedded static */}
            <div className="w-full max-w-[280px] aspect-[4/3] rounded-2xl overflow-hidden relative flex items-center justify-center bg-slate-50 border border-slate-100 shadow-inner">
              <img 
                src="/robot_beach_upload.png" 
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
          {/* Tool selector buttons */}
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

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="bg-[#8bc34a] hover:bg-[#7cb342] text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-1 shadow cursor-pointer active:scale-97 transition-all"
            >
              <Save className="h-4 w-4" /> Save
            </button>
            <button
              onClick={onClose}
              className="bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-1 shadow cursor-pointer active:scale-97 transition-all"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>

        {/* 360 VIEWER VIEWPORT */}
        <div className="flex-1 min-h-0 relative bg-slate-950 flex items-center justify-center overflow-hidden">
          <div ref={panoRef} className="absolute inset-0 w-full h-full" />
          
          {/* Transparent Canvas overlays for real-time brush rendering */}
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

          {/* Dynamic Brush Size Outline Cursor Ring */}
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

          {/* Canvas loading state */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3 z-30">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <span className="text-xs font-semibold text-white/80">Loading 360 Viewport...</span>
            </div>
          )}

          {/* Informational overlay for drawing */}
          {mode !== "pan" && !loading && (
            <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/10 z-20 flex items-center gap-2 select-none pointer-events-none uppercase tracking-wide">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              Draw on panorama to apply {mode === "blur" ? "blur" : "erase"}. Release mouse to bake texture.
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

          {/* Brush size controller */}
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

          <div className="text-white/60 font-medium font-mono text-[10px] hidden sm:block">
            {photo.filename}
          </div>
        </div>
      </div>
    </div>
  );
}
