/// <reference path="../deno-types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, access_token, ...payload } = await req.json();
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY missing");

    const referer =
      req.headers.get("referer") || req.headers.get("origin") || "https://app.vista360digital.com/";

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );


    // â”€â”€ Active upload pipeline starts here â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // The legacy publish_photo and publish_photo_bytes server-side actions have
    // been removed. The current pipeline is: client calls start_upload to get a
    // Google upload URL, uploads the JPEG bytes directly via XHR (with progress),
    // then calls create_photo to register the pose metadata. This avoids sending
    // large image payloads through the edge function entirely.








    if (action === "start_upload") {
      const res = await fetch(
        `https://streetviewpublish.googleapis.com/v1/photo:startUpload?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Length": "0",
            Referer: referer,
          },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to start upload");
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_photo") {
      const {
        uploadUrl,
        latitude,
        longitude,
        heading,
        pitch,
        roll,
        captureTime,
        placeId,
        supabase_photo_id,
        level,
      } = payload;

      const body: any = {
        uploadReference: { uploadUrl },
        pose: {
          latLngPair: { latitude, longitude },
          heading,
          pitch,
          roll,
        },
      };
      if (level && typeof level.number === "number" && level.name) {
        body.pose.level = {
          number: level.number,
          name: level.name.toString().toUpperCase().slice(0, 3),
        };
      }
      if (captureTime) {
        body.captureTime = { seconds: Math.floor(new Date(captureTime).getTime() / 1000) };
      }
      if (placeId) {
        body.places = [{ placeId }];
      }

      const res = await fetch(`https://streetviewpublish.googleapis.com/v1/photo?key=${apiKey}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
          Referer: referer,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create photo");

      if (supabase_photo_id) {
        const { error } = await supabaseClient
          .from("photos")
          .update({
            streetview_photo_id: data.photoId?.id,
            streetview_share_link: data.shareLink,
            streetview_status: "PROCESSING",
          })
          .eq("id", supabase_photo_id);
        if (error) console.error("Error updating photo status:", error);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_connections") {
      const { connections } = payload;
      const allRequests = connections.map((c: any) => {
        const photo: any = {
          photoId: { id: c.streetview_photo_id },
          connections: (c.connected_ids || []).map((id: string) => ({ target: { id } })),
        };

        let updateMask = "connections";

        if (c.pose) {
          photo.pose = {
            latLngPair: {
              latitude: c.pose.latitude,
              longitude: c.pose.longitude,
            },
            heading: c.pose.heading,
            pitch: c.pose.pitch,
            roll: c.pose.roll,
          };
          updateMask += ",pose.lat_lng_pair,pose.heading,pose.pitch,pose.roll";

          if (c.pose.level) {
            photo.pose.level = {
              number: c.pose.level.number,
              name: c.pose.level.name,
            };
            updateMask += ",pose.level";
          }
        }

        return {
          photo,
          updateMask,
        };
      });

      const chunkSize = 20;
      const results: any[] = [];

      for (let i = 0; i < allRequests.length; i += chunkSize) {
        const chunk = allRequests.slice(i, i + chunkSize);
        const res = await fetch(
          `https://streetviewpublish.googleapis.com/v1/photos:batchUpdate?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
              Referer: referer,
            },
            body: JSON.stringify({ updatePhotoRequests: chunk }),
          },
        );
        const data = await res.json();
        if (!res.ok)
          throw new Error(
            data.error?.message ||
              `Failed to update connections for batch ${Math.floor(i / chunkSize) + 1}`,
          );
        if (data.results) {
          results.push(...data.results);
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_photo_status") {
      const { streetview_photo_id } = payload;

      let status = "PROCESSING";
      let shareLink = undefined;
      let viewCount = 0;
      let rawData = null;

      try {
        // 1. Try to fetch from the list endpoint first to get mapsPublishStatus
        const listRes = await fetch(
          `https://streetviewpublish.googleapis.com/v1/photos?key=${apiKey}&view=BASIC&pageSize=100`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              Referer: referer,
            },
          },
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          const googlePhotos = listData.photos || [];
          const found = googlePhotos.find((gp: any) => gp.photoId?.id === streetview_photo_id);
          if (found) {
            const mps: string = found.mapsPublishStatus || "";
            if (mps === "PUBLISHED") status = "PUBLISHED";
            // Capture ALL Google rejection codes â€” previously only REJECTED_UNKNOWN was handled,
            // leaving REJECTED_NOT_PANORAMA, REJECTED_INSUFFICIENT_GPS, REJECTED_TOO_SMALL,
            // REJECTED_CORRUPT_DATA, REJECTED_DUPLICATE permanently stuck as PROCESSING.
            else if (mps.startsWith("REJECTED")) status = "FAILED";
            shareLink = found.shareLink;
            viewCount = found.viewCount ? parseInt(found.viewCount, 10) : 0;
            rawData = found;
          }
        }
      } catch (listErr) {
        console.error("Failed to fetch status from list, falling back to singular get:", listErr);
      }

      // 2. If not found in the list (e.g. older photo beyond first 100), fall back to singular get endpoint
      if (!rawData) {
        const res = await fetch(
          `https://streetviewpublish.googleapis.com/v1/photo/${streetview_photo_id}?key=${apiKey}&view=BASIC`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              Referer: referer,
            },
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Failed to get photo status");

        const mps: string = data.mapsPublishStatus || "";
        if (mps === "PUBLISHED") status = "PUBLISHED";
        else if (mps.startsWith("REJECTED")) status = "FAILED";

        shareLink = data.shareLink;
        viewCount = data.viewCount ? parseInt(data.viewCount, 10) : 0;
        rawData = data;
      }

      // Update in database directly â€” also store the raw mapsPublishStatus as rejection_reason
      const rejectionReason = (rawData?.mapsPublishStatus || "").startsWith("REJECTED")
        ? rawData.mapsPublishStatus
        : null;
      const { error: dbErr } = await supabaseClient
        .from("photos")
        .update({
          streetview_status: status,
          streetview_share_link: shareLink,
          view_count: viewCount,
          ...(rejectionReason ? { streetview_rejection_reason: rejectionReason } : {}),
        } as any)
        .eq("streetview_photo_id", streetview_photo_id);

      if (dbErr) {
        console.error("Error updating database in get_photo_status:", dbErr);
      }

      return new Response(JSON.stringify({ status, shareLink, viewCount, data: rawData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_photos") {
      const res = await fetch(
        `https://streetviewpublish.googleapis.com/v1/photos?key=${apiKey}&view=BASIC`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Referer: referer,
          },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to list photos");
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "batch_get_photo_status") {
      try {
        // Paginate through ALL Google Street View photos (API max is 100/page)
        const allGooglePhotos: any[] = [];
        let pageToken: string | undefined = undefined;
        let pageCount = 0;
        const MAX_PAGES = 10; // safety cap: 1000 photos

        do {
          const url = new URL("https://streetviewpublish.googleapis.com/v1/photos");
          url.searchParams.set("key", apiKey);
          url.searchParams.set("view", "BASIC");
          url.searchParams.set("pageSize", "100");
          if (pageToken) url.searchParams.set("pageToken", pageToken);

          const listRes = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${access_token}`, Referer: referer },
          });
          if (!listRes.ok) {
            throw new Error(`Failed to list photos (page ${pageCount + 1}): status ${listRes.status}`);
          }
          const listData: any = await listRes.json();
          const page = listData.photos || [];
          allGooglePhotos.push(...page);
          pageToken = listData.nextPageToken;
          pageCount++;
        } while (pageToken && pageCount < MAX_PAGES);

        // Build a map of Google photoId â†’ resolved status
        const statusMap = new Map<string, { status: string; shareLink?: string; viewCount: number; rejectionReason?: string }>();
        for (const gp of allGooglePhotos) {
          const gid = gp.photoId?.id;
          if (!gid) continue;
          const mps: string = gp.mapsPublishStatus || "";
          const status = mps === "PUBLISHED" ? "PUBLISHED"
            : mps.startsWith("REJECTED") ? "FAILED"
            : "PROCESSING";
          statusMap.set(gid, {
            status,
            shareLink: gp.shareLink,
            viewCount: gp.viewCount ? parseInt(gp.viewCount, 10) : 0,
            rejectionReason: mps.startsWith("REJECTED") ? mps : undefined,
          });
        }

        // Bulk-update our Supabase DB for all photos whose status changed
        // (Do this server-side so it's instant and doesn't require a client round-trip)
        if (statusMap.size > 0) {
          const updates: Promise<any>[] = [];
          for (const [gid, info] of statusMap) {
            updates.push(
              supabaseClient
                .from("photos")
                .update({
                  streetview_status: info.status,
                  streetview_share_link: info.shareLink || null,
                  view_count: info.viewCount,
                  // Store the exact Google rejection code (REJECTED_NOT_PANORAMA, REJECTED_DUPLICATE, etc.)
                  // so the UI can show a meaningful error instead of a generic "must be 2:1" message
                  ...(info.rejectionReason ? { streetview_rejection_reason: info.rejectionReason } : {}),
                } as any)
                .eq("streetview_photo_id", gid),
            );
          }
          // Fire all updates in parallel, ignore individual errors
          await Promise.allSettled(updates);
        }


        return new Response(
          JSON.stringify({
            success: true,
            total_google_photos: allGooglePhotos.length,
            photos: Array.from(statusMap.entries()).map(([id, info]) => ({
              id,
              ...info,
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "batch_delete_photos") {
      const { photo_ids } = payload;
      if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
        return new Response(
          JSON.stringify({ success: true, deleted_count: 0, successful_ids: [], failed_ids: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const cleanPhotoIds = photo_ids
        .map((id: any) => (typeof id === "string" ? id.trim() : ""))
        .filter((id: string) => id.length > 0);

      const BATCH_SIZE = 40;
      let totalDeleted = 0;
      const successfulIds: string[] = [];
      const failedIds: string[] = [];
      const errors: string[] = [];

      for (let i = 0; i < cleanPhotoIds.length; i += BATCH_SIZE) {
        const batch = cleanPhotoIds.slice(i, i + BATCH_SIZE);
        let batchProcessed = false;
        let attempts = 0;

        while (!batchProcessed && attempts < 3) {
          attempts++;
          try {
            const res = await fetch(
              `https://streetviewpublish.googleapis.com/v1/photos:batchDelete?key=${apiKey}`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${access_token}`,
                  "Content-Type": "application/json",
                  Referer: referer,
                },
                body: JSON.stringify({ photoIds: batch }),
              },
            );

            if (res.status === 429) {
              await new Promise((r) => setTimeout(r, attempts * 1500));
              continue;
            }

            if (!res.ok) {
              const errBody = await res.text();
              throw new Error(`Google batchDelete HTTP ${res.status}: ${errBody}`);
            }

            const resData: any = await res.json();
            if (Array.isArray(resData?.status)) {
              for (let idx = 0; idx < batch.length; idx++) {
                const pid = batch[idx];
                const st = resData.status[idx];
                const code = st?.code ?? 0;
                // code 0 = OK, code 5 = NOT_FOUND (already deleted on Google)
                if (code === 0 || code === 5) {
                  successfulIds.push(pid);
                  totalDeleted++;
                } else {
                  failedIds.push(pid);
                  const msg = st?.message || `Google error code ${code}`;
                  errors.push(`Photo ${pid}: ${msg}`);
                }
              }
            } else {
              successfulIds.push(...batch);
              totalDeleted += batch.length;
            }

            batchProcessed = true;
          } catch (batchErr: any) {
            console.error(`batchDelete attempt ${attempts} failed:`, batchErr);
            if (attempts >= 3) {
              // Fallback to individual deletes with throttle and explicit status checking
              for (const pid of batch) {
                try {
                  const singleRes = await fetch(
                    `https://streetviewpublish.googleapis.com/v1/photo/${encodeURIComponent(pid)}?key=${apiKey}`,
                    {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${access_token}`, Referer: referer },
                    },
                  );

                  if (singleRes.ok || singleRes.status === 404) {
                    successfulIds.push(pid);
                    totalDeleted++;
                  } else {
                    failedIds.push(pid);
                    const errText = await singleRes.text();
                    errors.push(`Photo ${pid}: HTTP ${singleRes.status} - ${errText.slice(0, 100)}`);
                  }
                  await new Promise((r) => setTimeout(r, 200));
                } catch (singleErr: any) {
                  failedIds.push(pid);
                  errors.push(`Photo ${pid}: ${singleErr.message}`);
                }
              }
              batchProcessed = true;
            } else {
              await new Promise((r) => setTimeout(r, 1000));
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: failedIds.length === 0,
          deleted_count: totalDeleted,
          successful_ids: successfulIds,
          failed_ids: failedIds,
          errors: errors.length > 0 ? errors : undefined,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "delete_photo") {
      const { streetview_photo_id } = payload;
      if (!streetview_photo_id) {
        return new Response(JSON.stringify({ error: "Missing streetview_photo_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(
        `https://streetviewpublish.googleapis.com/v1/photo/${encodeURIComponent(streetview_photo_id)}?key=${apiKey}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${access_token}`,
            Referer: referer,
          },
        },
      );

      if (res.ok || res.status === 404) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const errBody = await res.text();
      return new Response(
        JSON.stringify({ error: `Failed to delete photo: status ${res.status} - ${errBody}` }),
        {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "find_and_delete_place_photos") {
      const { place_id } = payload;
      if (!place_id) {
        return new Response(JSON.stringify({ error: "Missing place_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allFoundPhotoIds: string[] = [];
      let pageToken: string | undefined = undefined;
      let pageCount = 0;

      do {
        const url = new URL("https://streetviewpublish.googleapis.com/v1/photos");
        url.searchParams.set("key", apiKey);
        url.searchParams.set("view", "BASIC");
        url.searchParams.set("pageSize", "100");
        url.searchParams.set("filter", `placeId=${place_id}`);
        if (pageToken) url.searchParams.set("pageToken", pageToken);

        const listRes = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${access_token}`, Referer: referer },
        });

        if (!listRes.ok) {
          const errText = await listRes.text();
          throw new Error(`Failed to query Google Maps for place photos: ${errText}`);
        }

        const listData: any = await listRes.json();
        const photos = listData.photos || [];
        for (const gp of photos) {
          if (gp.photoId?.id) {
            allFoundPhotoIds.push(gp.photoId.id);
          }
        }
        pageToken = listData.nextPageToken;
        pageCount++;
      } while (pageToken && pageCount < 10);

      let deleted = 0;
      const deleteErrors: string[] = [];
      for (const pid of allFoundPhotoIds) {
        try {
          const delRes = await fetch(
            `https://streetviewpublish.googleapis.com/v1/photo/${encodeURIComponent(pid)}?key=${apiKey}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${access_token}`, Referer: referer },
            },
          );
          if (delRes.ok || delRes.status === 404) {
            deleted++;
          } else {
            deleteErrors.push(`Failed to delete ${pid}: status ${delRes.status}`);
          }
          await new Promise((r) => setTimeout(r, 200));
        } catch (e: any) {
          deleteErrors.push(`Failed to delete ${pid}: ${e.message}`);
        }
      }

      return new Response(
        JSON.stringify({
          success: deleteErrors.length === 0 || deleted > 0,
          count: deleted,
          found_count: allFoundPhotoIds.length,
          errors: deleteErrors.length > 0 ? deleteErrors : undefined,
          message: `Deleted ${deleted} of ${allFoundPhotoIds.length} scene(s) from Google Maps.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in streetview-publish:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
