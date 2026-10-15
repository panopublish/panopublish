import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnv, getBinding } from "./env";

function decodeJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad === 2) base64 += '==';
    else if (pad === 3) base64 += '=';
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch (err) {
    return null;
  }
}

import { verifyJWT } from "./auth-server";

async function getUserIdFromToken(token: string) {
  if (!token) {
    throw new Error("No session token provided");
  }

  const jwtSecret = getEnv("JWT_SECRET") || "secret";
  const claims = await verifyJWT(token, jwtSecret);
  
  if (!claims || !claims.sub) {
    throw new Error("Invalid session token: JWT verification failed");
  }

  return claims.sub;
}

// 1. Google OAuth Server Function Handler
export const handleGoogleOauthServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const payload = ctx.data;
    const userId = await getUserIdFromToken(payload.token);
    const db = getBinding("DB");
    if (!db) throw new Error("Cloudflare D1 Database binding 'DB' is missing");

    const clientId = getEnv("VITE_GOOGLE_CLIENT_ID");
    const clientSecret = getEnv("GOOGLE_CLIENT_SECRET") || "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";
    const redirectUri = payload.redirect_uri || `${getEnv("VITE_APP_URL") || "https://panopublish.com"}/auth/google/callback`;

    if (payload.action === "get_auth_url") {
      const scope = encodeURIComponent(
        "https://www.googleapis.com/auth/streetviewpublish https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
      );
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account%20consent`;
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

      // Fetch the actual Google account email that authorized this session
      let googleEmail: string | null = null;
      try {
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (userInfoRes.ok) {
          const userInfo: any = await userInfoRes.json();
          googleEmail = userInfo.email || null;
        }
      } catch (uiErr) {
        console.warn("Could not fetch userinfo from Google:", uiErr);
      }

      // Ensure google_email column exists in D1 google_tokens
      try {
        await db.prepare("ALTER TABLE google_tokens ADD COLUMN google_email TEXT").run();
      } catch (_) {}

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
            "UPDATE google_tokens SET access_token = ?, refresh_token = ?, expires_at = ?, google_email = COALESCE(?, google_email) WHERE user_id = ?",
          )
          .bind(tokenData.access_token, refresh_token || null, expires_at, googleEmail, userId)
          .run();
      } else {
        await db
          .prepare(
            "INSERT INTO google_tokens (id, user_id, access_token, refresh_token, expires_at, google_email) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(
            crypto.randomUUID(),
            userId,
            tokenData.access_token,
            refresh_token || null,
            expires_at,
            googleEmail,
          )
          .run();
      }

      return { success: true, google_email: googleEmail };
    }

    if (payload.action === "get_valid_token") {
      const { results: tokens } = await db
        .prepare("SELECT * FROM google_tokens WHERE user_id = ?")
        .bind(userId)
        .all();
      const tokenRecord = tokens && tokens.length > 0 ? (tokens[0] as any) : null;
      if (!tokenRecord) {
        return { access_token: null, google_email: null };
      }

      let currentAccessToken = tokenRecord.access_token;
      let googleEmail = tokenRecord.google_email || null;

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
              google_email: googleEmail,
              error: refreshData.error_description || "Failed to refresh token",
            };
          }

          const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
          await db
            .prepare("UPDATE google_tokens SET access_token = ?, expires_at = ? WHERE user_id = ?")
            .bind(refreshData.access_token, newExpiresAt, userId)
            .run();

          currentAccessToken = refreshData.access_token;
        } catch (refreshErr: any) {
          console.error("Error refreshing token:", refreshErr);
          return { access_token: null, google_email: googleEmail, error: refreshErr.message };
        }
      }

      // Lazily backfill google_email if not yet stored
      if (!googleEmail && currentAccessToken) {
        try {
          const uRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${currentAccessToken}` },
          });
          if (uRes.ok) {
            const uData: any = await uRes.json();
            if (uData.email) {
              googleEmail = uData.email;
              try {
                await db.prepare("ALTER TABLE google_tokens ADD COLUMN google_email TEXT").run();
              } catch (_) {}
              await db
                .prepare("UPDATE google_tokens SET google_email = ? WHERE user_id = ?")
                .bind(googleEmail, userId)
                .run();
            }
          }
        } catch (_) {}
      }

      return { access_token: currentAccessToken, google_email: googleEmail };
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
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const payload = ctx.data;
    const userId = await getUserIdFromToken(payload.token);
    const db = getBinding("DB");
    const bucket = getBinding("BUCKET");
    if (!db) throw new Error("Cloudflare D1 Database binding 'DB' is missing");

    const apiKey = getEnv("VITE_GOOGLE_MAPS_API_KEY");
    if (!apiKey) throw new Error("VITE_GOOGLE_MAPS_API_KEY missing");

    const referer = "https://panopublish.com/";
    let access_token = payload.access_token;

    const getFreshGoogleToken = async (): Promise<string | null> => {
      try {
        const { results: tokens } = await db
          .prepare("SELECT * FROM google_tokens WHERE user_id = ?")
          .bind(userId)
          .all();
        const tokenRecord = tokens && tokens.length > 0 ? (tokens[0] as any) : null;
        if (!tokenRecord) return null;

        const expiresAt = new Date(tokenRecord.expires_at).getTime();
        if (Date.now() > expiresAt - 3 * 60 * 1000) {
          if (!tokenRecord.refresh_token) return tokenRecord.access_token;
          const clientId = getEnv("VITE_GOOGLE_CLIENT_ID");
          const clientSecret =
            getEnv("GOOGLE_CLIENT_SECRET") || "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";
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
          if (refreshRes.ok && refreshData.access_token) {
            const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
            await db
              .prepare(
                "UPDATE google_tokens SET access_token = ?, expires_at = ? WHERE user_id = ?",
              )
              .bind(refreshData.access_token, newExpiresAt, userId)
              .run();
            return refreshData.access_token;
          }
        }
        return tokenRecord.access_token;
      } catch (e) {
        console.error("Failed to auto-refresh google token:", e);
        return null;
      }
    };

    if (payload.action === "start_upload") {
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
      return { uploadUrl: startData.uploadUrl };
    }

    if (payload.action === "create_photo") {
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
          name: level.name.toUpperCase().slice(0, 3),
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
      const { nadir_type, nadir_size, nadir_pos, nadir_logo_url, arrow_heading, arrowHeading } = payload as any;
      let processedBuffer = new Uint8Array(photoBuffer);
      const typeLower = nadir_type ? nadir_type.toLowerCase().trim() : "none";
      const posLower = nadir_pos ? nadir_pos.toLowerCase().trim() : "btm";
      const headingDeg = typeof arrow_heading === "number" ? arrow_heading : (typeof arrowHeading === "number" ? arrowHeading : 0);
      const headingRad = (((headingDeg % 360) + 360) % 360 * Math.PI) / 180;

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
                  const angleFromArrow = isBottom
                    ? (x / W) * 2 * Math.PI - (headingRad + Math.PI)
                    : -(x / W) * 2 * Math.PI + (headingRad + Math.PI);
                  const u = Math.round(R + r * Math.sin(angleFromArrow));
                  const v = Math.round(R - r * Math.cos(angleFromArrow));

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

    if (payload.action === "batch_get_photo_status") {
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

        const updates: Array<{ id: string; status: string; shareLink?: string; rejectionReason?: string }> = [];
        for (const gp of allGooglePhotos) {
          const pid = gp.photoId?.id;
          if (!pid) continue;
          const mps: string = gp.mapsPublishStatus || "";
          // REJECTED_UNKNOWN is Google's deferred queue/review status, NOT a permanent failure.
          // Google often flips REJECTED_UNKNOWN to PUBLISHED overnight (2-24h).
          // We keep it as PROCESSING with rejectionReason = "REJECTED_UNKNOWN" so it can be monitored and synced.
          const status = mps === "PUBLISHED" ? "PUBLISHED"
            : mps === "REJECTED_UNKNOWN" ? "PROCESSING"
            : mps.startsWith("REJECTED") ? "FAILED"
            : "PROCESSING";
          const rejectionReason = mps === "PUBLISHED" ? null
            : mps.startsWith("REJECTED") ? mps
            : null;

          await db
            .prepare(
              "UPDATE photos SET streetview_status = ?, streetview_share_link = COALESCE(?, streetview_share_link), view_count = ?, streetview_rejection_reason = ? WHERE streetview_photo_id = ?",
            )
            .bind(status, gp.shareLink || null, gp.viewCount ? parseInt(gp.viewCount, 10) : 0, rejectionReason, pid)
            .run();

          updates.push({ id: pid, status, shareLink: gp.shareLink, rejectionReason: rejectionReason || undefined });
        }

        return { success: true, count: updates.length, updates };
      } catch (err: any) {
        console.error("batch_get_photo_status error:", err);
        return { success: false, error: err.message };
      }
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
            const mps: string = found.mapsPublishStatus || "";
            if (mps === "PUBLISHED") status = "PUBLISHED";
            else if (mps === "REJECTED_UNKNOWN") status = "PROCESSING";
            else if (mps.startsWith("REJECTED")) status = "FAILED";
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

        const mps: string = data.mapsPublishStatus || "";
        if (mps === "PUBLISHED") status = "PUBLISHED";
        else if (mps === "REJECTED_UNKNOWN") status = "PROCESSING";
        else if (mps.startsWith("REJECTED")) status = "FAILED";

        shareLink = data.shareLink;
        viewCount = data.viewCount ? parseInt(data.viewCount, 10) : 0;
        rawData = data;
      }

      // Update in D1 database
      const rawMps: string = rawData?.mapsPublishStatus || "";
      const rejectionReason = rawMps === "PUBLISHED" ? null
        : rawMps.startsWith("REJECTED") ? rawMps
        : null;
      await db
        .prepare(
          "UPDATE photos SET streetview_status = ?, streetview_share_link = COALESCE(?, streetview_share_link), view_count = ?, streetview_rejection_reason = ? WHERE streetview_photo_id = ?",
        )
        .bind(status, shareLink || null, viewCount, rejectionReason, streetview_photo_id)
        .run();

      return { status, shareLink, viewCount, rejectionReason, data: rawData };
    }

    if (payload.action === "batch_delete_photos") {
      const { photo_ids } = payload;
      if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
        return { success: true, deleted_count: 0, successful_ids: [], failed_ids: [] };
      }

      if (!access_token) {
        access_token = (await getFreshGoogleToken()) || access_token;
      }
      if (!access_token) {
        throw new Error("Missing Google access token. Please connect your Google account.");
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
            let res = await fetch(
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

            // If token expired, refresh and retry once
            if (res.status === 401 && attempts === 1) {
              const fresh = await getFreshGoogleToken();
              if (fresh && fresh !== access_token) {
                access_token = fresh;
                res = await fetch(
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
              }
            }

            if (res.status === 429) {
              await new Promise((r) => setTimeout(r, attempts * 1500));
              continue;
            }

            if (!res.ok) {
              const errBody = await res.text();
              throw new Error(`Google batchDelete HTTP ${res.status}: ${errBody}`);
            }

            const resData: any = await res.json();
            // Google Street View Publish API batchDelete returns { status: [Status, ...] }
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
              // If status array is not present, all in batch succeeded
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
                  let singleRes = await fetch(
                    `https://streetviewpublish.googleapis.com/v1/photo/${encodeURIComponent(pid)}?key=${apiKey}`,
                    {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${access_token}`, Referer: referer },
                    },
                  );

                  if (singleRes.status === 401) {
                    const fresh = await getFreshGoogleToken();
                    if (fresh && fresh !== access_token) {
                      access_token = fresh;
                      singleRes = await fetch(
                        `https://streetviewpublish.googleapis.com/v1/photo/${encodeURIComponent(pid)}?key=${apiKey}`,
                        {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${access_token}`, Referer: referer },
                        },
                      );
                    }
                  }

                  if (singleRes.ok || singleRes.status === 404) {
                    successfulIds.push(pid);
                    totalDeleted++;
                  } else {
                    failedIds.push(pid);
                    const errText = await singleRes.text();
                    let errMsg = `HTTP ${singleRes.status}`;
                    try {
                      const errJson = JSON.parse(errText);
                      errMsg = errJson.error?.message || errMsg;
                    } catch (_) {
                      errMsg = errText.slice(0, 100) || errMsg;
                    }
                    errors.push(`Photo ${pid}: ${errMsg}`);
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

      return {
        success: failedIds.length === 0,
        deleted_count: totalDeleted,
        successful_ids: successfulIds,
        failed_ids: failedIds,
        errors: errors.length > 0 ? errors : undefined,
      };
    }

    if (payload.action === "delete_photo") {
      const { streetview_photo_id } = payload;
      if (!streetview_photo_id) throw new Error("Missing streetview_photo_id");

      if (!access_token) {
        access_token = (await getFreshGoogleToken()) || access_token;
      }
      if (!access_token) throw new Error("Google access token required");

      let res = await fetch(
        `https://streetviewpublish.googleapis.com/v1/photo/${encodeURIComponent(streetview_photo_id)}?key=${apiKey}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${access_token}`, Referer: referer },
        },
      );

      if (res.status === 401) {
        const fresh = await getFreshGoogleToken();
        if (fresh && fresh !== access_token) {
          access_token = fresh;
          res = await fetch(
            `https://streetviewpublish.googleapis.com/v1/photo/${encodeURIComponent(streetview_photo_id)}?key=${apiKey}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${access_token}`, Referer: referer },
            },
          );
        }
      }

      if (res.ok || res.status === 404) {
        return { success: true };
      }

      const errText = await res.text();
      let errMsg = `Failed to delete photo: status ${res.status}`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error?.message || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    if (payload.action === "find_and_delete_place_photos") {
      const { place_id } = payload;
      if (!place_id) throw new Error("Missing place_id");

      if (!access_token) {
        access_token = (await getFreshGoogleToken()) || access_token;
      }
      if (!access_token) throw new Error("Google access token required");

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

      if (allFoundPhotoIds.length === 0) {
        return {
          success: true,
          count: 0,
          message: "No scenes found on Google Maps for this place under your account.",
        };
      }

      // Delete the found photo IDs
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

      return {
        success: deleteErrors.length === 0 || deleted > 0,
        count: deleted,
        found_count: allFoundPhotoIds.length,
        errors: deleteErrors.length > 0 ? deleteErrors : undefined,
        message: `Deleted ${deleted} of ${allFoundPhotoIds.length} scene(s) from Google Maps.`,
      };
    }

    if (payload.action === "list_place_photos") {
      const { place_id } = payload;
      if (!place_id) throw new Error("Missing place_id");

      if (!access_token) {
        access_token = (await getFreshGoogleToken()) || access_token;
      }
      if (!access_token) throw new Error("Google access token required");

      const url = new URL("https://streetviewpublish.googleapis.com/v1/photos");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("view", "BASIC");
      url.searchParams.set("pageSize", "100");
      url.searchParams.set("filter", `placeId=${place_id}`);

      const listRes = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${access_token}`, Referer: referer },
      });

      if (!listRes.ok) {
        const errText = await listRes.text();
        throw new Error(`Failed to list Google Maps photos: ${errText}`);
      }

      const listData: any = await listRes.json();
      return {
        success: true,
        photos: (listData.photos || []).map((gp: any) => ({
          photo_id: gp.photoId?.id,
          share_link: gp.shareLink,
          status: gp.mapsPublishStatus,
          upload_time: gp.uploadTime,
        })),
      };
    }

    throw new Error(`Unknown streetview action: ${payload.action}`);
  } catch (err: any) {
    console.error("Street View Publish Server Function error:", err);
    return { success: false, error: err.message };
  }
});

// ─── Razorpay Subscription Server Function ─────────────────────────────────

// Razorpay plan IDs (live) — Basic ₹499, Pro ₹1499, Agency ₹2999 (monthly)
const RAZORPAY_PLAN_IDS: Record<string, string> = {
  basic: "plan_TG3QOVMzMRt5sz",
  pro: "plan_TG3QtyAtMlA9V5",
  agency: "plan_TG3RnJeND7hh9t",
};

export const handleRazorpayServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async (ctx: any) => {
    try {
      const payload = ctx.data;
      const keyId = getEnv("VITE_RAZORPAY_KEY_ID") || "";
      const keySecret = getEnv("RAZORPAY_KEY_SECRET") || "";

      if (!keyId || !keySecret) {
        throw new Error("Razorpay API keys not configured");
      }

      const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);

      // ── Create Subscription ──────────────────────────────────────────────
      if (payload.action === "create_subscription") {
        const { plan_name, user_id, token } = payload;
        const planId = RAZORPAY_PLAN_IDS[plan_name?.toLowerCase()];

        if (!planId) {
          throw new Error(`Unknown plan: ${plan_name}`);
        }

        let effectiveUserId = user_id;
        if (!effectiveUserId && token) {
          try {
            effectiveUserId = await getUserIdFromToken(token);
          } catch (_) {}
        }

        const db = getBinding("DB");
        let offerIdToApply: string | null = null;
        let isOfferApplied = false;

        // Check if user has TSRHELP promo code and has not redeemed it yet
        if (db && effectiveUserId && plan_name?.toLowerCase() === "basic") {
          try {
            const userProfile: any = await db.prepare(
              "SELECT applied_promo, promo_discount_redeemed, email FROM profiles WHERE id = ?"
            ).bind(effectiveUserId).first();

            let isTsrHelpEligible = userProfile?.applied_promo === "TSRHELP";

            if (!isTsrHelpEligible && userProfile && !userProfile.promo_discount_redeemed) {
              const attrRow: any = await db.prepare(`
                SELECT id FROM referral_attributions
                WHERE referred_user_id = ?
                  AND (
                    UPPER(attributed_code) = 'TSRHELP'
                    OR referrer_user_id IN (SELECT user_id FROM referral_codes WHERE UPPER(code) = 'TSRHELP')
                    OR referrer_user_id IN (SELECT id FROM profiles WHERE LOWER(email) = 'tsrhelp7@gmail.com' OR LOWER(name) LIKE '%tsr help%')
                  )
                LIMIT 1
              `).bind(effectiveUserId).first();

              if (attrRow || userProfile.email?.toLowerCase() === "360digitalsstudio@gmail.com") {
                isTsrHelpEligible = true;
                try {
                  await db.prepare("UPDATE profiles SET applied_promo = 'TSRHELP' WHERE id = ?").bind(effectiveUserId).run();
                } catch (_) {}
              }
            }

            if (isTsrHelpEligible && !userProfile?.promo_discount_redeemed) {
              const offerId = getEnv("RAZORPAY_OFFER_TSRHELP_ID") || "offer_Tkv0P54Ob7pXDI";
              offerIdToApply = offerId;
              isOfferApplied = true;
            }
          } catch (err) {
            console.warn("Could not check TSRHELP promo eligibility:", err);
          }
        }

        const subBody: any = {
          plan_id: planId,
          quantity: 1,
          total_count: 120, // 10 years max
          notify_info: {
            notify_phone: payload.phone || null,
            notify_email: payload.email || null,
          },
        };

        if (offerIdToApply) {
          subBody.offer_id = offerIdToApply;
        }

        const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify(subBody),
        });

        const data: any = await res.json();

        if (!res.ok) {
          throw new Error(data?.error?.description || "Failed to create Razorpay subscription");
        }

        return {
          success: true,
          subscription_id: data.id,
          offer_applied: isOfferApplied,
          discount_amount: isOfferApplied ? 150 : 0,
          first_month_amount: isOfferApplied ? 349 : 499,
          regular_amount: 499,
        };
      }

      // ── Verify Subscription Payment ──────────────────────────────────────
      if (payload.action === "verify_subscription") {
        const {
          razorpay_payment_id,
          razorpay_subscription_id,
          razorpay_signature,
          plan_name,
          user_id,
        } = payload;

        // Verify signature using HMAC SHA256
        const message = `${razorpay_payment_id}|${razorpay_subscription_id}`;
        const encoder = new TextEncoder();
        const keyData = encoder.encode(keySecret);
        const msgData = encoder.encode(message);

        const cryptoKey = await crypto.subtle.importKey(
          "raw",
          keyData,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
        const computedSignature = Array.from(new Uint8Array(signatureBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        if (computedSignature !== razorpay_signature) {
          throw new Error("Signature verification failed: payment signature mismatch");
        }

        // Update subscription in D1 database
        if (user_id) {
          const db = getBinding("DB");
          if (db) {
            const planAmounts: Record<string, number> = {
              basic: 499,
              pro: 1499,
              agency: 2999,
            };
            const planLower = plan_name?.toLowerCase() || "basic";
            let amountInr = planAmounts[planLower] ?? 499;

            // Check if user redeemed TSRHELP discount on this 1st month payment
            let userProfileRow: any = null;
            try {
              userProfileRow = await db.prepare(
                "SELECT applied_promo, promo_discount_redeemed FROM profiles WHERE id = ?"
              ).bind(user_id).first();
            } catch (_) {}

            let isTsrHelpEligible = userProfileRow?.applied_promo === "TSRHELP";
            if (!isTsrHelpEligible && userProfileRow && !userProfileRow.promo_discount_redeemed) {
              try {
                const attrRow: any = await db.prepare(`
                  SELECT id FROM referral_attributions
                  WHERE referred_user_id = ?
                    AND (
                      UPPER(attributed_code) = 'TSRHELP'
                      OR referrer_user_id IN (SELECT user_id FROM referral_codes WHERE UPPER(code) = 'TSRHELP')
                      OR referrer_user_id IN (SELECT id FROM profiles WHERE LOWER(email) = 'tsrhelp7@gmail.com' OR LOWER(name) LIKE '%tsr help%')
                    )
                  LIMIT 1
                `).bind(user_id).first();
                if (attrRow || userProfileRow.email?.toLowerCase() === "360digitalsstudio@gmail.com") {
                  isTsrHelpEligible = true;
                }
              } catch (_) {}
            }

            const isTsrHelpFirstMonth =
              planLower === "basic" &&
              isTsrHelpEligible &&
              !userProfileRow?.promo_discount_redeemed;

            if (isTsrHelpFirstMonth) {
              amountInr = 349;
            }

            // Mark promo discount as redeemed so it can't be reused
            if (isTsrHelpEligible) {
              try {
                await db.prepare(
                  "UPDATE profiles SET applied_promo = 'TSRHELP', promo_discount_redeemed = 1 WHERE id = ?"
                ).bind(user_id).run();
              } catch (_) {}
            }
            const nowIso = new Date().toISOString();
            const periodEndIso = new Date(Date.now() + 30 * 86400000).toISOString();

            // Mark any previous active subscriptions for this user as cancelled
            try {
              await db
                .prepare("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'")
                .bind(user_id)
                .run();
            } catch (ignoreErr) {
              console.warn("Could not cancel existing subscriptions:", ignoreErr);
            }

            // Insert new active subscription record matching D1 schema
            await db.prepare(`
              INSERT INTO subscriptions (id, user_id, plan, status, razorpay_subscription_id, start_date, end_date, amount_inr, created_at)
              VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)
            `).bind(
              crypto.randomUUID(),
              user_id,
              planLower,
              razorpay_subscription_id || null,
              nowIso,
              periodEndIso,
              amountInr,
              nowIso,
            ).run();

            const planLimits: Record<string, number> = { basic: 5, pro: 20, agency: 50 };
            const baseLimit = planLimits[planLower] ?? 5;

            // Update profile plan & reset billing cycle tour usage count and base plan credits
            await db.prepare(`
              UPDATE profiles SET plan = ?, credits = ?, trial_ends_at = ?, billing_cycle_tours_used = 0 WHERE id = ?
            `).bind(planLower, baseLimit, periodEndIso, user_id).run();

            // Referral Commission Calculation & Recording (25% recurring)
            try {
              const attrRow: any = await db.prepare(
                "SELECT * FROM referral_attributions WHERE referred_user_id = ? LIMIT 1"
              ).bind(user_id).first();

              if (attrRow?.referrer_user_id) {
                let commissionPercent = 25.0;
                if (attrRow.referral_code_id) {
                  const codeRow: any = await db.prepare(
                    "SELECT commission_percent FROM referral_codes WHERE id = ? LIMIT 1"
                  ).bind(attrRow.referral_code_id).first();
                  if (codeRow?.commission_percent) {
                    commissionPercent = Number(codeRow.commission_percent);
                  }
                }

                const commissionAmount = Math.round(amountInr * (commissionPercent / 100) * 100) / 100;
                const payRef = razorpay_payment_id || razorpay_subscription_id || `sub_${Date.now()}`;

                const existingComm: any = await db.prepare(
                  "SELECT id FROM referral_commissions WHERE payment_reference_id = ? LIMIT 1"
                ).bind(payRef).first();

                if (!existingComm) {
                  await db.prepare(`
                    INSERT INTO referral_commissions (id, referrer_user_id, referred_user_id, payment_source, payment_reference_id, plan_name, payment_amount_inr, commission_percent, commission_amount_inr, status)
                    VALUES (?, ?, ?, 'razorpay_subscription', ?, ?, ?, ?, ?, 'approved')
                  `).bind(
                    crypto.randomUUID(),
                    attrRow.referrer_user_id,
                    user_id,
                    payRef,
                    planLower,
                    amountInr,
                    commissionPercent,
                    commissionAmount
                  ).run();
                  console.log(`[REFERRAL] Recorded ₹${commissionAmount} commission for referrer ${attrRow.referrer_user_id}`);
                }
              }
            } catch (refCommErr) {
              console.error("[REFERRAL] Subscription commission logging failed:", refCommErr);
            }
          }
        }

        return { success: true };
      }

      // ── Create One-time Order (Pay as you go credits) ───────────────────
      if (payload.action === "create_order") {
        const { credits_count, user_id } = payload;
        const count = Number(credits_count);
        if (!count || count <= 0) throw new Error("Invalid credits count");

        const totalAmountInPaise = count * 100 * 100; // ₹100/credit

        const res = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({
            amount: totalAmountInPaise,
            currency: "INR",
            receipt: `credit_${(user_id || "").slice(0, 8)}_${Date.now()}`,
            notes: {
              user_id: user_id || "",
              credits_count: count,
              type: "pay_as_you_go",
            },
          }),
        });

        const data: any = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.description || "Failed to create Razorpay order");
        }

        return {
          success: true,
          order_id: data.id,
          amount: totalAmountInPaise,
          currency: "INR",
          credits_count: count,
        };
      }

      // ── Verify One-time Order Payment ────────────────────────────────────
      if (payload.action === "verify_order_payment") {
        const {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          credits_count,
          user_id,
        } = payload;

        const count = Number(credits_count);
        if (!count || count <= 0) throw new Error("Invalid credits count");

        const message = `${razorpay_order_id}|${razorpay_payment_id}`;
        const encoder = new TextEncoder();
        const keyData = encoder.encode(keySecret);
        const msgData = encoder.encode(message);

        const cryptoKey = await crypto.subtle.importKey(
          "raw",
          keyData,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
        const computedSignature = Array.from(new Uint8Array(signatureBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        if (computedSignature !== razorpay_signature) {
          throw new Error("Signature verification failed: payment signature mismatch");
        }

        if (user_id) {
          const db = getBinding("DB");
          if (db) {
            const userRow: any = await db
              .prepare("SELECT plan, credits FROM profiles WHERE id = ?")
              .bind(user_id)
              .first();

            const basePlanLimits: Record<string, number> = { basic: 5, pro: 20, agency: 50 };
            const baseLimit = basePlanLimits[userRow?.plan] ?? 5;
            const currentAllowance = Math.max(userRow?.credits ?? 0, baseLimit);
            const newCredits = currentAllowance + count;

            await db
              .prepare("UPDATE profiles SET credits = ? WHERE id = ?")
              .bind(newCredits, user_id)
              .run();

            const nowIso = new Date().toISOString();
            await db.prepare(`
              INSERT INTO subscriptions (id, user_id, plan, status, razorpay_subscription_id, start_date, end_date, amount_inr, created_at)
              VALUES (?, ?, 'pay_as_you_go', 'active', ?, ?, ?, ?, ?)
            `).bind(
              crypto.randomUUID(),
              user_id,
              razorpay_payment_id || null,
              nowIso,
              nowIso,
              count * 100,
              nowIso,
            ).run();

            // Referral Commission Calculation & Recording for credits purchase (25%)
            try {
              const attrRow: any = await db.prepare(
                "SELECT * FROM referral_attributions WHERE referred_user_id = ? LIMIT 1"
              ).bind(user_id).first();

              if (attrRow?.referrer_user_id) {
                let commissionPercent = 25.0;
                if (attrRow.referral_code_id) {
                  const codeRow: any = await db.prepare(
                    "SELECT commission_percent FROM referral_codes WHERE id = ? LIMIT 1"
                  ).bind(attrRow.referral_code_id).first();
                  if (codeRow?.commission_percent) {
                    commissionPercent = Number(codeRow.commission_percent);
                  }
                }

                const totalInr = count * 100;
                const commissionAmount = Math.round(totalInr * (commissionPercent / 100) * 100) / 100;
                const payRef = razorpay_payment_id || `credits_${Date.now()}`;

                const existingComm: any = await db.prepare(
                  "SELECT id FROM referral_commissions WHERE payment_reference_id = ? LIMIT 1"
                ).bind(payRef).first();

                if (!existingComm) {
                  await db.prepare(`
                    INSERT INTO referral_commissions (id, referrer_user_id, referred_user_id, payment_source, payment_reference_id, plan_name, payment_amount_inr, commission_percent, commission_amount_inr, status)
                    VALUES (?, ?, ?, 'razorpay_credits', ?, 'pay_as_you_go', ?, ?, ?, 'approved')
                  `).bind(
                    crypto.randomUUID(),
                    attrRow.referrer_user_id,
                    user_id,
                    payRef,
                    totalInr,
                    commissionPercent,
                    commissionAmount
                  ).run();
                }
              }
            } catch (refErr) {
              console.error("[REFERRAL] Credit purchase commission logging failed:", refErr);
            }

            return { success: true, new_credits: newCredits, added_credits: count };
          }
        }

        return { success: true };
      }

      throw new Error(`Unknown razorpay action: ${payload.action}`);
    } catch (err: any) {
      console.error("Razorpay Server Function error:", err);
      return { success: false, error: err.message };
    }
  });
