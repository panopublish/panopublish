import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnv, getBinding } from "./env";

function decodeJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch (err) {
    return null;
  }
}

async function getUserIdFromToken(token: string) {
  const supabaseUrl = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const supabaseKey = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || getEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Key not set on server");
  }
  
  const claims = decodeJWT(token);
  console.log("[FUNCTIONS SERVER] Decoded JWT Claims:", claims);
  console.log("[FUNCTIONS SERVER] Current Supabase URL:", supabaseUrl);

  const url = `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`;
  console.log("[FUNCTIONS SERVER] Direct fetch request to URL:", url);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${token}`,
    },
  });

  console.log("[FUNCTIONS SERVER] Direct fetch status:", res.status);
  const text = await res.text();
  console.log("[FUNCTIONS SERVER] Direct fetch response:", text);

  if (!res.ok) {
    throw new Error("Invalid session token: " + (text || res.statusText));
  }

  const user = JSON.parse(text);
  return user.id;
}

// 1. Google OAuth Server Function Handler
export const handleGoogleOauthServerFn = createServerFn({ method: "POST" })
  .handler(async (ctx: any) => {
    try {
      const input = ctx.data;
      const payload = input?.data || input;
    const userId = await getUserIdFromToken(payload.token);
    const db = getBinding("DB");
    if (!db) throw new Error("Cloudflare D1 Database binding 'DB' is missing");

    const clientId = getEnv("VITE_GOOGLE_CLIENT_ID");
    const clientSecret = getEnv("GOOGLE_CLIENT_SECRET") || "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";
    const redirectUri = payload.redirect_uri || `${getEnv("VITE_SUPABASE_URL")}/auth/v1/callback`;

    if (payload.action === "get_auth_url") {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/streetviewpublish&access_type=offline&prompt=consent`;
      return { authUrl };
    }

    if (payload.action === "exchange_code") {
      const { code } = payload;
      if (!code) throw new Error("Missing auth code");

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId!,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData: any = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error_description || "Failed to exchange code");

      const expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Query existing tokens from D1 database
      const { results: existingTokens } = await db
        .prepare("SELECT * FROM google_tokens WHERE user_id = ?")
        .bind(userId)
        .all();
      const existingToken = existingTokens && existingTokens.length > 0 ? existingTokens[0] : null;

      const refresh_token = tokenData.refresh_token || existingToken?.refresh_token;

      if (existingToken) {
        await db
          .prepare(
            "UPDATE google_tokens SET access_token = ?, refresh_token = ?, expires_at = ? WHERE user_id = ?",
          )
          .bind(tokenData.access_token, refresh_token || null, expires_at, userId)
          .run();
      } else {
        await db
          .prepare(
            "INSERT INTO google_tokens (id, user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?, ?)",
          )
          .bind(
            crypto.randomUUID(),
            userId,
            tokenData.access_token,
            refresh_token || null,
            expires_at,
          )
          .run();
      }

      return { success: true };
    }

    if (payload.action === "get_valid_token") {
      const { results: tokens } = await db
        .prepare("SELECT * FROM google_tokens WHERE user_id = ?")
        .bind(userId)
        .all();
      const tokenRecord = tokens && tokens.length > 0 ? tokens[0] : null;
      if (!tokenRecord) {
        return { access_token: null };
      }

      const expiresAt = new Date(tokenRecord.expires_at).getTime();
      if (Date.now() > expiresAt - 5 * 60 * 1000) {
        // Refresh token
        try {
          const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId!,
              client_secret: clientSecret,
              refresh_token: tokenRecord.refresh_token,
              grant_type: "refresh_token",
            }),
          });
          const refreshData: any = await refreshRes.json();
          if (!refreshRes.ok) {
            console.error("Failed to refresh token:", refreshData);
            return {
              access_token: null,
              error: refreshData.error_description || "Failed to refresh token",
            };
          }

          const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
          await db
            .prepare("UPDATE google_tokens SET access_token = ?, expires_at = ? WHERE user_id = ?")
            .bind(refreshData.access_token, newExpiresAt, userId)
            .run();

          return { access_token: refreshData.access_token };
        } catch (refreshErr: any) {
          console.error("Error refreshing token:", refreshErr);
          return { access_token: null, error: refreshErr.message };
        }
      }

      return { access_token: tokenRecord.access_token };
    }

    if (payload.action === "disconnect") {
      await db.prepare("DELETE FROM google_tokens WHERE user_id = ?").bind(userId).run();
      return { success: true };
    }

    throw new Error(`Unknown OAuth action: ${payload.action}`);
  } catch (err: any) {
    console.error("Google OAuth Server Function error:", err);
    return { success: false, error: err.message };
  }
});

