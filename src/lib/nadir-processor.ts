/**
 * Client-side Nadir Processing Utility
 * Applies Nadir Blur (stretch blur) or Tour-level Logo Patch onto 360 equirectangular panoramas.
 * Preserves EXIF/XMP metadata segments and provides an in-memory cache for instant previewing.
 */

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image from URL: ${url}`));
    img.src = url;
  });
}

export function calcHeading(
  fromLat: number | null | undefined,
  fromLng: number | null | undefined,
  toLat: number | null | undefined,
  toLng: number | null | undefined,
): number | null {
  if (
    typeof fromLat !== "number" ||
    typeof fromLng !== "number" ||
    typeof toLat !== "number" ||
    typeof toLng !== "number" ||
    isNaN(fromLat) ||
    isNaN(fromLng) ||
    isNaN(toLat) ||
    isNaN(toLng)
  ) {
    return null;
  }
  const dLon = toLng - fromLng;
  const dLat = toLat - fromLat;
  if (dLon === 0 && dLat === 0) return null;
  let h = Math.atan2(dLon, dLat) * (180 / Math.PI);
  if (h < 0) h += 360;
  return h;
}

export function getSceneArrowHeading(
  photo: { id: string; heading?: number | null; latitude?: number | null; longitude?: number | null } | null | undefined,
  allPhotos: Array<{ id: string; heading?: number | null; latitude?: number | null; longitude?: number | null }>,
  allConns: Array<{ from_photo_id: string; to_photo_id: string; heading?: number | null }>,
): number {
  if (!photo) return 0;
  const photoHeading = photo.heading || 0;

  // 1. Look for outgoing connection from this scene (align with first arrow)
  const outgoing = (allConns || []).filter((c) => c.from_photo_id === photo.id);
  if (outgoing.length > 0) {
    const conn = outgoing[0];
    const target = (allPhotos || []).find((p) => p.id === conn.to_photo_id);
    if (target) {
      const geoH = calcHeading(photo.latitude, photo.longitude, target.latitude, target.longitude);
      if (geoH !== null) {
        return (geoH - photoHeading + 360) % 360;
      }
    }
    if (typeof conn.heading === "number" && !isNaN(conn.heading)) {
      return (conn.heading - photoHeading + 360) % 360;
    }
  }

  // 2. Look for incoming connection to this scene (reverse direction by 180 degrees)
  const incoming = (allConns || []).filter((c) => c.to_photo_id === photo.id);
  if (incoming.length > 0) {
    const conn = incoming[0];
    const source = (allPhotos || []).find((p) => p.id === conn.from_photo_id);
    if (source) {
      const geoH = calcHeading(source.latitude, source.longitude, photo.latitude, photo.longitude);
      if (geoH !== null) {
        return (geoH + 180 - photoHeading + 360) % 360;
      }
    }
    if (typeof conn.heading === "number" && !isNaN(conn.heading)) {
      return (conn.heading + 180 - photoHeading + 360) % 360;
    }
  }

  // 3. Fallback to 0 degrees
  return 0;
}

export function transplantMetadata(originalBytes: Uint8Array, newBytes: Uint8Array): Uint8Array {
  if (originalBytes.length < 4 || originalBytes[0] !== 0xff || originalBytes[1] !== 0xd8) {
    return newBytes;
  }
  if (newBytes.length < 4 || newBytes[0] !== 0xff || newBytes[1] !== 0xd8) {
    return newBytes;
  }

  let originalApp0: Uint8Array | null = null;
  const appSegments: Uint8Array[] = [];
  let offset = 2; // skip SOI (0xFFD8)

  while (offset < originalBytes.length - 1) {
    if (originalBytes[offset] === 0xff) {
      const marker = originalBytes[offset + 1];

      // SOS (0xFFDA) starts scan data, stop scanning
      // EOI (0xFFD9) ends image, stop scanning
      if (marker === 0xda || marker === 0xd9) {
        break;
      }

      // Standalone markers without length: RST0-7
      if (marker >= 0xd0 && marker <= 0xd7) {
        offset += 2;
        continue;
      }

      if (offset + 3 >= originalBytes.length) break;
      const length = (originalBytes[offset + 2] << 8) + originalBytes[offset + 3];
      if (length < 2 || offset + 2 + length > originalBytes.length) break;

      // APP markers are E0 to EF
      if (marker >= 0xe0 && marker <= 0xef) {
        // Skip XMP APP1 segments — identified by the XMP namespace URI prefix.
        // We must NOT transplant the camera's XMP because ensureGPanoXmpBlob will inject
        // fresh PanoPublish XMP. Transplanting camera XMP creates dual-XMP JPEGs which
        // Google's parser rejects. EXIF APP1 (starts with "Exif\0") is kept for GPS data etc.
        const isXmp =
          marker === 0xe1 && // APP1
          length > 32 &&
          (() => {
            const preview = new TextDecoder("utf-8", { fatal: false }).decode(
              originalBytes.subarray(offset + 4, Math.min(offset + 40, originalBytes.length))
            );
            return (
              preview.startsWith("http://ns.adobe.com/xap/1.0/") ||
              preview.startsWith("http://ns.adobe.com/xmp/extension/")
            );
          })();

        if (!isXmp) {
          const segBytes = originalBytes.slice(offset, offset + 2 + length);
          if (marker === 0xe0) {
            // Keep original APP0 JFIF if present
            if (!originalApp0) originalApp0 = segBytes;
          } else {
            appSegments.push(segBytes);
          }
        }
      }

      offset += 2 + length;
    } else {
      offset++;
    }
  }

  // Find start of canvas image data (DQT, SOF, etc.), stripping any browser-generated APP segments
  // (such as stray canvas APP0 JFIF) so they don't appear out of order after APP1 Exif.
  let canvasDataOffset = 2; // skip SOI (0xFFD8)
  while (canvasDataOffset < newBytes.length - 1) {
    if (newBytes[canvasDataOffset] !== 0xff) break;
    const marker = newBytes[canvasDataOffset + 1];

    if (marker >= 0xe0 && marker <= 0xef) {
      if (canvasDataOffset + 3 >= newBytes.length) break;
      const len = (newBytes[canvasDataOffset + 2] << 8) | newBytes[canvasDataOffset + 3];
      canvasDataOffset += 2 + len;
    } else {
      break;
    }
  }

  const canvasImageData = newBytes.subarray(canvasDataOffset);
  const totalAppLength =
    (originalApp0 ? originalApp0.length : 0) +
    appSegments.reduce((sum, seg) => sum + seg.length, 0);

  const result = new Uint8Array(2 + totalAppLength + canvasImageData.length);

  // Write SOI
  result[0] = 0xff;
  result[1] = 0xd8;

  let writeOffset = 2;

  // 1. Write original APP0 immediately after SOI (strict JFIF standard compliance)
  if (originalApp0) {
    result.set(originalApp0, writeOffset);
    writeOffset += originalApp0.length;
  }

  // 2. Write original EXIF and other APP segments
  for (const seg of appSegments) {
    result.set(seg, writeOffset);
    writeOffset += seg.length;
  }

  // 3. Write canvas compressed image data (DQT, SOF, DHT, SOS...)
  result.set(canvasImageData, writeOffset);

  return result;
}


export async function processNadirClientSide(
  photoUrl: string,
  nadirType: string,
  nadirSize: string,
  nadirPos: string,
  logoUrl?: string | null,
  arrowHeadingDeg?: number | null,
): Promise<Blob> {
  const typeLower = nadirType ? nadirType.toLowerCase().trim() : "none";
  const posLower = nadirPos ? nadirPos.toLowerCase().trim() : "btm";

  let originalBytes: Uint8Array | null = null;
  let img: HTMLImageElement;

  try {
    const res = await fetch(photoUrl);
    if (res.ok) {
      const originalBuffer = await res.arrayBuffer();
      originalBytes = new Uint8Array(originalBuffer);
      if (typeLower === "none" || !typeLower) {
        return new Blob([originalBytes.buffer as any], { type: "image/jpeg" });
      }
      const localBlob = new Blob([originalBytes.buffer as any], { type: "image/jpeg" });
      const localUrl = URL.createObjectURL(localBlob);
      try {
        img = await loadImage(localUrl);
      } finally {
        URL.revokeObjectURL(localUrl);
      }
    } else {
      img = await loadImage(photoUrl);
    }
  } catch {
    img = await loadImage(photoUrl);
  }

  if (typeLower === "none" || !typeLower) {
    if (originalBytes) return new Blob([originalBytes.buffer as any], { type: "image/jpeg" });
  }

  const W = img.naturalWidth || img.width;
  const H = img.naturalHeight || img.height;

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

      // 2. Stretch boundary pixels
      const imgData = bandCtx.getImageData(0, 0, W, h);
      const pixels = imgData.data;
      const boundaryY = isBottom ? 0 : h - 1;
      const boundaryRow = new Uint8ClampedArray(W * 4);
      const boundaryOffset = boundaryY * W * 4;
      for (let i = 0; i < W * 4; i++) {
        boundaryRow[i] = pixels[boundaryOffset + i];
      }

      for (let y = 0; y < h; y++) {
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

      // 3. Hardware-accelerated blur with padding
      const radius = Math.max(10, Math.round(h / 8));
      const padding = radius * 2;
      const paddedCanvas = document.createElement("canvas");
      paddedCanvas.width = W;
      paddedCanvas.height = h + 2 * padding;
      const paddedCtx = paddedCanvas.getContext("2d");
      if (!paddedCtx) throw new Error("Could not get padded canvas context");

      if (isBottom) {
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

      const blurCanvas = document.createElement("canvas");
      blurCanvas.width = W;
      blurCanvas.height = h + 2 * padding;
      const blurCtx = blurCanvas.getContext("2d");
      if (!blurCtx) throw new Error("Could not get blur canvas context");
      blurCtx.filter = `blur(${radius}px)`;
      blurCtx.drawImage(paddedCanvas, 0, 0);

      mainCtx.drawImage(blurCanvas, 0, padding, W, h, 0, yStart, W, h);

      // Immediate memory cleanup
      bandCanvas.width = 0;
      bandCanvas.height = 0;
      paddedCanvas.width = 0;
      paddedCanvas.height = 0;
      blurCanvas.width = 0;
      blurCanvas.height = 0;
    } else if (typeLower === "tour level" && logoUrl) {
      const logoImg = await loadImage(logoUrl);
      const D = Math.min(logoImg.naturalWidth || logoImg.width, logoImg.naturalHeight || logoImg.height);
      const logoCanvas = document.createElement("canvas");
      logoCanvas.width = D;
      logoCanvas.height = D;
      const logoCtx = logoCanvas.getContext("2d");
      if (!logoCtx) throw new Error("Could not get logo canvas context");
      logoCtx.drawImage(
        logoImg,
        ((logoImg.naturalWidth || logoImg.width) - D) / 2,
        ((logoImg.naturalHeight || logoImg.height) - D) / 2,
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

      // Heading rotation in radians: align top of logo with arrow heading direction
      const headingRad = (((arrowHeadingDeg ?? 0) % 360) * Math.PI) / 180;

      for (let y = 0; y < h; y++) {
        const distFromPole = isBottom ? h - 1 - y : y;
        const r = (distFromPole / h) * R;
        const yOffset = y * W * 4;

        for (let x = 0; x < W; x++) {
          const theta = isBottom
            ? (x / W) * 2 * Math.PI - headingRad - Math.PI / 2
            : (-x / W) * 2 * Math.PI + headingRad - Math.PI / 2;
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
      logoCanvas.width = 0;
      logoCanvas.height = 0;
    }
  }

  // Export at maximum JPEG quality (0.98) to ensure zero compression degradation
  const newBlob = await new Promise<Blob>((resolve, reject) => {
    mainCanvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Failed to export image canvas to Blob"));
      },
      "image/jpeg",
      0.98,
    );
  });

  // Free main canvas backing store immediately
  mainCanvas.width = 0;
  mainCanvas.height = 0;

  if (originalBytes) {
    const newBuffer = await newBlob.arrayBuffer();
    const newBytes = new Uint8Array(newBuffer);
    const metadataPreservedBytes = transplantMetadata(originalBytes, newBytes);
    return new Blob([metadataPreservedBytes.buffer as any], { type: "image/jpeg" });
  }

  return newBlob;
}

// In-memory cache for processed object URLs so that same photo is processed once per session
const processedUrlCache = new Map<string, string>();

export async function getNadirProcessedUrl(
  photoUrl: string,
  nadirType?: string | null,
  nadirSize?: string | null,
  nadirPos?: string | null,
  logoUrl?: string | null,
  arrowHeadingDeg?: number | null,
): Promise<string> {
  const typeLower = nadirType ? nadirType.toLowerCase().trim() : "none";
  if (!typeLower || typeLower === "none") {
    return photoUrl;
  }

  const sizeVal = nadirSize || "13%";
  const posVal = nadirPos || "btm";
  const logoVal = logoUrl || "";
  const headingVal = typeof arrowHeadingDeg === "number" && !isNaN(arrowHeadingDeg) ? Math.round(arrowHeadingDeg) : 0;
  const cacheKey = `${photoUrl}|${typeLower}|${sizeVal}|${posVal}|${logoVal}|${headingVal}`;

  const cached = processedUrlCache.get(cacheKey);
  if (cached) return cached;

  try {
    const blob = await processNadirClientSide(photoUrl, typeLower, sizeVal, posVal, logoVal, headingVal);
    const objectUrl = URL.createObjectURL(blob);
    processedUrlCache.set(cacheKey, objectUrl);
    return objectUrl;
  } catch (err) {
    console.warn("Failed to generate nadir-processed preview image:", err);
    return photoUrl;
  }
}
