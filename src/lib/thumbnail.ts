/**
 * Client-side panorama thumbnail generator.
 * Converts multi-megabyte 8K/12K equirectangular panoramas into
 * ultra-lightweight ~20KB WebP/JPEG thumbnails (360x180px) in <100ms.
 *
 * Uses native browser downscaling during decode via createImageBitmap options
 * to avoid allocating ~130MB+ uncompressed 8K RGBA buffers in RAM.
 */

async function getImageHeaderDimensions(fileOrBlob: Blob): Promise<{ width: number; height: number } | null> {
  try {
    const headerSlice = fileOrBlob.slice(0, 65536);
    const buffer = await headerSlice.arrayBuffer();
    const view = new DataView(buffer);

    // 1. Check PNG: 89 50 4E 47 0D 0A 1A 0A
    if (view.byteLength >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) {
      return {
        width: view.getUint32(16),
        height: view.getUint32(20),
      };
    }

    // 2. Check JPEG: FF D8
    if (view.byteLength >= 4 && view.getUint16(0) === 0xffd8) {
      let offset = 2;
      while (offset < view.byteLength - 8) {
        if (view.getUint8(offset) !== 0xff) {
          offset++;
          continue;
        }
        const marker = view.getUint8(offset + 1);
        // SOF markers: C0 (baseline), C1 (extended sequential), C2 (progressive), C3 (lossless)
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3) {
          const height = view.getUint16(offset + 5);
          const width = view.getUint16(offset + 7);
          return { width, height };
        }
        // Skip marker segment
        const length = view.getUint16(offset + 2);
        offset += 2 + length;
      }
    }

    // 3. Check WebP: RIFF ... WEBP
    if (view.byteLength >= 30 && view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57454250) {
      if (view.getUint32(12) === 0x56503858) {
        const width = 1 + view.getUint16(24, true) + ((view.getUint8(26) & 0xff) << 16);
        const height = 1 + view.getUint16(27, true) + ((view.getUint8(29) & 0xff) << 16);
        return { width, height };
      }
    }
  } catch {
    // Non-fatal, fallback to default dimensions
  }
  return null;
}

export async function createPanoramaThumbnailBlob(
  fileOrBlob: File | Blob,
  targetWidth = 360,
  targetHeight = 180,
  quality = 0.7
): Promise<Blob> {
  const headerDims = await getImageHeaderDimensions(fileOrBlob);
  let finalWidth = targetWidth;
  let finalHeight = targetHeight;

  if (headerDims && headerDims.width > 0 && headerDims.height > 0) {
    const aspect = headerDims.width / headerDims.height;
    if (Math.abs(aspect - 2.0) > 0.05) {
      // Non-2:1 image: calculate proportional dimensions to avoid distortion
      if (aspect >= 1) {
        finalWidth = targetWidth;
        finalHeight = Math.max(1, Math.round(targetWidth / aspect));
      } else {
        finalHeight = targetHeight;
        finalWidth = Math.max(1, Math.round(targetHeight * aspect));
      }
    }
  }

  // Try using createImageBitmap with hardware downscale during decoding
  if (typeof createImageBitmap === "function") {
    try {
      let bitmap: ImageBitmap;
      try {
        // Native downsampling during decode avoids 134MB+ transient memory spikes
        bitmap = await (createImageBitmap as any)(fileOrBlob, {
          resizeWidth: finalWidth,
          resizeHeight: finalHeight,
          resizeQuality: "medium",
        });
      } catch {
        // Browser fallback if resize options are unsupported
        bitmap = await createImageBitmap(fileOrBlob);
      }

      const canvas =
        typeof OffscreenCanvas !== "undefined"
          ? new OffscreenCanvas(finalWidth, finalHeight)
          : Object.assign(document.createElement("canvas"), {
              width: finalWidth,
              height: finalHeight,
            });

      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
        ctx.drawImage(bitmap, 0, 0, finalWidth, finalHeight);
        bitmap.close();

        if ("convertToBlob" in canvas) {
          try {
            return await (canvas as OffscreenCanvas).convertToBlob({
              type: "image/webp",
              quality,
            });
          } catch {
            return await (canvas as OffscreenCanvas).convertToBlob({
              type: "image/jpeg",
              quality,
            });
          }
        } else if ("toBlob" in canvas) {
          return await new Promise<Blob>((resolve, reject) => {
            (canvas as HTMLCanvasElement).toBlob(
              (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
              "image/webp",
              quality
            );
          });
        }
      }
    } catch (err) {
      console.warn("createImageBitmap thumbnail failed, falling back to Image element:", err);
    }
  }

  // Fallback using HTMLImageElement
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(fileOrBlob);
    img.crossOrigin = "anonymous";

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "medium";
      ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            canvas.toBlob(
              (jpgBlob) => {
                if (jpgBlob) resolve(jpgBlob);
                else reject(new Error("Thumbnail blob generation failed"));
              },
              "image/jpeg",
              quality
            );
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for thumbnail creation"));
    };

    img.src = objectUrl;
  });
}
