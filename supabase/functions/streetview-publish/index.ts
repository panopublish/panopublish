/// <reference path="../deno-types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

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

    if (action === "publish_photo") {
      const {
        photo_url,
        latitude,
        longitude,
        heading,
        pitch,
        roll,
        captureTime,
        placeId,
        supabase_photo_id,
      } = payload;

      // Step 1: Start upload
      const startRes = await fetch(
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
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error?.message || "Failed to start upload");
      const uploadUrl = startData.uploadUrl;

      // Step 2: Fetch photo bytes from storage (handled server-side, no CORS issues!)
      const photoRes = await fetch(photo_url);
      if (!photoRes.ok)
        throw new Error(`Failed to fetch photo from storage: status ${photoRes.status}`);
      const photoBuffer = await photoRes.arrayBuffer();

      // Nadir / Logo processing
      const { nadir_type, nadir_size, nadir_pos, nadir_logo_url } = payload;
      let processedBuffer = photoBuffer;

      const typeLower = nadir_type ? nadir_type.toLowerCase().trim() : "none";
      const posLower = nadir_pos ? nadir_pos.toLowerCase().trim() : "btm";

      if (typeLower !== "none") {
        const isTourLevelWithoutLogo = typeLower === "tour level" && !nadir_logo_url;

        if (!isTourLevelWithoutLogo) {
          try {
            const image = await Image.decode(new Uint8Array(photoBuffer));
            const W = image.width;
            const H = image.height;
            const imgBitmap = image.bitmap;
            const imgW = W;

            const sizePercent = parseFloat(nadir_size || "13%") / 100;
            const h = Math.round(H * sizePercent);

            const isBottom = posLower !== "top";
            const yStart = isBottom ? H - h : 0;

            let logo: any = null;
            let band: any = null;

            if (typeLower === "blur" || typeLower === "stretch blur") {
              band = new Image(W, h);
              const bandBitmap = band.bitmap;
              const bandW = band.width;

              const startByteIdx = yStart * W * 4;
              const copyLen = h * W * 4;

              // Zero-copy subarray slice to copy the bottom part of the original image
              bandBitmap.set(imgBitmap.subarray(startByteIdx, startByteIdx + copyLen));

              for (let y = 0; y < h; y++) {
                const factor = isBottom ? y / h : 1 - y / h;
                for (let x = 0; x < W; x++) {
                  const boundaryY = isBottom ? 0 : h - 1;

                  const boundaryIdx = (boundaryY * bandW + x) * 4;
                  const boundaryR = bandBitmap[boundaryIdx];
                  const boundaryG = bandBitmap[boundaryIdx + 1];
                  const boundaryB = bandBitmap[boundaryIdx + 2];

                  const idx = (y * bandW + x) * 4;
                  const origR = bandBitmap[idx];
                  const origG = bandBitmap[idx + 1];
                  const origB = bandBitmap[idx + 2];

                  bandBitmap[idx] = Math.round(boundaryR * factor + origR * (1 - factor));
                  bandBitmap[idx + 1] = Math.round(boundaryG * factor + origG * (1 - factor));
                  bandBitmap[idx + 2] = Math.round(boundaryB * factor + origB * (1 - factor));
                  bandBitmap[idx + 3] = 255;
                }
              }
              band.blur(Math.max(10, Math.round(h / 8)));

              // Zero-copy set back into original image bitmap
              imgBitmap.set(band.bitmap, startByteIdx);
            } else if (typeLower === "tour level" && nadir_logo_url) {
              const logoRes = await fetch(nadir_logo_url);
              if (logoRes.ok) {
                const logoBuffer = await logoRes.arrayBuffer();
                logo = await Image.decode(new Uint8Array(logoBuffer));
                const D = Math.min(logo.width, logo.height);
                logo.cover(D, D);

                const logoBitmap = logo.bitmap;
                const logoW = logo.width;

                const R = D / 2;
                for (let y = 0; y < h; y++) {
                  const targetY = yStart + y;
                  const distFromPole = isBottom ? H - 1 - targetY : targetY;
                  const r = (distFromPole / h) * R;

                  for (let x = 0; x < W; x++) {
                    const theta = (x / W) * 2 * Math.PI - Math.PI / 2;
                    const u = Math.round(R + r * Math.cos(theta));
                    const v = Math.round(R + r * Math.sin(theta));

                    if (u >= 0 && u < D && v >= 0 && v < D && r <= R) {
                      const logoIdx = (v * logoW + u) * 4;
                      const logoR = logoBitmap[logoIdx];
                      const logoG = logoBitmap[logoIdx + 1];
                      const logoB = logoBitmap[logoIdx + 2];
                      const logoA = logoBitmap[logoIdx + 3];

                      const borderThickness = R * 0.03;
                      const imgIdx = (targetY * imgW + x) * 4;

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
              }
            }

            // Reclaim large references in the GC scope prior to WebAssembly encoding to prevent OOM
            logo = null;
            band = null;

            processedBuffer = await image.encodeJPEG(90);
          } catch (nadirErr) {
            console.error("Nadir processing failed, publishing original:", nadirErr);
          }
        }
      }


      // -------------------------------------------------------------------------
      // Fix 5: Server-side GPano XMP injection (no browser dependency)
      // The legacy publish_photo path previously sent bare JPEGs to Google with
      // zero XMP metadata. We now strip any existing camera XMP and inject a
      // clean, Google-spec-compliant GPano block before uploading.
      // -------------------------------------------------------------------------
      try {
        const imgForDims = await Image.decode(
          processedBuffer instanceof ArrayBuffer
            ? new Uint8Array(processedBuffer)
            : new Uint8Array((processedBuffer as Uint8Array).buffer, (processedBuffer as Uint8Array).byteOffset, (processedBuffer as Uint8Array).byteLength)
        );
        const imgW = imgForDims.width;
        const imgH = imgForDims.height;

        // Compute 2:1 equirectangular full-pano dimensions
        let fullW = imgW;
        let fullH = imgH;
        if (Math.abs(imgW / imgH - 2.0) > 0.01) {
          if (imgW > imgH * 2) { fullW = imgW; fullH = Math.round(imgW / 2); }
          else { fullH = imgH; fullW = imgH * 2; }
        }
        const cropLeft = Math.max(0, Math.round((fullW - imgW) / 2));
        const cropTop  = Math.max(0, Math.round((fullH - imgH) / 2));

        const xmpXml = `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:GPano="http://ns.google.com/photos/1.0/panorama/">
      <GPano:UsePanoramaViewer>True</GPano:UsePanoramaViewer>
      <GPano:CaptureSoftware>PanoPublish</GPano:CaptureSoftware>
      <GPano:StitchingSoftware>PanoPublish</GPano:StitchingSoftware>
      <GPano:ProjectionType>equirectangular</GPano:ProjectionType>
      <GPano:PoseHeadingDegrees>${Number(heading || 0).toFixed(1)}</GPano:PoseHeadingDegrees>
      <GPano:PosePitchDegrees>${Number(pitch || 0).toFixed(1)}</GPano:PosePitchDegrees>
      <GPano:PoseRollDegrees>${Number(roll || 0).toFixed(1)}</GPano:PoseRollDegrees>
      <GPano:InitialViewHeadingDegrees>0.0</GPano:InitialViewHeadingDegrees>
      <GPano:InitialViewPitchDegrees>0.0</GPano:InitialViewPitchDegrees>
      <GPano:InitialViewRollDegrees>0.0</GPano:InitialViewRollDegrees>
      <GPano:InitialHorizontalFOVDegrees>75.0</GPano:InitialHorizontalFOVDegrees>
      <GPano:CroppedAreaImageWidthPixels>${imgW}</GPano:CroppedAreaImageWidthPixels>
      <GPano:CroppedAreaImageHeightPixels>${imgH}</GPano:CroppedAreaImageHeightPixels>
      <GPano:FullPanoWidthPixels>${fullW}</GPano:FullPanoWidthPixels>
      <GPano:FullPanoHeightPixels>${fullH}</GPano:FullPanoHeightPixels>
      <GPano:CroppedAreaLeftPixels>${cropLeft}</GPano:CroppedAreaLeftPixels>
      <GPano:CroppedAreaTopPixels>${cropTop}</GPano:CroppedAreaTopPixels>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;

        const enc = new TextEncoder();
        const xmpHeader = enc.encode("http://ns.adobe.com/xap/1.0/\0");
        const xmpXmlBytes = enc.encode(xmpXml);
        const segPayloadLen = xmpHeader.length + xmpXmlBytes.length;
        const segTotalLen = 2 + segPayloadLen; // includes the 2-byte length field itself

        if (segTotalLen <= 65535) {
          const rawBytes = processedBuffer instanceof ArrayBuffer
            ? new Uint8Array(processedBuffer)
            : processedBuffer as Uint8Array;

          // --- Strip existing XMP APP1 segments ---
          const stripped: Uint8Array[] = [rawBytes.subarray(0, 2)]; // SOI
          let off = 2;
          while (off < rawBytes.length - 1) {
            if (rawBytes[off] !== 0xff) break;
            const mk = rawBytes[off + 1];
            if (mk === 0xd8 || mk === 0xd9 || (mk >= 0xd0 && mk <= 0xd7)) {
              stripped.push(rawBytes.subarray(off, off + 2)); off += 2; continue;
            }
            if (mk === 0xda) { stripped.push(rawBytes.subarray(off)); break; }
            if (off + 3 >= rawBytes.length) break;
            const sLen = (rawBytes[off + 2] << 8) | rawBytes[off + 3];
            const sEnd = off + 2 + sLen;
            if (sEnd > rawBytes.length) { stripped.push(rawBytes.subarray(off)); break; }
            const seg = rawBytes.subarray(off, sEnd);
            if (mk === 0xe1 && sLen > 32) {
              const preview = new TextDecoder("utf-8", { fatal: false }).decode(
                rawBytes.subarray(off + 4, Math.min(off + 40, rawBytes.length))
              );
              if (preview.startsWith("http://ns.adobe.com/xap/1.0/")) { off = sEnd; continue; }
            }
            stripped.push(seg); off = sEnd;
          }
          const strippedLen = stripped.reduce((s, a) => s + a.length, 0);
          const strippedBytes = new Uint8Array(strippedLen);
          let wo = 0;
          for (const s of stripped) { strippedBytes.set(s, wo); wo += s.length; }

          // --- Build and prepend new XMP APP1 segment ---
          const app1 = new Uint8Array(2 + segTotalLen);
          app1[0] = 0xff; app1[1] = 0xe1;
          app1[2] = (segTotalLen >> 8) & 0xff; app1[3] = segTotalLen & 0xff;
          app1.set(xmpHeader, 4);
          app1.set(xmpXmlBytes, 4 + xmpHeader.length);

          let insertAt = 2;
          if (strippedBytes.length > 4 && strippedBytes[2] === 0xff && strippedBytes[3] === 0xe0) {
            insertAt = 2 + 2 + ((strippedBytes[4] << 8) | strippedBytes[5]);
          }
          const withXmp = new Uint8Array(strippedBytes.length + app1.length);
          withXmp.set(strippedBytes.subarray(0, insertAt), 0);
          withXmp.set(app1, insertAt);
          withXmp.set(strippedBytes.subarray(insertAt), insertAt + app1.length);
          processedBuffer = withXmp;
        }
      } catch (xmpErr) {
        console.warn("Server-side XMP injection failed, uploading without XMP:", xmpErr);
      }

      const contentLength = (
        processedBuffer instanceof ArrayBuffer
          ? processedBuffer.byteLength
          : (processedBuffer as Uint8Array).byteLength
      ).toString();



      // Step 3: Upload bytes to Google
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: processedBuffer,
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "image/jpeg",
          "Content-Length": contentLength,
        },
      });
      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error("Google upload failed:", errorText);
        throw new Error(`Failed to upload bytes to Google: ${errorText || uploadRes.statusText}`);
      }

      // Step 4: Create photo
      const body: any = {
        uploadReference: { uploadUrl },
        pose: {
          latLngPair: { latitude, longitude },
          heading,
          pitch,
          roll,
        },
      };
      if (payload.level && typeof payload.level.number === "number" && payload.level.name) {
        body.pose.level = {
          number: payload.level.number,
          name: payload.level.name.toString().toUpperCase().slice(0, 3),
        };
      }
      if (captureTime) {
        body.captureTime = { seconds: Math.floor(new Date(captureTime).getTime() / 1000) };
      }
      if (placeId) {
        body.places = [{ placeId }];
      }

      const createRes = await fetch(
        `https://streetviewpublish.googleapis.com/v1/photo?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            Referer: referer,
          },
          body: JSON.stringify(body),
        },
      );
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error?.message || "Failed to create photo");

      if (supabase_photo_id) {
        const { error } = await supabaseClient
          .from("photos")
          .update({
            streetview_photo_id: createData.photoId?.id,
            streetview_share_link: createData.shareLink,
            streetview_status: "PROCESSING",
          })
          .eq("id", supabase_photo_id);
        if (error) console.error("Error updating photo status:", error);
      }

      return new Response(JSON.stringify(createData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "publish_photo_bytes") {
      const {
        photo_base64,
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

      // Step 1: Start upload
      const startRes = await fetch(
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
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error?.message || "Failed to start upload");
      const uploadUrl = startData.uploadUrl;

      // Step 2: Decode JPEG bytes from base64
      const binaryString = atob(photo_base64);
      const processedBuffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        processedBuffer[i] = binaryString.charCodeAt(i);
      }
      const contentLength = processedBuffer.byteLength.toString();

      // Step 3: Upload bytes to Google (Server-to-Server bypasses CORS!)
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: processedBuffer,
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "image/jpeg",
          "Content-Length": contentLength,
        },
      });
      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error("Google upload failed:", errorText);
        throw new Error(`Failed to upload bytes to Google: ${errorText || uploadRes.statusText}`);
      }

      // Step 4: Create photo
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

      const createRes = await fetch(
        `https://streetviewpublish.googleapis.com/v1/photo?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            Referer: referer,
          },
          body: JSON.stringify(body),
        },
      );
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error?.message || "Failed to create photo");

      if (supabase_photo_id) {
        const { error } = await supabaseClient
          .from("photos")
          .update({
            streetview_photo_id: createData.photoId?.id,
            streetview_share_link: createData.shareLink,
            streetview_status: "PROCESSING",
          })
          .eq("id", supabase_photo_id);
        if (error) console.error("Error updating photo status:", error);
      }

      return new Response(JSON.stringify(createData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            if (found.mapsPublishStatus === "PUBLISHED") status = "PUBLISHED";
            else if (
              found.mapsPublishStatus === "REJECTED_UNKNOWN" ||
              found.mapsPublishStatus === "REJECTED"
            )
              status = "FAILED";
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

        if (data.mapsPublishStatus === "PUBLISHED") status = "PUBLISHED";
        else if (
          data.mapsPublishStatus === "REJECTED_UNKNOWN" ||
          data.mapsPublishStatus === "REJECTED"
        )
          status = "FAILED";

        shareLink = data.shareLink;
        viewCount = data.viewCount ? parseInt(data.viewCount, 10) : 0;
        rawData = data;
      }

      // Update in database directly
      const { error: dbErr } = await supabaseClient
        .from("photos")
        .update({
          streetview_status: status,
          streetview_share_link: shareLink,
          view_count: viewCount,
        })
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

        // Build a map of Google photoId → resolved status
        const statusMap = new Map<string, { status: string; shareLink?: string; viewCount: number }>();
        for (const gp of allGooglePhotos) {
          const gid = gp.photoId?.id;
          if (!gid) continue;
          const status =
            gp.mapsPublishStatus === "PUBLISHED"
              ? "PUBLISHED"
              : gp.mapsPublishStatus?.includes("REJECTED")
              ? "FAILED"
              : "PROCESSING";
          statusMap.set(gid, {
            status,
            shareLink: gp.shareLink,
            viewCount: gp.viewCount ? parseInt(gp.viewCount, 10) : 0,
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
                })
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
        return new Response(JSON.stringify({ success: true, deleted_count: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const BATCH_SIZE = 40;
      let totalDeleted = 0;
      const errors: string[] = [];

      for (let i = 0; i < photo_ids.length; i += BATCH_SIZE) {
        const batch = photo_ids.slice(i, i + BATCH_SIZE);
        let batchSuccess = false;
        let attempts = 0;

        while (!batchSuccess && attempts < 3) {
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

            totalDeleted += batch.length;
            batchSuccess = true;
          } catch (batchErr: any) {
            console.error(`batchDelete attempt ${attempts} failed:`, batchErr);
            if (attempts >= 3) {
              errors.push(batchErr.message);
              // Fallback to individual deletes with throttle
              for (const pid of batch) {
                try {
                  await fetch(
                    `https://streetviewpublish.googleapis.com/v1/photo/${pid}?key=${apiKey}`,
                    {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${access_token}`, Referer: referer },
                    },
                  );
                  totalDeleted++;
                  await new Promise((r) => setTimeout(r, 250));
                } catch (singleErr) {
                  console.error(`Single delete fallback failed for ${pid}:`, singleErr);
                }
              }
            } else {
              await new Promise((r) => setTimeout(r, 1000));
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: errors.length === 0 || totalDeleted > 0,
          deleted_count: totalDeleted,
          errors: errors.length > 0 ? errors : undefined,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "delete_photo") {
      const { streetview_photo_id } = payload;
      const res = await fetch(
        `https://streetviewpublish.googleapis.com/v1/photo/${streetview_photo_id}?key=${apiKey}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${access_token}`,
            Referer: referer,
          },
        },
      );
      if (!res.ok) {
        try {
          const data = await res.json();
          throw new Error(data.error?.message || "Failed to delete photo");
        } catch (_) {
          throw new Error(`Failed to delete photo: status ${res.status}`);
        }
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
