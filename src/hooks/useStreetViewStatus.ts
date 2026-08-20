import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { syncStreetViewConnections } from "@/lib/streetview";

export interface Photo {
  id: string;
  tour_id?: string;
  streetview_status?: string;
  streetview_photo_id?: string;
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
          onPhotosUpdatedRef.current();

          // Check if all photos in this tour have finished processing
          const tourId = processingPhotos[0]?.tour_id;
          if (tourId) {
            const { data: remainingProcessing } = await supabase
              .from("photos")
              .select("id")
              .eq("tour_id", tourId)
              .eq("streetview_status", "PROCESSING")
              .limit(1);

            if (!remainingProcessing || remainingProcessing.length === 0) {
              console.log(`All photos for tour ${tourId} published! Syncing connections...`);
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
