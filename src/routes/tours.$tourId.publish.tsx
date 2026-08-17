import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TourStepsNav } from "@/components/TourStepsNav";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
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
  Download,
  Eye,
  Image as ImageIcon,
  Music,
  Volume2,
  Play,
  Pause,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge, Status } from "@/components/StatusBadge";
import { useStreetViewStatus, Photo as StatusPhoto } from "@/hooks/useStreetViewStatus";
import { syncStreetViewConnections } from "@/lib/streetview";
import { exportCustomTour, generateLivePreviewUrl } from "@/lib/custom-tour-exporter";

const planLimit: Record<string, number> = { trial: 1, basic: 5, pro: 25, agency: 9999 };

const MUSIC_PRESETS = [
  {
    id: "calm-ambient",
    title: "Calm Ambient Lounge",
    genre: "Ambient soundscape",
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
  },
  {
    id: "soft-piano",
    title: "Soft Gentle Piano",
    genre: "Acoustic piano melody",
    url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3",
  },
  {
    id: "acoustic-breeze",
    title: "Soothing Acoustic Breeze",
    genre: "Light acoustic guitar",
    url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3",
  },
  {
    id: "meditative-sanctuary",
    title: "Meditative Sanctuary",
    genre: "Deep zen relaxation",
    url: "https://cdn.pixabay.com/download/audio/2021/09/06/audio_8fa38e9c40.mp3",
  },
  {
    id: "zen-corporate",
    title: "Zen Corporate Flow",
    genre: "Modern lounge ambient",
    url: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3",
  },
];