export const handleStreetViewPublishServerFn = createServerFn({ method: "POST" })
  .handler(async (ctx: any) => {
    try {
      const input = ctx.data;
      const payload = input?.data || input;
    const userId = await getUserIdFromToken(payload.token);
    const db = getBinding("DB");
    const bucket = getBinding("BUCKET");
    if (!db) throw new Error("Cloudflare D1 Database binding 'DB' is missing");

    const apiKey = getEnv("VITE_GOOGLE_MAPS_API_KEY");
    if (!apiKey) throw new Error("VITE_GOOGLE_MAPS_API_KEY missing");

    const referer = "https://app.panopublish.com/";
    const access_token = payload.access_token;

    if (payload.action === "publish_photo" || payload.action === "publish_photo_bytes") {
      const { latitude, longitude, heading, pitch, roll, captureTime, placeId, supabase_photo_id } =
        payload;
      let photoBuffer: ArrayBuffer;

      // Dynamically import Jimp only on the server to prevent bundler errors on client build
      const JimpModule = await import("jimp");
      const Jimp = (JimpModule as any).default || JimpModule;

      if (payload.action === "publish_photo_bytes") {
        const binaryString = atob(payload.photo_base64 || "");
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        photoBuffer = bytes.buffer;
      } else {
        // Fetch from R2 bucket directly if file_path is provided
        const { results: photoRows } = await db
          .prepare("SELECT file_path, file_url FROM photos WHERE id = ?")
          .bind(supabase_photo_id)
          .all();
        const pRow = photoRows?.[0];

        if (pRow?.file_path && bucket) {
          const object = await bucket.get(pRow.file_path);
          if (!object) throw new Error(`Photo file path ${pRow.file_path} not found in R2 bucket`);
          photoBuffer = await object.arrayBuffer();
        } else {
          const photoUrl = payload.photo_url || pRow?.file_url;
          if (!photoUrl) throw new Error("Photo URL or path missing");
          const photoRes = await fetch(photoUrl);
          if (!photoRes.ok)
            throw new Error(`Failed to fetch photo from storage: status ${photoRes.status}`);
          photoBuffer = await photoRes.arrayBuffer();
        }
      }

      // Nadir / Logo processing using Jimp
      const { nadir_type, nadir_size, nadir_pos, nadir_logo_url } = payload as any;
      let processedBuffer = new Uint8Array(photoBuffer);
      const typeLower = nadir_type ? nadir_type.toLowerCase().trim() : "none";
      const posLower = nadir_pos ? nadir_pos.toLowerCase().trim() : "btm";

      if (typeLower !== "none" && !(typeLower === "tour level" && !nadir_logo_url)) {
        try {
          const image = await Jimp.read(Buffer.from(photoBuffer));
          const W = image.bitmap.width;
          const H = image.bitmap.height;
          const imgBitmap = image.bitmap.data;

          const sizePercent = parseFloat(nadir_size || "13%") / 100;
          const h = Math.round(H * sizePercent);
          const isBottom = posLower !== "top";
          const yStart = isBottom ? H - h : 0;

          if (typeLower === "blur" || typeLower === "stretch blur") {
            const band = new Jimp(W, h);
            const bandBitmap = band.bitmap.data;
            const startByteIdx = yStart * W * 4;
            const copyLen = h * W * 4;

            bandBitmap.set(imgBitmap.subarray(startByteIdx, startByteIdx + copyLen));

            for (let y = 0; y < h; y++) {
              const factor = isBottom ? y / h : 1 - y / h;
              for (let x = 0; x < W; x++) {
                const boundaryY = isBottom ? 0 : h - 1;
                const boundaryIdx = (boundaryY * W + x) * 4;
                const boundaryR = bandBitmap[boundaryIdx];
                const boundaryG = bandBitmap[boundaryIdx + 1];
                const boundaryB = bandBitmap[boundaryIdx + 2];

                const idx = (y * W + x) * 4;
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
            imgBitmap.set(band.bitmap.data, startByteIdx);
          } else if (typeLower === "tour level" && nadir_logo_url) {
            const logoRes = await fetch(nadir_logo_url);
            if (logoRes.ok) {
              const logoBytes = await logoRes.arrayBuffer();
              const logo = await Jimp.read(Buffer.from(logoBytes));
              const D = Math.min(logo.bitmap.width, logo.bitmap.height);
              logo.cover(D, D);

              const logoBitmap = logo.bitmap.data;
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
                    const logoIdx = (v * D + u) * 4;
                    const logoR = logoBitmap[logoIdx];
                    const logoG = logoBitmap[logoIdx + 1];
                    const logoB = logoBitmap[logoIdx + 2];
                    const logoA = logoBitmap[logoIdx + 3];

                    const borderThickness = R * 0.03;
                    const imgIdx = (targetY * W + x) * 4;

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

          const outputBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
          processedBuffer = new Uint8Array(outputBuffer);
        } catch (nadirErr) {
          console.error("Nadir processing failed, publishing original:", nadirErr);
        }
      }

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
      const startData: any = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error?.message || "Failed to start upload");
      const uploadUrl = startData.uploadUrl;

      // Step 2: Upload bytes to Google
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: processedBuffer,
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "image/jpeg",
          "Content-Length": processedBuffer.byteLength.toString(),
        },
      });
      if (!uploadRes.ok) {
        throw new Error(`Failed to upload bytes to Google: ${await uploadRes.text()}`);
      }

      // Step 3: Create photo metadata
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
          name: payload.level.name.toUpperCase().slice(0, 3),
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
      const createData: any = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error?.message || "Failed to create photo");

      if (supabase_photo_id) {
        await db
          .prepare(
            "UPDATE photos SET streetview_photo_id = ?, streetview_share_link = ?, streetview_status = 'PROCESSING' WHERE id = ?",
          )
          .bind(createData.photoId?.id, createData.shareLink || null, supabase_photo_id)
          .run();
      }

      return createData;
    }

    if (payload.action === "update_connections") {
      const { connections } = payload;
      const allRequests = (connections || []).map((c: any) => {
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
        return { photo, updateMask };
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
        const data: any = await res.json();
        if (!res.ok)
          throw new Error(
            data.error?.message ||
              `Failed to update connections for batch ${Math.floor(i / chunkSize) + 1}`,
          );
        if (data.results) {
          results.push(...data.results);
        }
      }

      return { results };
    }

    if (payload.action === "get_photo_status") {
      const { streetview_photo_id } = payload;
      let status = "PROCESSING";
      let shareLink = undefined;
      let viewCount = 0;
      let rawData = null;

      try {
        const listRes = await fetch(
          `https://streetviewpublish.googleapis.com/v1/photos?key=${apiKey}&view=BASIC&pageSize=100`,
          {
            headers: { Authorization: `Bearer ${access_token}`, Referer: referer },
          },
        );
        if (listRes.ok) {
          const listData: any = await listRes.json();
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
        console.error("Failed status from list, trying Singular get:", listErr);
      }

      if (!rawData) {
        const res = await fetch(
          `https://streetviewpublish.googleapis.com/v1/photo/${streetview_photo_id}?key=${apiKey}&view=BASIC`,
          {
            headers: { Authorization: `Bearer ${access_token}`, Referer: referer },
          },
        );
        const data: any = await res.json();
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

      // Update in D1 database
      await db
        .prepare(
          "UPDATE photos SET streetview_status = ?, streetview_share_link = ?, view_count = ? WHERE streetview_photo_id = ?",
        )
        .bind(status, shareLink || null, viewCount, streetview_photo_id)
        .run();

      return { status, shareLink, viewCount, data: rawData };
    }

    if (payload.action === "delete_photo") {
      const { streetview_photo_id } = payload;
      const res = await fetch(
        `https://streetviewpublish.googleapis.com/v1/photo/${streetview_photo_id}?key=${apiKey}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${access_token}`, Referer: referer },
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to delete photo: status ${res.status}`);
      }
      return { success: true };
    }

    throw new Error(`Unknown streetview action: ${payload.action}`);
  } catch (err: any) {
    console.error("Street View Publish Server Function error:", err);
    return { success: false, error: err.message };
  }
});
