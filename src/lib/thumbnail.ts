/**
 * Client-side panorama thumbnail generator.
 * Converts multi-megabyte 8K/12K equirectangular panoramas into
 * ultra-lightweight ~20KB WebP/JPEG thumbnails (360x180px) in <100ms.
 */

export async function createPanoramaThumbnailBlob(
  fileOrBlob: File | Blob,
  targetWidth = 360,
  targetHeight = 180,
  quality = 0.7
): Promise<Blob> {
  // Try using createImageBitmap for zero-DOM-overhead background decoding
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(fileOrBlob);
      const canvas =
        typeof OffscreenCanvas !== "undefined"
          ? new OffscreenCanvas(targetWidth, targetHeight)
          : Object.assign(document.createElement("canvas"), {
              width: targetWidth,
              height: targetHeight,
            });

      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
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
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "medium";
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

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