import { processNadirClientSide } from "@/lib/nadir-processor";

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

  // Connections state
  const [connections, setConnections] = useState<any[]>([]);

  // Custom settings states
  const [brandingName, setBrandingName] = useState("");
  const [brandingLink, setBrandingLink] = useState("");
  const [themeColor, setThemeColor] = useState("#0277bd");
  const [showWatermark, setShowWatermark] = useState(true);
  const [logoUrl, setLogoUrl] = useState("");

  const [fullscreenBtn, setFullscreenBtn] = useState(true);
  const [zoomButtons, setZoomButtons] = useState(true);
  const [scrollZoom, setScrollZoom] = useState(true);
  const [autorotate, setAutorotate] = useState(false);
  const [autorotateSpeed, setAutorotateSpeed] = useState(10);

  const [waEnabled, setWaEnabled] = useState(false);
  const [waNumber, setWaNumber] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waPosition, setWaPosition] = useState("bottom-right");

  // Music settings states
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicUrl, setMusicUrl] = useState(MUSIC_PRESETS[0].url);
  const [musicTitle, setMusicTitle] = useState(MUSIC_PRESETS[0].title);
  const [musicVolume, setMusicVolume] = useState(50);
  const [musicAutoplay, setMusicAutoplay] = useState(true);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Nadir Logo state
  const [nadirLogoUrl, setNadirLogoUrl] = useState("");
  const [uploadingNadirLogo, setUploadingNadirLogo] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ message: string; pct: number } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

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
      setNadirLogoUrl(t.nadir_logo_url || "");

      // Load custom settings if tour is type 'custom'
      if (t.custom_settings) {
        try {
          const cs = JSON.parse(t.custom_settings);
          setBrandingName(cs.branding?.name || t.name || "");
          setBrandingLink(cs.branding?.link || "");
          setThemeColor(cs.branding?.theme_color || "#0277bd");
          setShowWatermark(cs.branding?.show_watermark !== false);
          setLogoUrl(cs.branding?.logo_url || "");

          setFullscreenBtn(cs.controls?.fullscreen !== false);
          setZoomButtons(cs.controls?.zoom_in_out !== false);
          setScrollZoom(cs.controls?.scroll_zoom !== false);
          setAutorotate(!!cs.controls?.autorotate);
          setAutorotateSpeed(cs.controls?.autorotate_speed || 10);

          setWaEnabled(!!cs.whatsapp?.enabled);
          setWaNumber(cs.whatsapp?.phone_number || "");
          setWaMessage(cs.whatsapp?.message || "");
          setWaPosition(cs.whatsapp?.position || "bottom-right");

          setMusicEnabled(!!cs.music?.enabled);
          setMusicUrl(cs.music?.track_url || MUSIC_PRESETS[0].url);
          setMusicTitle(cs.music?.track_name || MUSIC_PRESETS[0].title);
          setMusicVolume(cs.music?.volume ?? 50);
          setMusicAutoplay(cs.music?.autoplay !== false);
        } catch (e) {
          console.error("Failed to parse custom settings", e);
        }
      } else {
        setBrandingName(t.name || "");
      }
    }
    const { data: ps } = await supabase.from("photos").select("*").eq("tour_id", tourId);
    
    // Fetch connections
    const { data: conns } = await supabase.from("connections").select("*").eq("tour_id", tourId);
    setConnections(conns ?? []);

    const loadedPhotos = ((ps as any[]) ?? []).sort((a, b) => {
      if (a.order_index != null && b.order_index != null) return a.order_index - b.order_index;
      return new Date(a.uploaded_at || 0).getTime() - new Date(b.uploaded_at || 0).getTime();
    });
    setPhotos(loadedPhotos);

    // Self-healing check: Sync tour status based on photos (Google Street View tours only)
    if (t && t.type !== "custom" && loadedPhotos.length > 0) {
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
    if (!window.confirm("Are you sure you want to remove the brand logo?")) return;

    try {
      const { error: dbErr } = await supabase
        .from("tours")
        .update({
          nadir_logo_url: null,
        } as any)
        .eq("id", tourId);
      if (dbErr) throw dbErr;

      setLogoUrl("");
      setTour((prev: any) => ({ ...prev, nadir_logo_url: null }));
      toast.success("Brand logo removed successfully!");
    } catch (err: any) {
      toast.error("Failed to remove logo: " + err.message);
    }
  };

  const handleNadirLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingNadirLogo(true);
    try {
      const path = `${user?.id}/${tourId}/custom-nadir-logo-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("tour-photos").upload(path, file, {
        contentType: file.type || "image/png",
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("tour-photos").getPublicUrl(path);
      const uploadedUrl = pub.publicUrl;

      // Update tours table
      const { error: dbErr } = await supabase
        .from("tours")
        .update({
          nadir_logo_url: uploadedUrl,
        } as any)
        .eq("id", tourId);
      if (dbErr) throw dbErr;

      setNadirLogoUrl(uploadedUrl);
      setTour((prev: any) => ({ ...prev, nadir_logo_url: uploadedUrl }));
      toast.success("Nadir logo uploaded successfully!");
    } catch (err: any) {
      toast.error("Failed to upload nadir logo: " + err.message);
    } finally {
      setUploadingNadirLogo(false);
    }
  };

  const handleNadirLogoRemove = async () => {
    try {
      const { error: dbErr } = await supabase
        .from("tours")
        .update({
          nadir_logo_url: null,
        } as any)
        .eq("id", tourId);
      if (dbErr) throw dbErr;

      setNadirLogoUrl("");
      setTour((prev: any) => ({ ...prev, nadir_logo_url: null }));
      toast.success("Nadir logo removed.");
    } catch (err: any) {
      toast.error("Failed to remove nadir logo: " + err.message);
    }
  };

  const publishAll = async () => {
    setConfirm(false);
    setPublishing(true);

    // Ensure user-selected Nadir settings are saved to database before publishing
    await saveNadirSettings(nadirType, size, pos);

    const getFreshToken = async (): Promise<string | null> => {
      try {
        const { data, error } = await supabase.functions.invoke("google-oauth", {
          body: { action: "get_valid_token", user_id: user?.id },
        });
        if (!error && data?.access_token) {
          setAccessToken(data.access_token);
          return data.access_token;
        }
      } catch (e) {
        console.error("Failed to refresh token:", e);
      }
      return accessToken || null;
    };

    let freshToken = await getFreshToken();

    if (!freshToken) {
      toast.error("Not connected to Google");
      setPublishing(false);
      return;
    }

    try {
      // Fetch the latest photo records from the database to skip already published/processing scenes
      const { data: dbPhotos } = await supabase
        .from("photos")
        .select("id, streetview_status, streetview_photo_id, file_url, filename, latitude, longitude, heading, pitch, roll, island_id, capture_time")
        .eq("tour_id", tourId);

      const photoList = dbPhotos && dbPhotos.length > 0 ? dbPhotos : photos;

      const toPublish = photoList.filter(
        (p: any) =>
          !p.streetview_photo_id ||
          !p.streetview_status ||
          p.streetview_status === "NOT_PUBLISHED" ||
          p.streetview_status === "FAILED",
      );

      const alreadyDone = photoList.length - toPublish.length;
      let photoIndex = 1;
      const totalPhotos = toPublish.length;
      let failedCount = 0;

      if (totalPhotos > 0) {
        setPublishProgress({
          current: alreadyDone,
          total: photoList.length,
          step: "idle",
          message: alreadyDone > 0 ? `Resuming publish (${alreadyDone} already uploaded)...` : "Starting publish...",
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
          current: alreadyDone + photoIndex - 1,
          total: photoList.length,
          step: "processing",
          message: `Processing scene ${alreadyDone + photoIndex} of ${photoList.length} in browser...`,
        });

        let processedBlob: Blob;
        try {
          processedBlob = await processNadirClientSide(
            photo.file_url,
            nadirType,
            size,
            pos,
            tour?.nadir_logo_url,
          );
        } catch (procErr: any) {
          console.warn("Nadir processing fallback to original:", procErr);
          const rawRes = await fetch(photo.file_url);
          processedBlob = await rawRes.blob();
        }

        // 2. Convert Blob to base64 string
        setPublishProgress({
          current: alreadyDone + photoIndex - 1,
          total: photoList.length,
          step: "encoding",
          message: `Encoding scene ${alreadyDone + photoIndex} of ${photoList.length}...`,
        });

        const reader = new FileReader();
        reader.readAsDataURL(processedBlob);
        const base64data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
          reader.onerror = reject;
        });

        // 3. Upload bytes and register sphere with auto-retry and token refresh
        setPublishProgress({
          current: alreadyDone + photoIndex - 1,
          total: photoList.length,
          step: "uploading",
          message: `Uploading scene ${alreadyDone + photoIndex} of ${photoList.length} to Google Maps...`,
        });

        let success = false;
        let lastErrorMsg = "";

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            // Refresh token on retries or after every 20 scenes to prevent token expiration
            if (attempt > 1 || photoIndex % 20 === 0) {
              const refreshed = await getFreshToken();
              if (refreshed) freshToken = refreshed;
              if (attempt > 1) {
                await new Promise((r) => setTimeout(r, attempt * 1500));
              }
            }

            const { data: createData, error: createError } = await supabase.functions.invoke(
              "streetview-publish",
              {
                body: {
                  action: "publish_photo_bytes",
                  access_token: freshToken,
                  photo_base64: base64data,
                  latitude: photo.latitude || tour?.latitude,
                  longitude: photo.longitude || tour?.longitude,
                  heading: photo.heading || 0,
                  pitch: photo.pitch || 0,
                  roll: photo.roll || 0,
                  captureTime: photo.capture_time || new Date().toISOString(),
                  placeId: tour?.google_place_id,
                  supabase_photo_id: photo.id,
                  level,
                },
              },
            );

            if (createError) {
              const errMsg = await getFunctionErrorMessage(createError);
              if (
                errMsg.includes("401") ||
                errMsg.toLowerCase().includes("unauthorized") ||
                errMsg.toLowerCase().includes("invalid_token") ||
                errMsg.toLowerCase().includes("credentials")
              ) {
                const refreshed = await getFreshToken();
                if (refreshed) freshToken = refreshed;
              }
              throw new Error(errMsg);
            }
            if (createData?.error || createData?.success === false) {
              throw new Error(createData.error || "Failed to publish photo");
            }

            success = true;
            break;
          } catch (uploadErr: any) {
            lastErrorMsg = uploadErr.message || "Upload error";
            console.warn(`Scene ${alreadyDone + photoIndex} attempt ${attempt} error:`, lastErrorMsg);
          }
        }

        if (!success) {
          failedCount++;
          console.error(`Scene ${alreadyDone + photoIndex} (${photo.filename || photo.id}) permanently failed:`, lastErrorMsg);
          toast.error(`Scene ${alreadyDone + photoIndex} failed: ${lastErrorMsg}`);
          await supabase
            .from("photos")
            .update({ streetview_status: "FAILED" } as any)
            .eq("id", photo.id);
        } else {
          // 4. Update the stored photo with the processed Nadir image so tour preview shows it permanently
          if (nadirType && nadirType.toLowerCase().trim() !== "none") {
            try {
              const publishedPath = `${user?.id}/${tourId}/${photo.island_id ?? "custom"}/published-${Date.now()}-${photo.filename || "scene.jpg"}`;
              const { error: upErr } = await supabase.storage
                .from("tour-photos")
                .upload(publishedPath, processedBlob);
              if (!upErr) {
                const { data: pubData } = supabase.storage
                  .from("tour-photos")
                  .getPublicUrl(publishedPath);
                if (pubData?.publicUrl) {
                  await supabase
                    .from("photos")
                    .update({
                      file_url: pubData.publicUrl,
                      file_path: publishedPath,
                    } as any)
                    .eq("id", photo.id);
                }
              }
            } catch (storageErr) {
              console.warn("Could not update photo storage with nadir blob:", storageErr);
            }
          }
        }

        setPublishProgress({
          current: alreadyDone + photoIndex,
          total: photoList.length,
          step: "uploading",
          message: `Scene ${alreadyDone + photoIndex} of ${photoList.length} done!`,
        });

        photoIndex++;
        // Pacing delay between scenes to stay well within Google Street View rate limits
        await new Promise((r) => setTimeout(r, 400));
      }

      // Step 5: Update connections and poses on Google Maps
      setPublishProgress({
        current: photoList.length,
        total: photoList.length,
        step: "connecting",
        message: "Updating connections and alignments on Google Maps...",
      });
      toast.info("Updating connections and poses on Google Maps...");

      const connectionToken = (await getFreshToken()) || freshToken;
      await syncStreetViewConnections(supabase, tourId, connectionToken);

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

      if (failedCount > 0) {
        toast.warning(`Published ${photoList.length - failedCount} of ${photoList.length} scenes. ${failedCount} scenes failed.`);
      } else {
        toast.success("All 80 scenes published and connections linked on Google Maps!");
      }
      load();
    } catch (e: any) {
      console.error("Publishing error:", e);
      toast.error("Publishing stopped: " + e.message);
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

  const handleCustomLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const path = `${user?.id}/${tourId}/custom-logo-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("tour-photos").upload(path, file, {
        contentType: file.type || "image/png",
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("tour-photos").getPublicUrl(path);
      const logoPublicUrl = pub.publicUrl;

      setLogoUrl(logoPublicUrl);
      toast.success("Logo uploaded successfully! Click Save to apply branding.");
    } catch (err: any) {
      toast.error("Failed to upload logo: " + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCustomLogoRemove = () => {
    setLogoUrl("");
    toast.success("Logo removed. Click Save to apply branding.");
  };

  const handleSaveCustomSettings = async (showToast = true) => {
    setSavingSettings(true);
    const updatedSettings = JSON.stringify({
      branding: {
        name: brandingName,
        link: brandingLink,
        theme_color: themeColor,
        show_watermark: showWatermark,
        logo_url: logoUrl
      },
      controls: {
        fullscreen: fullscreenBtn,
        zoom_in_out: zoomButtons,
        scroll_zoom: scrollZoom,
        autorotate: autorotate,
        autorotate_speed: Number(autorotateSpeed)
      },
      whatsapp: {
        enabled: waEnabled,
        phone_number: waNumber,
        message: waMessage,
        position: waPosition
      },
      music: {
        enabled: musicEnabled,
        track_url: musicUrl,
        track_name: musicTitle,
        volume: musicVolume,
        autoplay: musicAutoplay
      },
      nadir: {
        type: nadirType,
        size: size,
        pos: pos
      }
    });

    await saveNadirSettings(nadirType, size, pos);

    const { error } = await supabase
      .from("tours")
      .update({ custom_settings: updatedSettings } as any)
      .eq("id", tourId);

    setSavingSettings(false);
    if (error) {
      toast.error("Failed to save custom settings: " + error.message);
      return false;
    } else {
      if (showToast) toast.success("Virtual tour settings saved!");
      setTour((prev: any) => (prev ? { ...prev, custom_settings: updatedSettings } : null));
      return true;
    }
  };

  const handleExportTour = async () => {
    const saved = await handleSaveCustomSettings(false);
    if (!saved) return;

    if (photos.length === 0) {
      toast.error("Please upload photos to your tour before exporting.");
      return;
    }

    try {
      setExportProgress({ message: "Preparing tour files...", pct: 5 });
      
      const blob = await exportCustomTour(
        {
          tour: { id: tourId, name: tour.name, custom_settings: tour.custom_settings },
          photos: photos.map(p => ({
            id: p.id,
            file_url: p.file_url,
            filename: p.filename,
            heading: p.heading ?? null
          })),
          connections: connections.map(c => ({
            id: c.id,
            from_photo_id: c.from_photo_id,
            to_photo_id: c.to_photo_id,
            heading: c.heading ?? null,
            metadata: c.metadata ?? null
          })),
          nadirType,
          nadirSize: size,
          nadirPos: pos,
          logoUrl: nadirLogoUrl || logoUrl,
          processNadirFn: processNadirClientSide
        },
        (msg, pct) => {
          setExportProgress({ message: msg, pct });
        }
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tour.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_virtual_tour.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      // Mark custom tour as published in database and update local state
      const { error: pubErr } = await supabase
        .from("tours")
        .update({ status: "published", has_been_published: true } as any)
        .eq("id", tourId);
      
      if (!pubErr) {
        setTour((prev: any) => (prev ? { ...prev, status: "published", has_been_published: true } : null));
      }

      toast.success("Tour published! Standalone ZIP package downloaded successfully.");
      setExportProgress(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Export failed: " + err.message);
      setExportProgress(null);
    }
  };

  const previewUrl = useMemo(() => {
    if (!tour || photos.length === 0) return "";
    const tempTour = {
      id: tourId,
      name: brandingName || tour.name,
      custom_settings: JSON.stringify({
        branding: {
          name: brandingName,
          link: brandingLink,
          theme_color: themeColor,
          show_watermark: showWatermark,
          logo_url: logoUrl
        },
        controls: {
          fullscreen: fullscreenBtn,
          zoom_in_out: zoomButtons,
          scroll_zoom: scrollZoom,
          autorotate: autorotate,
          autorotate_speed: Number(autorotateSpeed)
        },
        whatsapp: {
          enabled: waEnabled,
          phone_number: waNumber,
          message: waMessage,
          position: waPosition
        },
        music: {
          enabled: musicEnabled,
          track_url: musicUrl,
          track_name: musicTitle,
          volume: musicVolume,
          autoplay: musicAutoplay
        }
      })
    };
    return generateLivePreviewUrl({
      tour: tempTour,
      photos: photos.map(p => ({
        id: p.id,
        file_url: p.file_url,
        filename: p.filename,
        heading: p.heading ?? null
      })),
      connections: connections.map(c => ({
        id: c.id,
        from_photo_id: c.from_photo_id,
        to_photo_id: c.to_photo_id,
        heading: c.heading ?? null,
        metadata: c.metadata ?? null
      }))
    });
  }, [
    tour,
    photos,
    connections,
    tourId,
    brandingName,
    brandingLink,
    themeColor,
    showWatermark,
    logoUrl,
    fullscreenBtn,
    zoomButtons,
    scrollZoom,
    autorotate,
    autorotateSpeed,
    waEnabled,
    waNumber,
    waMessage,
    waPosition,
    musicEnabled,
    musicUrl,
    musicTitle,
    musicVolume,
    musicAutoplay
  ]);

  return (
    <AppShell
      title={tour?.type === "custom" ? "Virtual Tour Settings" : "Publish to Google"}
      breadcrumbs={[
        { label: "Tours", to: "/tours" },
        { label: tour?.name || "Tour" },
        { label: tour?.type === "custom" ? "Settings" : "Publish" },
      ]}
    >
      <SEO
        title={tour?.type === "custom" ? "Virtual Tour Settings" : "Publish to Google"}
        description={
          tour?.type === "custom"
            ? "Configure branding, zoom limits, auto-rotation, and export virtual tour as offline-capable ZIP files."
            : "Configure nadir settings and publish your virtual tour to Google Street View and Google Maps."
        }
        noIndex={true}
      />
      <TourStepsNav
        tourId={tourId}
        activeTab="publish"
        tourType={tour?.type ?? undefined}
        onSave={async () => {
          if (tour?.type === "custom") {
            await handleSaveCustomSettings(true);
          } else {
            await saveNadirSettings(nadirType, size, pos);
            toast.success("Publish and Nadir settings saved!");
          }
        }}
        onNadir={() => {
          if (tour?.type !== "custom") {
            setShowNadirModal(true);
          }
        }}
      />

      {tour?.type === "custom" ? (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
          {/* Top Quick Actions Header Bar */}
          <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Virtual Tour Settings</h3>
              <p className="text-xs text-slate-500 font-medium">Configure branding, viewer controls, background music, and export options.</p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 hover:bg-slate-50 text-slate-700 font-bold cursor-pointer h-9 text-xs flex items-center gap-1.5 rounded-lg"
                onClick={() => setShowPreviewModal(true)}
                disabled={photos.length === 0}
              >
                <Eye className="h-4 w-4 text-slate-500" /> Preview Tour
              </Button>

              <Button
                size="sm"
                className="bg-[#0277bd] hover:bg-[#0266a1] text-white font-bold cursor-pointer h-9 text-xs flex items-center gap-1.5 rounded-lg border-0 shadow-xs"
                onClick={handleExportTour}
                disabled={!!exportProgress}
              >
                <Download className="h-4 w-4" /> Export Tour (ZIP)
              </Button>

              <Button
                size="sm"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer h-9 text-xs flex items-center gap-1.5 rounded-lg border-0 shadow-xs"
                onClick={() => handleSaveCustomSettings(true)}
                disabled={savingSettings}
              >
                <Check className="h-4 w-4" /> {savingSettings ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>

          {/* Export Progress Bar Overlay */}
          {exportProgress && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                  Exporting Standalone Tour Package...
                </span>
                <span className="text-xs font-black text-blue-600">{exportProgress.pct}%</span>
              </div>
              <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-[#0277bd] transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress.pct}%` }}
                />
              </div>
              <div className="text-xs text-slate-600 font-semibold truncate">{exportProgress.message}</div>
            </div>
          )}

          {/* Balanced 2-Column Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* LEFT COLUMN: Branding & Background Music */}
            <div className="space-y-6">
              {/* Branding & Logo Card */}
              <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b pb-2">Branding & Logo</h4>
                <div className="space-y-3">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 rounded-xl border bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Brand Logo</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingLogo}
                          className="relative cursor-pointer text-xs h-7.5"
                        >
                          {uploadingLogo ? "Uploading..." : "Upload Logo"}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCustomLogoUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </Button>
                        {logoUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCustomLogoRemove}
                            className="text-red-500 hover:text-red-650 border-red-200 hover:bg-red-50 h-7.5"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Brand / Company Name</label>
                    <Input
                      className="text-xs h-9"
                      placeholder="e.g. Acme Properties"
                      value={brandingName}
                      onChange={(e) => setBrandingName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Brand Redirect Link</label>
                    <Input
                      className="text-xs h-9"
                      placeholder="e.g. https://acme.com"
                      value={brandingLink}
                      onChange={(e) => setBrandingLink(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Theme Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={themeColor}
                          onChange={(e) => setThemeColor(e.target.value)}
                          className="w-8 h-8 rounded border cursor-pointer border-slate-200 p-0 shrink-0"
                        />
                        <Input
                          className="text-xs font-mono h-8"
                          value={themeColor}
                          onChange={(e) => setThemeColor(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <Checkbox
                        id="watermark-check"
                        checked={showWatermark}
                        onCheckedChange={(v) => setShowWatermark(!!v)}
                        className="cursor-pointer"
                      />
                      <label htmlFor="watermark-check" className="text-xs font-bold text-slate-650 cursor-pointer select-none">
                        Show Watermark
                      </label>
                    </div>
                  </div>

                  {/* Nadir Configuration Section */}
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 block">Nadir Patch / Blur</label>
                      <span className="text-[10px] text-slate-400 font-semibold">Cover tripod or place logo patch</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Nadir Type */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase">Type</label>
                        <select
                          value={nadirType}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNadirType(val);
                            saveNadirSettings(val, size, pos);
                          }}
                          className="text-xs border rounded-lg w-full h-8 px-2 bg-background font-medium outline-none cursor-pointer"
                        >
                          <option value="None">None</option>
                          <option value="Stretch Blur">Stretch Blur</option>
                          <option value="Tour level">Tour Level Logo</option>
                        </select>
                      </div>

                      {/* Nadir Position */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase">Position</label>
                        <select
                          value={pos}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPos(val);
                            saveNadirSettings(nadirType, size, val);
                          }}
                          className="text-xs border rounded-lg w-full h-8 px-2 bg-background font-medium outline-none cursor-pointer"
                          disabled={nadirType === "None"}
                        >
                          <option value="btm">Bottom (Nadir)</option>
                          <option value="top">Top (Zenith)</option>
                        </select>
                      </div>

                      {/* Nadir Size */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase">Patch Size</label>
                        <select
                          value={size}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSize(val);
                            saveNadirSettings(nadirType, val, pos);
                          }}
                          className="text-xs border rounded-lg w-full h-8 px-2 bg-background font-medium outline-none cursor-pointer"
                          disabled={nadirType === "None"}
                        >
                          <option value="10%">10% (Small)</option>
                          <option value="13%">13% (Medium)</option>
                          <option value="15%">15% (Standard)</option>
                          <option value="18%">18% (Large)</option>
                          <option value="20%">20% (Extra Large)</option>
                        </select>
                      </div>
                    </div>

                    {nadirType === "Tour level" && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                        <label className="text-xs font-bold text-slate-700 block">Nadir Patch Logo</label>
                        <div className="flex gap-3 items-center bg-slate-50 p-2.5 rounded-xl border">
                          <div className="w-12 h-12 rounded-lg border bg-white flex items-center justify-center overflow-hidden shrink-0">
                            {nadirLogoUrl || logoUrl ? (
                              <img src={nadirLogoUrl || logoUrl} alt="Nadir Logo" className="w-full h-full object-contain" />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="text-[11px] font-semibold text-slate-600">
                              {nadirLogoUrl ? "Custom Nadir Logo uploaded" : logoUrl ? "Using Brand Logo" : "No logo uploaded"}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploadingNadirLogo}
                                className="relative cursor-pointer text-xs h-7 px-2.5"
                              >
                                {uploadingNadirLogo ? "Uploading..." : "Upload Nadir Logo"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleNadirLogoUpload}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                              </Button>
                              {nadirLogoUrl && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleNadirLogoRemove}
                                  className="text-red-500 hover:text-red-650 border-red-200 hover:bg-red-50 h-7 px-2.5"
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Background Music Card */}
              <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b pb-2">
                  <div className="flex items-center gap-1.5">
                    <Music className="h-4 w-4 text-[#0277bd]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Background Music</h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id="music-enabled-check"
                      checked={musicEnabled}
                      onCheckedChange={(v) => {
                        setMusicEnabled(!!v);
                        if (!v && isPreviewPlaying) setIsPreviewPlaying(false);
                      }}
                      className="cursor-pointer"
                    />
                    <label htmlFor="music-enabled-check" className="text-xs font-bold text-slate-650 cursor-pointer select-none">
                      Enable Music
                    </label>
                  </div>
                </div>

                {musicEnabled && (
                  <div className="space-y-4 pt-1 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Select Soothing Track</label>
                      <div className="grid grid-cols-1 gap-2">
                        {MUSIC_PRESETS.map((preset) => {
                          const isSelected = musicUrl === preset.url;
                          return (
                            <div
                              key={preset.id}
                              onClick={() => {
                                setMusicUrl(preset.url);
                                setMusicTitle(preset.title);
                              }}
                              className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-sky-50/80 border-[#0277bd] text-[#0277bd] shadow-xs"
                                  : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/80"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                  isSelected ? "border-[#0277bd] bg-[#0277bd]" : "border-slate-300"
                                }`}>
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">{preset.title}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">{preset.genre} • Copyright-free</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Custom Track Option */}
                        <div
                          onClick={() => {
                            if (!MUSIC_PRESETS.some(p => p.url === musicUrl)) return;
                            setMusicUrl("");
                            setMusicTitle("Custom Audio Track");
                          }}
                          className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                            !MUSIC_PRESETS.some(p => p.url === musicUrl)
                              ? "bg-sky-50/80 border-[#0277bd] text-[#0277bd] shadow-xs"
                              : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/80"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              !MUSIC_PRESETS.some(p => p.url === musicUrl) ? "border-[#0277bd] bg-[#0277bd]" : "border-slate-300"
                            }`}>
                              {!MUSIC_PRESETS.some(p => p.url === musicUrl) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">Custom Audio URL</div>
                              <div className="text-[10px] text-slate-400 font-normal">Use direct MP3 link</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!MUSIC_PRESETS.some(p => p.url === musicUrl) && (
                      <div className="space-y-1 animate-in fade-in duration-200">
                        <label className="text-xs font-bold text-slate-700 block">Direct MP3 Audio URL</label>
                        <Input
                          className="text-xs font-mono h-9"
                          placeholder="https://example.com/soothing-music.mp3"
                          value={musicUrl}
                          onChange={(e) => {
                            setMusicUrl(e.target.value);
                            setMusicTitle("Custom Audio Track");
                          }}
                        />
                      </div>
                    )}

                    {/* Audio Player Preview */}
                    <div className="bg-slate-900 text-white rounded-xl p-3 space-y-2.5 shadow-sm border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() => {
                              if (!musicUrl) {
                                toast.error("Please select or enter an audio track first.");
                                return;
                              }
                              setIsPreviewPlaying(!isPreviewPlaying);
                            }}
                            className="h-7.5 w-7.5 rounded-lg bg-[#0277bd] hover:bg-[#0266a1] text-white shrink-0 cursor-pointer border-0"
                          >
                            {isPreviewPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                          </Button>
                          <div className="truncate">
                            <div className="text-xs font-bold text-white truncate">{musicTitle || "No Track Selected"}</div>
                            <div className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">
                              {isPreviewPlaying ? "Playing Preview..." : "Click to Preview Track"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Volume2 className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs font-mono text-slate-300 font-bold">{musicVolume}%</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Slider
                          value={[musicVolume]}
                          onValueChange={(val) => setMusicVolume(val[0])}
                          min={0}
                          max={100}
                          step={1}
                          className="cursor-pointer [&_[role=slider]]:bg-white [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
                        />
                      </div>

                      {isPreviewPlaying && musicUrl && (
                        <audio
                          src={musicUrl}
                          autoPlay
                          loop
                          onPlay={() => setIsPreviewPlaying(true)}
                          onPause={() => setIsPreviewPlaying(false)}
                          onEnded={() => setIsPreviewPlaying(false)}
                          ref={(el) => {
                            if (el) el.volume = musicVolume / 100;
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Controls & Rotation + WhatsApp Widget */}
            <div className="space-y-6">
              {/* Controls & Rotation Card */}
              <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b pb-2">Controls & Rotation</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="fullscreen-btn-check"
                      checked={fullscreenBtn}
                      onCheckedChange={(v) => setFullscreenBtn(!!v)}
                      className="cursor-pointer"
                    />
                    <label htmlFor="fullscreen-btn-check" className="text-xs font-bold text-slate-650 cursor-pointer select-none">
                      Fullscreen Button
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="zoom-btn-check"
                      checked={zoomButtons}
                      onCheckedChange={(v) => setZoomButtons(!!v)}
                      className="cursor-pointer"
                    />
                    <label htmlFor="zoom-btn-check" className="text-xs font-bold text-slate-650 cursor-pointer select-none">
                      Zoom Buttons
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="scroll-zoom-check"
                      checked={scrollZoom}
                      onCheckedChange={(v) => setScrollZoom(!!v)}
                      className="cursor-pointer"
                    />
                    <label htmlFor="scroll-zoom-check" className="text-xs font-bold text-slate-650 cursor-pointer select-none">
                      Enable Scroll Zoom
                    </label>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="autorotate-check"
                      checked={autorotate}
                      onCheckedChange={(v) => setAutorotate(!!v)}
                      className="cursor-pointer"
                    />
                    <label htmlFor="autorotate-check" className="text-xs font-bold text-slate-650 cursor-pointer select-none">
                      Enable Auto-rotation
                    </label>
                  </div>
                  {autorotate && (
                    <div className="space-y-1.5 pl-6 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Rotation Speed (step duration)</label>
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[autorotateSpeed]}
                          onValueChange={(val) => setAutorotateSpeed(val[0])}
                          min={1}
                          max={30}
                          step={1}
                          className="flex-1 cursor-pointer"
                        />
                        <span className="text-xs font-mono bg-slate-50 px-2 py-1 rounded border font-bold">
                          {autorotateSpeed} ms
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* WhatsApp Widget Card */}
              <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">WhatsApp Widget</h4>
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id="wa-enabled-check"
                      checked={waEnabled}
                      onCheckedChange={(v) => setWaEnabled(!!v)}
                      className="cursor-pointer"
                    />
                    <label htmlFor="wa-enabled-check" className="text-xs font-bold text-slate-650 cursor-pointer select-none">
                      Enable Widget
                    </label>
                  </div>
                </div>

                {waEnabled && (
                  <div className="space-y-3 pt-1 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Phone Number (with Country Code)</label>
                      <Input
                        className="text-xs h-9"
                        placeholder="e.g. 919999999999"
                        value={waNumber}
                        onChange={(e) => setWaNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Prefilled Text Message</label>
                      <Input
                        className="text-xs h-9"
                        placeholder="Hi, I am interested in this property tour!"
                        value={waMessage}
                        onChange={(e) => setWaMessage(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Button Position</label>
                      <select
                        value={waPosition}
                        onChange={(e) => setWaPosition(e.target.value)}
                        className="text-xs border rounded-lg w-full h-9 px-2 bg-background font-medium outline-none cursor-pointer"
                      >
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="top-left">Top Left</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Save Action */}
          <div className="flex items-center justify-end border-t pt-4">
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer h-10 rounded-xl px-6 text-xs uppercase tracking-wider border-0 shadow-sm flex items-center gap-1.5"
              onClick={() => handleSaveCustomSettings(true)}
              disabled={savingSettings}
            >
              <Check className="h-4 w-4" /> {savingSettings ? "Saving..." : "Save All Settings"}
            </Button>
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}

      {/* Live Preview Modal */}
      {showPreviewModal && previewUrl && (
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-black border-0 rounded-2xl flex flex-col">
            <DialogHeader className="bg-slate-900 border-b border-slate-800 p-4 flex flex-row items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <DialogTitle className="text-white text-base font-bold">Interactive Live Preview</DialogTitle>
                <p className="text-[10px] text-slate-400 font-medium">Viewing real-time compiled virtual tour player</p>
              </div>
            </DialogHeader>
            <div className="flex-1 bg-black relative">
              <iframe
                src={previewUrl}
                className="w-full h-full border-0 absolute inset-0"
                title="Virtual Tour Player Preview"
                sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
                allow="fullscreen"
                allowFullScreen
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}
