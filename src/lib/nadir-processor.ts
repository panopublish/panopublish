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

export function transplantMetadata(originalBytes: Uint8Array, newBytes: Uint8Array): Uint8Array {
  const appSegments: Uint8Array[] = [];
  let offset = 2; // skip SOI (0xFFD8)

  while (offset < originalBytes.length) {
    if (originalBytes[offset] === 0xff) {
      const marker = originalBytes[offset + 1];

      // SOS (0xFFDA) starts scan data, stop scanning
      // EOI (0xFFD9) ends image, stop scanning
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

export async function processNadirClientSide(
  photoUrl: string,
  nadirType: string,
  nadirSize: string,
  nadirPos: string,
  logoUrl?: string | null,
): Promise<Blob> {
  const res = await fetch(photoUrl);
  if (!res.ok) throw new Error(`Failed to fetch photo from storage: status ${res.status}`);
  const originalBuffer = await res.arrayBuffer();
  const originalBytes = new Uint8Array(originalBuffer);

  const typeLower = nadirType ? nadirType.toLowerCase().trim() : "none";
  const posLower = nadirPos ? nadirPos.toLowerCase().trim() : "btm";

  if (typeLower === "none" || !typeLower) {
    return new Blob([originalBytes], { type: "image/jpeg" });
  }

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
    } else if (typeLower === "tour level" && logoUrl) {
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

  const newBuffer = await newBlob.arrayBuffer();
  const newBytes = new Uint8Array(newBuffer);
  const metadataPreservedBytes = transplantMetadata(originalBytes, newBytes);

  return new Blob([metadataPreservedBytes.buffer as any], { type: "image/jpeg" });
}

// In-memory cache for processed object URLs so that same photo is processed once per session
const processedUrlCache = new Map<string, string>();

export async function getNadirProcessedUrl(
  photoUrl: string,
  nadirType?: string | null,
  nadirSize?: string | null,
  nadirPos?: string | null,
  logoUrl?: string | null,
): Promise<string> {
  const typeLower = nadirType ? nadirType.toLowerCase().trim() : "none";
  if (!typeLower || typeLower === "none") {
    return photoUrl;
  }

  const sizeVal = nadirSize || "13%";
  const posVal = nadirPos || "btm";
  const logoVal = logoUrl || "";
  const cacheKey = `${photoUrl}|${typeLower}|${sizeVal}|${posVal}|${logoVal}`;

  const cached = processedUrlCache.get(cacheKey);
  if (cached) return cached;

  try {
    const blob = await processNadirClientSide(photoUrl, typeLower, sizeVal, posVal, logoVal);
    const objectUrl = URL.createObjectURL(blob);
    processedUrlCache.set(cacheKey, objectUrl);
    return objectUrl;
  } catch (err) {
    console.warn("Failed to generate nadir-processed preview image:", err);
    return photoUrl;
  }
}
