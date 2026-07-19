import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TourStepsNav } from "@/components/TourStepsNav";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  CheckCheck,
  Check,
  Clock,
  X as XIcon,
  Cloud,
  Upload as UploadIcon,
  Trash2,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge, Status } from "@/components/StatusBadge";
import { useStreetViewStatus, Photo as StatusPhoto } from "@/hooks/useStreetViewStatus";
import { syncStreetViewConnections } from "@/lib/streetview";

const planLimit: Record<string, number> = { trial: 1, basic: 5, pro: 25, agency: 9999 };

/**
 * Loads an image from a URL and returns an HTMLImageElement.
 * Uses crossOrigin = 'anonymous' to avoid tainted canvas security errors.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image from URL: ${url}`));
    img.src = url;
  });
}

/**
 * Transplants APP (EXIF, XMP, ICC, etc.) metadata segments from an original JPEG
 * Uint8Array to a newly generated canvas-compressed JPEG Uint8Array.
 * This preserves 360-degree photo sphere XMP metadata.
 */
function transplantMetadata(originalBytes: Uint8Array, newBytes: Uint8Array): Uint8Array {
  const appSegments: Uint8Array[] = [];
  let offset = 2; // skip SOI (0xFFD8)

  while (offset < originalBytes.length) {
    if (originalBytes[offset] === 0xff) {
      const marker = originalBytes[offset + 1];

      // SOS (0xFFDA) starts the scan data, stop scanning
      // EOI (0xFFD9) ends the image, stop scanning
      if (marker === 0xda || marker === 0xd9) {
        break;
      }

      const length = (originalBytes[offset + 2] << 8) + originalBytes[offset + 3];

      // APP markers are E0 to EF
      if (marker >= 0xe0 && marker <= 0xef) {
        appSegments.push(originalBytes.slice(offset, offset + 2 + length));
      }

      offset += 2 + length;
    } else {
      offset++;
    }
  }

  const totalAppLength = appSegments.reduce((sum, seg) => sum + seg.length, 0);
  const result = new Uint8Array(2 + totalAppLength + (newBytes.length - 2));

  // Write SOI
  result[0] = 0xff;
  result[1] = 0xd8;

  // Write APP segments
  let writeOffset = 2;
  for (const seg of appSegments) {
    result.set(seg, writeOffset);
    writeOffset += seg.length;
  }

  // Write the rest of newBytes (skipping its first 2 bytes 0xFF, 0xD8)
  result.set(newBytes.subarray(2), writeOffset);

  return result;
}

/**
 * Processes the photo canvas client-side using Canvas 2D and native filters.
 * Preserves 360 photo sphere EXIF/XMP metadata by transplanting APP segments.
 * Returns a high-quality JPEG Blob ready for direct upload to Google.
 */
