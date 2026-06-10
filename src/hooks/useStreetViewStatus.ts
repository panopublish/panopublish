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

export function useStreetViewStatus(photos: Photo[], accessToken: string | null, onPhotosUpdated: () => void) {
  const onPhotosUpdatedRef = useRef(onPhotosUpdated);
  
  useEffect(() => {
    onPhotosUpdatedRef.current = onPhotosUpdated;
  }, [onPhotosUpdated]);

  const firstSeenProcessingRef = useRef<Record<string, number>>({});

  const processingPhotosKey = photos
    .filter(p => p.streetview_status === 'PROCESSING' && p.streetview_photo_id)
    .map(p => `${p.id}:${p.streetview_status}`)
    .join(',');

  useEffect(() => {
    const processingPhotos = photos.filter(p => p.streetview_status === 'PROCESSING' && p.streetview_photo_id);
    
    if (!processingPhotos.length || !accessToken) return;
    
    let isCancelled = false;

    const checkStatuses = async () => {
      let anyUpdated = false;
      const toursToSync = new Set<string>();

      for (const photo of processingPhotos) {
        if (isCancelled) break;
        
        // Record the first time we see this photo as PROCESSING in this session to prevent premature failure during Google replication
        if (photo.streetview_photo_id && !firstSeenProcessingRef.current[photo.streetview_photo_id]) {
          firstSeenProcessingRef.current[photo.streetview_photo_id] = Date.now();
        }

        try {
          const { data, error } = await supabase.functions.invoke("streetview-publish", {
            body: { 
              action: "get_photo_status", 
              access_token: accessToken,
              streetview_photo_id: photo.streetview_photo_id
            }
          });

          if (error) {
            console.error("Supabase Edge Function error:", error);
          } else if (data?.success === false || data?.error) {
            console.error("Google Street View API error in Edge Function:", data?.error);
            const errStr = String(data?.error || "");
            if (errStr.toLowerCase().includes("image not found") || errStr.toUpperCase().includes("NOT_FOUND")) {
              const firstSeen = firstSeenProcessingRef.current[photo.streetview_photo_id || ""] || Date.now();
              const elapsedSeconds = (Date.now() - firstSeen) / 1000;
              console.log(`Ignoring 'Image not found' error for ${photo.filename || ""} (elapsed: ${elapsedSeconds.toFixed(0)}s). It is still replicating on Google...`);
            }
          } else if (data?.status && data.status !== 'PROCESSING') {
            const { error: updateError } = await supabase.from('photos').update({
              streetview_status: data.status,
              streetview_share_link: data.shareLink
            }).eq('id', photo.id);
            
            if (!updateError) {
              anyUpdated = true;
              if (photo.tour_id) {
                toursToSync.add(photo.tour_id);
              }
            }
          }
        } catch (err) {
          console.error("Error polling photo status for", photo.id, err);
        }
      }

      // Automatically sync connections for any tours that just finished processing all photos
      for (const tourId of toursToSync) {
        try {
          const { data: remainingProcessing, error: countErr } = await supabase
            .from('photos')
            .select('id')
            .eq('tour_id', tourId)
            .eq('streetview_status', 'PROCESSING')
            .limit(1);

          if (!countErr && (!remainingProcessing || remainingProcessing.length === 0)) {
            console.log(`All photos for tour ${tourId} are published! Running final connection sync...`);
            await syncStreetViewConnections(supabase, tourId, accessToken);
            // Mark as synced in DB to prevent loops
            await supabase
              .from('tours')
              .update({ streetview_connections_synced: true } as any)
              .eq('id', tourId);
          }
        } catch (syncErr) {
          console.error(`Failed to auto-sync connections for tour ${tourId}:`, syncErr);
        }
      }

      if (anyUpdated && !isCancelled) {
        onPhotosUpdatedRef.current();
      }
    };

    // Poll every 30 seconds
    const interval = setInterval(checkStatuses, 30000);
    
    // Initial check
    checkStatuses();

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [processingPhotosKey, accessToken]);
}
