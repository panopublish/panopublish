import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { syncStreetViewConnections } from "@/lib/streetview";

export interface Photo {
  id: string;
  tour_id?: string;
  streetview_status?: string;
  streetview_photo_id?: string;
  streetview_rejection_reason?: string | null;
  [key: string]: any;
}

export function useStreetViewStatus(
  photos: Photo[],
  accessToken: string | null,
  onPhotosUpdated: () => void,
  enabled: boolean = true,
) {
  const onPhotosUpdatedRef = useRef(onPhotosUpdated);

  useEffect(() => {
    onPhotosUpdatedRef.current = onPhotosUpdated;
  }, [onPhotosUpdated]);

  const processingPhotosKey = photos
    .filter((p) => p.streetview_status === "PROCESSING" && p.streetview_photo_id)
    .map((p) => `${p.id}:${p.streetview_status}`)
    .join(",");

  useEffect(() => {
    if (!enabled) return;

    const processingPhotos = photos.filter(
      (p) => p.streetview_status === "PROCESSING" && p.streetview_photo_id,
    );

    if (!processingPhotos.length || !accessToken) return;

    let isCancelled = false;

    const checkStatuses = async () => {
      if (isCancelled) return;

      try {
        // Use 1 single batch status API call to check all photos at once!
        const { data, error } = await supabase.functions.invoke("streetview-publish", {
          body: {
            action: "batch_get_photo_status",
            access_token: accessToken,
          },
        });

        if (error) {
          console.warn("Status check notice:", error.message || error);
          return;
        }

        if (data?.success && !isCancelled) {
          // Before reloading, snapshot which photos were in PROCESSING so we can detect rejections
          const wasProcessingIds = new Set(processingPhotos.map((p) => p.id));

          onPhotosUpdatedRef.current();

          // Check if any previously-PROCESSING photo is now FAILED (Google async rejection)
          if (!isCancelled && wasProcessingIds.size > 0) {
            try {
              const processingIdArray = Array.from(wasProcessingIds);
              const { data: nowFailed } = await supabase
                .from("photos")
                .select("id, filename, streetview_status, streetview_rejection_reason")
                .in("id", processingIdArray)
                .eq("streetview_status", "FAILED");

              if (nowFailed && nowFailed.length > 0 && !isCancelled) {
                nowFailed.forEach((p: any) => {
                  const name = p.filename || p.id || "unknown scene";
                  const rawCode: string = p.streetview_rejection_reason || "";
                  // Skip REJECTED_UNKNOWN: it's handled as pending review, not a hard failure
                  if (rawCode === "REJECTED_UNKNOWN") return;

                  // Map Google's exact rejection codes to human-readable explanations
                  const rejectionMessages: Record<string, string> = {
                    REJECTED_NOT_PANORAMA:
                      "Google says this is NOT a valid equirectangular 360° panorama. The image may not be 2:1 aspect ratio, may have wrong XMP metadata, or Google's vision AI didn't recognize it as a panorama.",
                    REJECTED_INSUFFICIENT_GPS:
                      "Google rejected this photo because it has no or insufficient GPS coordinates. Please ensure the image has valid GPS EXIF data and a position is set.",
                    REJECTED_TOO_SMALL:
                      "Google rejected this photo because the resolution is too small. Street View requires a minimum of ~7.5 megapixels (approximately 4000×2000 pixels or larger).",
                    REJECTED_CORRUPT_DATA:
                      "Google rejected this photo because the image data is corrupted. Try re-exporting the original image and re-uploading.",
                    REJECTED_DUPLICATE:
                      "Google says this photo is a duplicate — a very similar photo from the same GPS location may already exist on Street View under another account.",
                  };

                  const explanation =
                    rejectionMessages[rawCode] ||
                    (rawCode
                      ? `Google rejection code: ${rawCode}. Please check image format, resolution, and GPS coordinates.`
                      : "This image was accepted for upload but then rejected during processing. Check image format, aspect ratio (must be 2:1), and GPS coordinates.");

                  toast.error(
                    `Google rejected "${name}"\n\n${explanation}`,
                    { duration: 20000 },
                  );
                });
              }
            } catch (rejectionCheckErr) {
              console.warn("Could not check for rejected photos:", rejectionCheckErr);
            }
          }

          // Check if all photos in this tour have finished processing or are in secondary review
          const tourId = processingPhotos[0]?.tour_id;
          if (tourId) {
            const { data: tourData } = await supabase
              .from("tours")
              .select("streetview_connections_synced")
              .eq("id", tourId)
              .maybeSingle();

            const { data: remainingProcessing } = await supabase
              .from("photos")
              .select("id, streetview_rejection_reason")
              .eq("tour_id", tourId)
              .eq("streetview_status", "PROCESSING");

            const strictlyProcessing = (remainingProcessing || []).filter(
              (p: any) => p.streetview_rejection_reason !== "REJECTED_UNKNOWN"
            );

            // If no scenes are in immediate ingestion processing, sync connections once
            if (strictlyProcessing.length === 0 && !tourData?.streetview_connections_synced) {
              console.log(`Scenes for tour ${tourId} finished processing / queued for review. Syncing connections...`);
              let synced = false;
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  if (attempt > 1) await new Promise((r) => setTimeout(r, attempt * 3000));
                  await syncStreetViewConnections(supabase, tourId, accessToken);
                  synced = true;
                  break;
                } catch (retryErr) {
                  console.warn(`Connection sync attempt ${attempt} failed:`, retryErr);
                }
              }
              if (synced) {
                await supabase
                  .from("tours")
                  .update({ streetview_connections_synced: true } as any)
                  .eq("id", tourId);
                toast.success("Street View connections synced to Google Maps!");
                onPhotosUpdatedRef.current();
              }
            }
          }
        }
      } catch (err) {
        console.warn("Status polling notice:", err);
      }
    };

    // Poll every 30 seconds
    const interval = setInterval(checkStatuses, 30000);

    // Initial check after a slight delay
    const initialTimer = setTimeout(checkStatuses, 3000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, [processingPhotosKey, accessToken, enabled]);
}