async function processNadirClientSide(
  photoUrl: string,
  nadirType: string,
  nadirSize: string,
  nadirPos: string,
  logoUrl?: string | null,
): Promise<Blob> {
  // Fetch raw photo bytes from storage to extract original metadata segments
  const res = await fetch(photoUrl);
  if (!res.ok) throw new Error(`Failed to fetch photo from storage: status ${res.status}`);
  const originalBuffer = await res.arrayBuffer();
  const originalBytes = new Uint8Array(originalBuffer);

  const typeLower = nadirType ? nadirType.toLowerCase().trim() : "none";
  const posLower = nadirPos ? nadirPos.toLowerCase().trim() : "btm";

  // If no Nadir, return the original untouched JPEG Blob immediately (perfect EXIF preservation!)
  if (typeLower === "none") {
    return new Blob([originalBytes], { type: "image/jpeg" });
  }

  // Load the image into Canvas using a local object URL to bypass any potential CORS issues
  const localBlob = new Blob([originalBytes], { type: "image/jpeg" });
  const localUrl = URL.createObjectURL(localBlob);

  let img: HTMLImageElement;
  try {
    img = await loadImage(localUrl);
  } finally {
    URL.revokeObjectURL(localUrl);
  }

  const W = img.width;
  const H = img.height;

  const mainCanvas = document.createElement("canvas");
  mainCanvas.width = W;
  mainCanvas.height = H;
  const mainCtx = mainCanvas.getContext("2d");
  if (!mainCtx) throw new Error("Could not get main canvas context");
  mainCtx.drawImage(img, 0, 0);

  const isTourLevelWithoutLogo = typeLower === "tour level" && !logoUrl;

  if (!isTourLevelWithoutLogo) {
    const sizePercent = parseFloat(nadirSize || "13%") / 100;
    const h = Math.round(H * sizePercent);

    const isBottom = posLower !== "top";
    const yStart = isBottom ? H - h : 0;

    if (typeLower === "blur" || typeLower === "stretch blur") {
      // 1. Extract band
      const bandCanvas = document.createElement("canvas");
      bandCanvas.width = W;
      bandCanvas.height = h;
      const bandCtx = bandCanvas.getContext("2d");
      if (!bandCtx) throw new Error("Could not get band canvas context");
      bandCtx.drawImage(mainCanvas, 0, yStart, W, h, 0, 0, W, h);

      // 2. Stretch boundary pixels to create the stretch seam transition
      const imgData = bandCtx.getImageData(0, 0, W, h);
      const pixels = imgData.data;
      const boundaryY = isBottom ? 0 : h - 1;
      const boundaryRow = new Uint8ClampedArray(W * 4);
      const boundaryOffset = boundaryY * W * 4;
      for (let i = 0; i < W * 4; i++) {
        boundaryRow[i] = pixels[boundaryOffset + i];
      }

      for (let y = 0; y < h; y++) {
        const factor = isBottom ? y / h : 1 - y / y; // Note: y/h is correct, standardizing:
        // Wait, standardizing factor:
        const factorCorrect = isBottom ? y / h : 1 - y / h;
        const oneMinusFactor = 1 - factorCorrect;
        const yOffset = y * W * 4;
        for (let x = 0; x < W; x++) {
          const x4 = x * 4;
          const idx = yOffset + x4;
          pixels[idx] = Math.round(boundaryRow[x4] * factorCorrect + pixels[idx] * oneMinusFactor);
          pixels[idx + 1] = Math.round(
            boundaryRow[x4 + 1] * factorCorrect + pixels[idx + 1] * oneMinusFactor,
          );
          pixels[idx + 2] = Math.round(
            boundaryRow[x4 + 2] * factorCorrect + pixels[idx + 2] * oneMinusFactor,
          );
          pixels[idx + 3] = 255;
        }
      }
      bandCtx.putImageData(imgData, 0, 0);

      // 3. hardware-accelerated blur with padding to eliminate edge fading/transparency
      const radius = Math.max(10, Math.round(h / 8));
      const padding = radius * 2;
      const paddedCanvas = document.createElement("canvas");
      paddedCanvas.width = W;
      paddedCanvas.height = h + 2 * padding;
      const paddedCtx = paddedCanvas.getContext("2d");
      if (!paddedCtx) throw new Error("Could not get padded canvas context");

      if (isBottom) {
        // Draw surroundings for perfect blur blending
        const safeYStart = Math.max(0, yStart - padding);
        const safePadding = yStart - safeYStart;
        if (safePadding > 0) {
          paddedCtx.drawImage(
            mainCanvas,
            0,
            safeYStart,
            W,
            safePadding,
            0,
            padding - safePadding,
            W,
            safePadding,
          );
        }
        paddedCtx.drawImage(bandCanvas, 0, 0, W, h, 0, padding, W, h);
        // Mirror edge pixels into padding to eliminate black/blank spaces
        for (let p = 0; p < padding; p++) {
          paddedCtx.drawImage(bandCanvas, 0, h - 1, W, 1, 0, padding + h + p, W, 1);
        }
      } else {
        for (let p = 0; p < padding; p++) {
          paddedCtx.drawImage(bandCanvas, 0, 0, W, 1, 0, p, W, 1);
        }
        paddedCtx.drawImage(bandCanvas, 0, 0, W, h, 0, padding, W, h);
        const safePadding = Math.min(padding, H - (yStart + h));
        if (safePadding > 0) {
          paddedCtx.drawImage(
            mainCanvas,
            0,
            yStart + h,
            W,
            safePadding,
            0,
            padding + h,
            W,
            safePadding,
          );
        }
      }

      // Draw blurred padded canvas
      const blurCanvas = document.createElement("canvas");
      blurCanvas.width = W;
      blurCanvas.height = h + 2 * padding;
      const blurCtx = blurCanvas.getContext("2d");
      if (!blurCtx) throw new Error("Could not get blur canvas context");
      blurCtx.filter = `blur(${radius}px)`;
      blurCtx.drawImage(paddedCanvas, 0, 0);

      // Draw center solid blurred region back onto the main canvas
      mainCtx.drawImage(blurCanvas, 0, padding, W, h, 0, yStart, W, h);
    } else if (typeLower === "tour level" && logoUrl) {
      // Polar Logo projection
      const logoImg = await loadImage(logoUrl);
      const D = Math.min(logoImg.width, logoImg.height);
      const logoCanvas = document.createElement("canvas");
      logoCanvas.width = D;
      logoCanvas.height = D;
      const logoCtx = logoCanvas.getContext("2d");
      if (!logoCtx) throw new Error("Could not get logo canvas context");
      logoCtx.drawImage(
        logoImg,
        (logoImg.width - D) / 2,
        (logoImg.height - D) / 2,
        D,
        D,
        0,
        0,
        D,
        D,
      );

      const logoData = logoCtx.getImageData(0, 0, D, D);
      const logoBitmap = logoData.data;

      const mainImgData = mainCtx.getImageData(0, yStart, W, h);
      const imgBitmap = mainImgData.data;

      const R = D / 2;
      const borderThickness = R * 0.03;

      for (let y = 0; y < h; y++) {
        const distFromPole = isBottom ? h - 1 - y : y;
        const r = (distFromPole / h) * R;
        const yOffset = y * W * 4;

        for (let x = 0; x < W; x++) {
          const theta = (x / W) * 2 * Math.PI - Math.PI / 2;
          const u = Math.round(R + r * Math.cos(theta));
          const v = Math.round(R + r * Math.sin(theta));

          if (u >= 0 && u < D && r <= R && v >= 0 && v < D) {
            const logoIdx = (v * D + u) * 4;
            const logoR = logoBitmap[logoIdx];
            const logoG = logoBitmap[logoIdx + 1];
            const logoB = logoBitmap[logoIdx + 2];
            const logoA = logoBitmap[logoIdx + 3];

            const imgIdx = yOffset + x * 4;

            if (r >= R - borderThickness) {
              imgBitmap[imgIdx] = 0;
              imgBitmap[imgIdx + 1] = 0;
              imgBitmap[imgIdx + 2] = 0;
              imgBitmap[imgIdx + 3] = 255;
            } else if (logoA > 0) {
              const origR = imgBitmap[imgIdx];
              const origG = imgBitmap[imgIdx + 1];
              const origB = imgBitmap[imgIdx + 2];
              const alpha = logoA / 255;

              imgBitmap[imgIdx] = Math.round(logoR * alpha + origR * (1 - alpha));
              imgBitmap[imgIdx + 1] = Math.round(logoG * alpha + origG * (1 - alpha));
              imgBitmap[imgIdx + 2] = Math.round(logoB * alpha + origB * (1 - alpha));
              imgBitmap[imgIdx + 3] = 255;
            }
          }
        }
      }
      mainCtx.putImageData(mainImgData, 0, yStart);
    }
  }

  // Export processed canvas to a temporary JPEG Blob
  const newBlob = await new Promise<Blob>((resolve, reject) => {
    mainCanvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Failed to export image canvas to Blob"));
      },
      "image/jpeg",
      0.9,
    );
  });

  // Transplant the EXIF/XMP APP segments from originalBytes into the canvas JPEG Blob bytes
  const newBuffer = await newBlob.arrayBuffer();
  const newBytes = new Uint8Array(newBuffer);
  const metadataPreservedBytes = transplantMetadata(originalBytes, newBytes);

  return new Blob([metadataPreservedBytes.buffer as any], { type: "image/jpeg" });
}

import { SEO } from "@/components/SEO";

export const Route = createFileRoute("/tours/$tourId/publish")({
  head: () => ({
    meta: [
      { title: "Publish to Google — PanoPublish" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PublishPage,
});

type Photo = {
  id: string;
  filename: string | null;
  status: Status;
  file_url: string;
  latitude?: number | null;
  longitude?: number | null;
  heading?: number;
  pitch?: number;
  roll?: number;
  capture_time?: string;
  streetview_status?: string;
  streetview_photo_id?: string;
  streetview_share_link?: string | null;
  island_id?: string | null;
};

const getFunctionErrorMessage = async (error: any): Promise<string> => {
  if (!error) return "Unknown error";

  if (error.message && error.message.includes("non-2xx status code:")) {
    try {
      const jsonStr = error.message.split("non-2xx status code:")[1].trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed?.error) return parsed.error;
    } catch (_) {}
  }

  if (error.context && typeof error.context.json === "function") {
    try {
      const clonedRes = error.context.clone();
      const body = await clonedRes.json();
      if (body?.error) return body.error;
    } catch (_) {}
  }

  return error.message || "Edge Function returned a non-2xx status code";
};

function PublishPage() {
  const { tourId } = Route.useParams();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tour, setTour] = useState<any>(null);
  const [nadirType, setNadirType] = useState(() => {
    let initialType =
      (typeof window !== "undefined" ? localStorage.getItem(`tour-nadir-type-${tourId}`) : null) ||
      "Stretch Blur";
    if (initialType.toLowerCase().trim() === "none") return "None";
    if (initialType.toLowerCase().trim() === "stretch blur") return "Stretch Blur";
    if (initialType.toLowerCase().trim() === "tour level") return "Tour level";
    return initialType;
  });
  const [size, setSize] = useState(
    () =>
      (typeof window !== "undefined" ? localStorage.getItem(`tour-size-${tourId}`) : null) || "13%",
  );
  const [pos, setPos] = useState(
    () =>
      (typeof window !== "undefined" ? localStorage.getItem(`tour-pos-${tourId}`) : null) || "btm",
  );
  const [confirm, setConfirm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [islands, setIslands] = useState<any[]>([]);
  const [showNadirModal, setShowNadirModal] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [prevWasProcessing, setPrevWasProcessing] = useState(false);
  const [publishProgress, setPublishProgress] = useState<{
    current: number;
    total: number;
    step: "idle" | "processing" | "encoding" | "uploading" | "connecting" | "success" | "failed";
    message: string;
  } | null>(null);
  const [profile, setProfile] = useState<{ plan: string; billing_cycle_tours_used: number } | null>(
    null,
  );

  const saveNadirSettings = async (newType: string, newSize: string, newPos: string) => {
    localStorage.setItem(`tour-nadir-type-${tourId}`, newType);
    localStorage.setItem(`tour-size-${tourId}`, newSize);
    localStorage.setItem(`tour-pos-${tourId}`, newPos);

    try {
      const { error } = await supabase
        .from("tours")
        .update({
          nadir_type: newType,
          nadir_size: newSize,
          nadir_pos: newPos,
        } as any)
        .eq("id", tourId);
      if (error) throw error;
      setTour((prev: any) =>
        prev ? { ...prev, nadir_type: newType, nadir_size: newSize, nadir_pos: newPos } : null,
      );
    } catch (e: any) {
      console.error("Failed to auto-save nadir settings:", e);
    }
  };

  const load = async () => {
    if (!user) return;
    const { data: t } = await supabase.from("tours").select("*").eq("id", tourId).maybeSingle();
    setTour(t);
    if (t) {
      let fetchedNadirType =
        t.nadir_type || localStorage.getItem(`tour-nadir-type-${tourId}`) || "None";
      if (fetchedNadirType.toLowerCase().trim() === "none") {
        fetchedNadirType = "None";
      } else if (fetchedNadirType.toLowerCase().trim() === "stretch blur") {
        fetchedNadirType = "Stretch Blur";
      } else if (fetchedNadirType.toLowerCase().trim() === "tour level") {
        fetchedNadirType = "Tour level";
      }
      setNadirType(fetchedNadirType);
      setSize(t.nadir_size || localStorage.getItem(`tour-size-${tourId}`) || "13%");
      setPos(t.nadir_pos || localStorage.getItem(`tour-pos-${tourId}`) || "btm");
    }
    const { data: ps } = await supabase.from("photos").select("*").eq("tour_id", tourId);
    const loadedPhotos = ((ps as any[]) ?? []).sort((a, b) => {
      if (a.order_index != null && b.order_index != null) return a.order_index - b.order_index;
      return new Date(a.uploaded_at || 0).getTime() - new Date(b.uploaded_at || 0).getTime();
    });
    setPhotos(loadedPhotos);

    // Self-healing check: Sync tour status based on photos
    if (t && loadedPhotos.length > 0) {
      const allSubmitted = loadedPhotos.every(
        (p: any) => p.streetview_status === "PUBLISHED" || p.streetview_status === "PROCESSING",
      );
      const anyFailed = loadedPhotos.some((p: any) => p.streetview_status === "FAILED");

      let newStatus = t.status;
      if (allSubmitted) {
        newStatus = "published";
      } else if (anyFailed) {
        newStatus = "rejected";
      } else {
        newStatus = "draft";
      }

      if (newStatus !== t.status) {
        await supabase.from("tours").update({ status: newStatus }).eq("id", tourId);
        t.status = newStatus;
        setTour({ ...t });
      }
    }

    const { data: is } = await supabase.from("islands").select("*").eq("tour_id", tourId);
    setIslands(is ?? []);

    try {
      const { data, error } = await supabase.functions.invoke("google-oauth", {
        body: { action: "get_valid_token", user_id: user.id },
      });
      if (error) {
        console.error("Google Auth function error:", error);
      } else if (data?.error) {
        console.error("Google Auth data error:", data.error);
      } else if (data?.access_token) {
        setAccessToken(data.access_token);
      }
    } catch (e) {
      console.error("Not connected to Google:", e);
    }

    // Fetch profiles to check limits
    try {
      const { data: p } = await supabase
        .from("profiles")
        .select("plan, billing_cycle_tours_used")
        .eq("id", user.id)
        .maybeSingle();
      if (p) {
        setProfile(p);
      }
    } catch (e) {
      console.error("Failed to load user profile:", e);
    }
  };

  useEffect(() => {
    load();
  }, [user, tourId]);

  const handlePublishClick = () => {
    if (!accessToken) {
      toast.error("Please connect your Google Account first.");
      return;
    }

    const isAdmin =
      user?.email === "vista360gtp@gmail.com" ||
      user?.email === "er.prashantyadav37@gmail.com";
    const limit = isAdmin ? 9999 : (planLimit[profile?.plan ?? "trial"] ?? 1);
    const used = profile?.billing_cycle_tours_used ?? 0;
    const isAlreadyPublished = tour?.has_been_published ?? false;

    if (!isAlreadyPublished && used >= limit) {
      toast.error(
        `Publishing limit reached! You have used ${used}/${limit === 9999 ? "∞" : limit} tours on your ${profile?.plan || "trial"} plan. Please upgrade your subscription in Settings to publish more tours.`,
      );
      return;
    }

    setConfirm(true);
  };

  useStreetViewStatus(photos as StatusPhoto[], accessToken, load);

  useEffect(() => {
    const anyProcessing = photos.some((p) => p.streetview_status === "PROCESSING");
    const allPublished =
      photos.length > 0 && photos.every((p) => p.streetview_status === "PUBLISHED");

    if (anyProcessing) {
      setPrevWasProcessing(true);
    }

    const needsSync = tour && !tour.streetview_connections_synced;
    const shouldSync = allPublished && needsSync && accessToken && !publishing;

    if (shouldSync) {
      setPrevWasProcessing(false);
      toast.info("All scenes processed! Automatically syncing connections on Google Maps...");
      syncConnectionsOnly();
    } else if (allPublished && prevWasProcessing && accessToken && !publishing) {
      setPrevWasProcessing(false);
      toast.info("All scenes processed! Automatically syncing connections on Google Maps...");
      syncConnectionsOnly();
    }
  }, [photos, tour?.streetview_connections_synced, accessToken, publishing, prevWasProcessing]);

  const connectGoogle = async () => {
    try {
      const redirectUri = window.location.origin + "/auth/google/callback";
      const { data, error } = await supabase.functions.invoke("google-oauth", {
        body: { action: "get_auth_url", redirect_uri: redirectUri },
      });
      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (e: any) {
      toast.error("Failed to start Google connection: " + e.message);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const path = `${user?.id}/${tourId}/nadir-logo-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("tour-photos").upload(path, file, {
        contentType: file.type || "image/png",
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("tour-photos").getPublicUrl(path);
      const logoUrl = pub.publicUrl;

      // Update tours table
      const { error: dbErr } = await supabase
        .from("tours")
        .update({
          nadir_logo_url: logoUrl,
        } as any)
        .eq("id", tourId);
      if (dbErr) throw dbErr;

      // Update local tour state
      setTour((prev: any) => ({ ...prev, nadir_logo_url: logoUrl }));
      toast.success("Nadir logo uploaded successfully!");
    } catch (err: any) {
      toast.error("Failed to upload nadir logo: " + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!window.confirm("Are you sure you want to remove the nadir logo?")) return;

    try {
      // Update tours table
      const { error: dbErr } = await supabase
        .from("tours")
        .update({
          nadir_logo_url: null,
        } as any)
        .eq("id", tourId);
      if (dbErr) throw dbErr;

      // Update local tour state
      setTour((prev: any) => ({ ...prev, nadir_logo_url: null }));
      toast.success("Nadir logo removed!");
    } catch (err: any) {
      toast.error("Failed to remove logo: " + err.message);
    }
  };

  const publishAll = async () => {
    setConfirm(false);
    setPublishing(true);

    let freshToken = accessToken;
    try {
      const { data, error } = await supabase.functions.invoke("google-oauth", {
        body: { action: "get_valid_token", user_id: user?.id },
      });
      if (!error && data?.access_token) {
        freshToken = data.access_token;
        setAccessToken(data.access_token);
      }
    } catch (e) {
      console.error("Failed to refresh token before publish:", e);
    }

    if (!freshToken) {
      toast.error("Not connected to Google");
      setPublishing(false);
      return;
    }

    try {
      const toPublish = photos.filter(
        (p) =>
          !p.streetview_status ||
          p.streetview_status === "NOT_PUBLISHED" ||
          p.streetview_status === "FAILED",
      );

      let photoIndex = 1;
      const totalPhotos = toPublish.length;

      if (totalPhotos > 0) {
        setPublishProgress({
          current: 0,
          total: totalPhotos,
          step: "idle",
          message: "Starting publish...",
        });
      }

      for (const photo of toPublish) {
        // Find if this photo belongs to a level island
        let level = undefined;
        if (photo.island_id) {
          const island = islands.find((i) => i.id === photo.island_id);
          if (island?.is_level && island.level_name) {
            level = {
              number: island.level_number ?? 0,
              name: island.level_name.toString().toUpperCase().slice(0, 3),
            };
          }
        }

        // 1. Process image client-side to apply Nadir/Logo if needed
        setPublishProgress({
          current: photoIndex - 1,
          total: totalPhotos,
          step: "processing",
          message: `Processing scene ${photoIndex} of ${totalPhotos} in browser...`,
        });
        toast.info(`Processing scene ${photoIndex} of ${totalPhotos} in browser...`);
        const processedBlob = await processNadirClientSide(
          photo.file_url,
          nadirType,
          size,
          pos,
          tour?.nadir_logo_url,
        );

        // 2. Convert Blob to base64 string
        setPublishProgress({
          current: photoIndex - 1,
          total: totalPhotos,
          step: "encoding",
          message: `Encoding scene ${photoIndex} of ${totalPhotos}...`,
        });
        toast.info(`Encoding scene ${photoIndex} of ${totalPhotos}...`);
        const reader = new FileReader();
        reader.readAsDataURL(processedBlob);
        const base64data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
          reader.onerror = reject;
        });

        // 3. Upload bytes and register sphere via server-to-server Edge Function action
        setPublishProgress({
          current: photoIndex - 1,
          total: totalPhotos,
          step: "uploading",
          message: `Uploading scene ${photoIndex} of ${totalPhotos} to Google...`,
        });
        toast.info(`Uploading scene ${photoIndex} of ${totalPhotos} to Google...`);
        const { data: createData, error: createError } = await supabase.functions.invoke(
          "streetview-publish",
          {
            body: {
              action: "publish_photo_bytes",
              access_token: freshToken,
              photo_base64: base64data,
              latitude: photo.latitude || tour.latitude,
              longitude: photo.longitude || tour.longitude,
              heading: photo.heading || 0,
              pitch: photo.pitch || 0,
              roll: photo.roll || 0,
              captureTime: photo.capture_time || new Date().toISOString(),
              placeId: tour.google_place_id,
              supabase_photo_id: photo.id,
              level,
            },
          },
        );
        if (createError) throw new Error(await getFunctionErrorMessage(createError));
        if (createData?.error || createData?.success === false)
          throw new Error(createData.error || "Failed to publish photo");

        setPublishProgress({
          current: photoIndex,
          total: totalPhotos,
          step: "uploading",
          message: `Scene ${photoIndex} uploaded successfully!`,
        });

        photoIndex++;
      }

      // Step 5: Update connections and poses on Google Maps
      setPublishProgress({
        current: totalPhotos,
        total: totalPhotos,
        step: "connecting",
        message: "Updating connections and alignments on Google Maps...",
      });
      toast.info("Updating connections and poses on Google Maps...");
      await syncStreetViewConnections(supabase, tourId, freshToken);

      // Since photos are still processing, explicitly set synced to false.
      // The background status hook will auto-trigger a final sync once processing completes.
      const { data: latestPhotos } = await supabase
        .from("photos")
        .select("streetview_status")
        .eq("tour_id", tourId);
      const allPublishedNow = latestPhotos
        ? latestPhotos.every((p: any) => p.streetview_status === "PUBLISHED")
        : false;
      await supabase
        .from("tours")
        .update({ streetview_connections_synced: allPublishedNow } as any)
        .eq("id", tourId);

      toast.success("Photos published and connections updated! They will process shortly.");
      load();
    } catch (e: any) {
      console.error(e);
      toast.error("Publishing failed: " + e.message);
    } finally {
      setPublishing(false);
      setPublishProgress(null);
    }
  };

  const syncConnectionsOnly = async () => {
    setPublishing(true);

    let freshToken = accessToken;
    try {
      const { data, error } = await supabase.functions.invoke("google-oauth", {
        body: { action: "get_valid_token", user_id: user?.id },
      });
      if (!error && data?.access_token) {
        freshToken = data.access_token;
        setAccessToken(data.access_token);
      }
    } catch (e) {
      console.error("Failed to refresh token before sync:", e);
    }

    if (!freshToken) {
      toast.error("Not connected to Google");
      setPublishing(false);
      return;
    }

    try {
      setPublishProgress({
        current: 0,
        total: 100,
        step: "connecting",
        message: "Fetching connections and photo alignments...",
      });

      toast.info("Updating connections and poses on Google Maps...");

      await syncStreetViewConnections(supabase, tourId, freshToken);

      // Update database and local state to prevent loop
      const { error: dbErr } = await supabase
        .from("tours")
        .update({ streetview_connections_synced: true } as any)
        .eq("id", tourId);

      if (!dbErr) {
        setTour((prev: any) => (prev ? { ...prev, streetview_connections_synced: true } : null));
      }

      toast.success("Connections and alignments updated successfully on Google Maps!");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to sync connections: " + e.message);
    } finally {
      setPublishing(false);
      setPublishProgress(null);
    }
  };

  const resetPublishing = async () => {
    if (
      !window.confirm(
        "This will delete the tour from Google Maps and reset the publishing status so you can re-upload with your new Nadir/logo settings. Are you sure?",
      )
    )
      return;

    setPublishing(true);
    try {
      let freshToken = accessToken;
      try {
        const { data, error } = await supabase.functions.invoke("google-oauth", {
          body: { action: "get_valid_token", user_id: user?.id },
        });
        if (!error && data?.access_token) {
          freshToken = data.access_token;
          setAccessToken(data.access_token);
        }
      } catch (e) {
        console.error("Failed to refresh token before reset:", e);
      }

      if (!freshToken) {
        toast.error("Not connected to Google");
        setPublishing(false);
        return;
      }

      // 1. Delete from Google Maps
      for (const photo of photos) {
        if (photo.streetview_photo_id && freshToken) {
          try {
            await supabase.functions.invoke("streetview-publish", {
              body: {
                action: "delete_photo",
                access_token: freshToken,
                streetview_photo_id: photo.streetview_photo_id,
              },
            });
          } catch (e) {
            console.error("Failed to delete photo from Google:", e);
          }
        }
      }

      // 2. Clear database fields
      const { error } = await supabase
        .from("photos")
        .update({
          streetview_photo_id: null,
          streetview_status: "NOT_PUBLISHED",
          streetview_share_link: null,
        })
        .eq("tour_id", tourId);

      if (error) throw error;

      toast.success("Publishing status reset successfully! You can now publish again.");
      load();
    } catch (e: any) {
      toast.error("Failed to reset publishing status: " + e.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AppShell
      title="Publish to Google"
      breadcrumbs={[
        { label: "Tours", to: "/tours" },
        { label: tour?.name || "Tour" },
        { label: "Publish" },
      ]}
    >
      <SEO
        title="Publish to Google"
        description="Configure nadir settings and publish your virtual tour to Google Street View and Google Maps."
        noIndex={true}
      />
      <TourStepsNav
        tourId={tourId}
        activeTab="publish"
        onSave={async () => {
          await saveNadirSettings(nadirType, size, pos);
          toast.success("Publish and Nadir settings saved!");
        }}
        onNadir={() => {
          setShowNadirModal(true);
        }}
      />

      {/* Top info bar */}
      <div className="mb-4 rounded-xl border bg-card p-3 flex flex-wrap items-center justify-between gap-3 max-w-4xl mx-auto">
        <div className="text-sm flex items-center gap-2">
          <span className="text-muted-foreground">owner:</span>
          <span className="font-medium">{user?.email ?? "—"}</span>
          {accessToken ? (
            <span className="text-green-600 flex items-center gap-1 text-xs bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
              <Check className="h-3 w-3" /> Google Connected
            </span>
          ) : (
            <button
              onClick={connectGoogle}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200 cursor-pointer font-medium"
            >
              Connect Google Account
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">Nadir Type:</span>
            <select
              value={nadirType}
              onChange={async (e) => {
                const val = e.target.value;
                setNadirType(val);
                await saveNadirSettings(val, size, pos);
              }}
              className="border rounded px-2 py-1 bg-background font-medium"
            >
              <option value="None">None</option>
              <option value="Stretch Blur">Stretch Blur</option>
              <option value="Tour level">Tour level</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">Size:</span>
            <select
              value={size}
              onChange={async (e) => {
                const val = e.target.value;
                setSize(val);
                await saveNadirSettings(nadirType, val, pos);
              }}
              className="border rounded px-2 py-1 bg-background font-medium"
            >
              <option value="5%">5%</option>
              <option value="10%">10%</option>
              <option value="13%">13%</option>
              <option value="15%">15%</option>
              <option value="20%">20%</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">Pos:</span>
            <select
              value={pos}
              onChange={async (e) => {
                const val = e.target.value;
                setPos(val);
                await saveNadirSettings(nadirType, size, val);
              }}
              className="border rounded px-2 py-1 bg-background font-medium"
            >
              <option value="btm">btm</option>
              <option value="top">top</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-8 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-3">Publish your scenes to Google</h2>
        <div className="h-1 rounded-full bg-blue-100 mb-8 max-w-xs mx-auto" />

        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="space-y-4">
            {publishProgress && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 shadow-inner animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    {publishProgress.step === "connecting"
                      ? "Finalizing"
                      : `Scene ${publishProgress.current} of ${publishProgress.total}`}
                  </span>
                  <span className="text-xs font-black text-blue-600">
                    {Math.round((publishProgress.current / (publishProgress.total || 1)) * 100)}%
                  </span>
                </div>
                {/* Premium Progress Bar */}
                <div className="w-full h-2 bg-blue-100/50 rounded-full overflow-hidden mb-2.5 border border-blue-100/30">
                  <div
                    className="h-full bg-[#0277bd] rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-[#0277bd] to-blue-400"
                    style={{
                      width: `${(publishProgress.current / (publishProgress.total || 1)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                  <Clock className="h-3.5 w-3.5 text-[#0277bd] animate-spin" />
                  <span className="truncate">{publishProgress.message}</span>
                </div>
              </div>
            )}
            <Button
              size="lg"
              className="w-full bg-[#0277bd] hover:bg-[#01579b]"
              disabled={publishing || photos.length === 0}
              onClick={handlePublishClick}
            >
              <Send className="h-5 w-5 mr-2" />
              {publishing
                ? "Publishing…"
                : `Publish ${photos.filter((p) => !p.streetview_status || p.streetview_status === "NOT_PUBLISHED").length} scene(s)`}
            </Button>
            {photos.some(
              (p) => p.streetview_status === "PUBLISHED" || p.streetview_status === "PROCESSING",
            ) && (
              <Button
                variant="outline"
                size="lg"
                className="w-full border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 mt-2 flex items-center justify-center"
                disabled={publishing}
                onClick={resetPublishing}
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Reset & Delete from Google
              </Button>
            )}
          </div>

          <div className="relative h-32 rounded-lg bg-gray-50 border flex flex-col items-center justify-center p-4">
            <Cloud className="h-12 w-12 text-[#0277bd] mb-1 opacity-50" />
            <div className="text-xs text-gray-500 font-semibold text-center mb-0.5">
              Processing status will update automatically.
            </div>
            <div className="text-[10px] text-gray-400 text-center mb-1 max-w-[280px]">
              Street View processing may take up to 24 hours.
            </div>
            {accessToken && photos.some((p) => p.streetview_status === "PROCESSING") && (
              <button
                onClick={async () => {
                  const tid = toast.loading("Checking Google Street View status...");
                  await load();
                  toast.success("Status checked!", { id: tid });
                }}
                className="text-xs text-[#0277bd] hover:underline font-semibold flex items-center gap-1 cursor-pointer mt-1"
              >
                <Clock className="h-3.5 w-3.5" /> Sync Google Status
              </button>
            )}
          </div>
        </div>

        {/* Per-scene progress */}
        {photos.length > 0 && (
          <div className="mt-8 space-y-1.5 max-h-64 overflow-y-auto">
            {photos.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm border rounded-md px-3 py-2 bg-background font-medium"
              >
                <span className="text-muted-foreground w-8">{i}</span>
                <span className="flex-1 truncate">{p.filename}</span>
                {p.streetview_status === "PUBLISHED" ? (
                  <div className="flex items-center gap-3">
                    <span className="text-green-600 font-semibold text-xs flex items-center gap-1">
                      <CheckCheck className="h-4 w-4 text-green-600" /> PUBLISHED
                    </span>
                    {p.streetview_share_link && (
                      <a
                        href={p.streetview_share_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0277bd] hover:text-[#01579b] text-xs font-bold underline flex items-center gap-0.5 transition-colors"
                      >
                        View on Maps
                      </a>
                    )}
                  </div>
                ) : p.streetview_status === "PROCESSING" ? (
                  <div className="flex items-center gap-3">
                    <span className="text-amber-600 font-semibold text-xs flex items-center gap-1 animate-pulse">
                      <Clock className="h-4 w-4 text-amber-500 animate-spin" /> PROCESSING
                    </span>
                    {p.streetview_share_link && (
                      <a
                        href={p.streetview_share_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0277bd] hover:text-[#01579b] text-xs font-bold underline flex items-center gap-0.5 transition-colors opacity-70"
                      >
                        View on Maps
                      </a>
                    )}
                  </div>
                ) : p.streetview_status === "FAILED" ? (
                  <span className="text-red-600 font-semibold text-xs flex items-center gap-1">
                    <XIcon className="h-4 w-4" /> FAILED
                  </span>
                ) : (
                  <span className="text-gray-400 font-semibold text-xs">NOT PUBLISHED</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm publish</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              You are about to publish to Google Street View under <strong>{user?.email}</strong>.
              Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={publishAll} className="bg-[#0277bd] text-white">
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nadir Logo Upload Modal */}
      <Dialog open={showNadirModal} onOpenChange={setShowNadirModal}>
        <DialogContent className="sm:max-w-md bg-white rounded-xl shadow-2xl p-6 border border-gray-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-center text-gray-800">
              Upload your Nadir by dragging and dropping it below.
            </DialogTitle>
            <DialogDescription className="text-xs text-center text-gray-400 mt-1">
              2000px x 2000px PNG recommended
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center my-6">
            {tour?.nadir_logo_url ? (
              // Circular crop preview with black border matching Image 2!
              <div className="relative group w-64 h-64 rounded-full overflow-hidden border-[6px] border-black shadow-lg flex items-center justify-center bg-gray-50 transition-transform duration-300 hover:scale-105">
                <img
                  src={tour.nadir_logo_url}
                  alt="Nadir logo preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                  Preview
                </div>
              </div>
            ) : (
              // Drag and drop zone
              <label className="w-64 h-64 rounded-full border-4 border-dashed border-[#0277bd]/30 hover:border-[#0277bd]/60 bg-blue-50/20 hover:bg-blue-50/50 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-inner group">
                <UploadIcon className="h-10 w-10 text-[#0277bd]/50 group-hover:text-[#0277bd]/80 group-hover:scale-110 transition-transform mb-3" />
                <span className="text-xs font-semibold text-[#0277bd]/60 group-hover:text-[#0277bd]/80 text-center px-6">
                  {uploadingLogo ? "Uploading..." : "Click or drag logo to upload"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={handleLogoUpload}
                />
              </label>
            )}
          </div>

          <DialogFooter className="flex sm:justify-center items-center gap-3 w-full border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNadirModal(false)}
              className="px-6 rounded-full border-gray-300 hover:bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            {tour?.nadir_logo_url && (
              <Button
                type="button"
                onClick={handleLogoRemove}
                className="px-6 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Remove
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
