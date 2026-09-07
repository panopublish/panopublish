/**
 * Google Photo Sphere (GPano) XMP Metadata Injector
 * 
 * Google Street View Publish API strictly requires:
 * 1. GPano:UsePanoramaViewer="True"
 * 2. GPano:ProjectionType="equirectangular"
 * 3. FullPanoWidthPixels / FullPanoHeightPixels (strictly 2:1 aspect ratio)
 * 4. CroppedAreaImageWidthPixels / CroppedAreaImageHeightPixels
 * 
 * This module ensures that ANY 360 panorama uploaded through PanoPublish has valid
 * GPano XMP headers and 2:1 spherical dimensions embedded in its binary stream before
 * sending to Google Street View.
 */

export interface GPanoMetadata {
  heading?: number;
  pitch?: number;
  roll?: number;
  width?: number;
  height?: number;
}

const XMP_HEADER = "http://ns.adobe.com/xap/1.0/\0";
const GPANO_NAMESPACE = "http://ns.google.com/photos/1.0/panorama/";

/**
 * Checks whether a JPEG binary buffer contains GPano XMP metadata.
 */
export function hasGPanoMetadata(jpegBytes: Uint8Array): boolean {
  try {
    const textDecoder = new TextDecoder("utf-8", { fatal: false });
    // Scan the first 64KB (all APP headers live here)
    const scanLen = Math.min(jpegBytes.length, 65536);
    const headerSlice = textDecoder.decode(jpegBytes.subarray(0, scanLen));
    return (
      headerSlice.includes(GPANO_NAMESPACE) ||
      headerSlice.includes("GPano:UsePanoramaViewer") ||
      headerSlice.includes("UsePanoramaViewer=\"True\"") ||
      headerSlice.includes("UsePanoramaViewer>True<")
    );
  } catch {
    return false;
  }
}

/**
 * Generates an official Google Photo Sphere XMP XML string.
 */
export function createGPanoXmpXml(
  width: number,
  height: number,
  heading = 0,
  pitch = 0,
  roll = 0
): string {
  // Enforce 2:1 full pano dimensions
  let fullWidth = width;
  let fullHeight = height;

  if (Math.abs(width / height - 2.0) > 0.01) {
    // If not exact 2:1, use the larger dimension to compute full pano sphere
    if (width > height * 2) {
      fullWidth = width;
      fullHeight = Math.round(width / 2);
    } else {
      fullHeight = height;
      fullWidth = height * 2;
    }
  }

  const cropLeft = Math.max(0, Math.round((fullWidth - width) / 2));
  const cropTop = Math.max(0, Math.round((fullHeight - height) / 2));

  return `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">
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
      <GPano:CroppedAreaImageWidthPixels>${width}</GPano:CroppedAreaImageWidthPixels>
      <GPano:CroppedAreaImageHeightPixels>${height}</GPano:CroppedAreaImageHeightPixels>
      <GPano:FullPanoWidthPixels>${fullWidth}</GPano:FullPanoWidthPixels>
      <GPano:FullPanoHeightPixels>${fullHeight}</GPano:FullPanoHeightPixels>
      <GPano:CroppedAreaLeftPixels>${cropLeft}</GPano:CroppedAreaLeftPixels>
      <GPano:CroppedAreaTopPixels>${cropTop}</GPano:CroppedAreaTopPixels>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
}

/**
 * Injects a GPano XMP APP1 segment into JPEG binary data.
 */
export function injectGPanoXmpBytes(
  jpegBytes: Uint8Array,
  width: number,
  height: number,
  heading = 0,
  pitch = 0,
  roll = 0
): Uint8Array {
  // Validate JPEG SOI (0xFFD8)
  if (jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
    throw new Error("Invalid JPEG format: Missing SOI marker (0xFFD8)");
  }

  const xmlStr = createGPanoXmpXml(width, height, heading, pitch, roll);
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(XMP_HEADER);
  const xmlBytes = encoder.encode(xmlStr);

  const payloadLength = headerBytes.length + xmlBytes.length;
  const segmentLength = 2 + payloadLength; // 2 bytes length indicator

  if (segmentLength > 65535) {
    throw new Error("XMP segment size exceeds standard JPEG 64KB APP1 limit");
  }

  const app1Segment = new Uint8Array(2 + segmentLength);
  app1Segment[0] = 0xff;
  app1Segment[1] = 0xe1; // APP1 marker
  app1Segment[2] = (segmentLength >> 8) & 0xff;
  app1Segment[3] = segmentLength & 0xff;
  app1Segment.set(headerBytes, 4);
  app1Segment.set(xmlBytes, 4 + headerBytes.length);

  // Find optimal insertion point (after SOI at offset 2, or after existing APP0 JFIF marker if present)
  let insertOffset = 2;
  if (
    jpegBytes.length > 4 &&
    jpegBytes[2] === 0xff &&
    jpegBytes[3] === 0xe0 // APP0
  ) {
    const app0Len = (jpegBytes[4] << 8) + jpegBytes[5];
    insertOffset = 2 + 2 + app0Len;
  }

  const newBuffer = new Uint8Array(jpegBytes.length + app1Segment.length);
  newBuffer.set(jpegBytes.subarray(0, insertOffset), 0);
  newBuffer.set(app1Segment, insertOffset);
  newBuffer.set(jpegBytes.subarray(insertOffset), insertOffset + app1Segment.length);

  return newBuffer;
}

/**
 * Helper to get natural dimensions of an image Blob/URL
 */
function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image to calculate dimensions"));
    };
    img.src = url;
  });
}

/**
 * Ensures an image Blob has valid Google Photo Sphere GPano XMP headers embedded.
 * If missing, it computes dimensions and injects the complete GPano XMP structure.
 */
export async function ensureGPanoXmpBlob(
  blob: Blob,
  options: GPanoMetadata = {}
): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Check if GPano is already present
  if (hasGPanoMetadata(bytes)) {
    return blob;
  }

  // Get dimensions
  let width = options.width;
  let height = options.height;

  if (!width || !height) {
    const dims = await getImageDimensions(blob);
    width = dims.width;
    height = dims.height;
  }

  // If aspect ratio is significantly distorted, normalize to 2:1 canvas
  if (width && height && Math.abs(width / height - 2.0) > 0.05) {
    try {
      const normalizedBlob = await normalizeTo2To1Canvas(blob, width, height);
      const normBuffer = await normalizedBlob.arrayBuffer();
      const normBytes = new Uint8Array(normBuffer);
      const targetW = Math.max(width, height * 2);
      const targetH = Math.round(targetW / 2);
      const injectedBytes = injectGPanoXmpBytes(
        normBytes,
        targetW,
        targetH,
        options.heading || 0,
        options.pitch || 0,
        options.roll || 0
      );
      return new Blob([injectedBytes.buffer as any], { type: "image/jpeg" });
    } catch (normErr) {
      console.warn("Could not normalize non-2:1 canvas, injecting raw crop tags:", normErr);
    }
  }

  const injected = injectGPanoXmpBytes(
    bytes,
    width,
    height,
    options.heading || 0,
    options.pitch || 0,
    options.roll || 0
  );

  return new Blob([injected.buffer as any], { type: "image/jpeg" });
}

/**
 * Normalizes non-2:1 panoramic images onto a perfect 2:1 equirectangular canvas.
 */
function normalizeTo2To1Canvas(
  blob: Blob,
  srcWidth: number,
  srcHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const targetWidth = Math.max(srcWidth, srcHeight * 2);
        const targetHeight = Math.round(targetWidth / 2);

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          return resolve(blob);
        }

        // Fill background with top/bottom edge color interpolation or clean black
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Center the image vertically and horizontally
        const dx = Math.round((targetWidth - srcWidth) / 2);
        const dy = Math.round((targetHeight - srcHeight) / 2);
        ctx.drawImage(img, dx, dy, srcWidth, srcHeight);

        canvas.toBlob(
          (outBlob) => {
            URL.revokeObjectURL(url);
            if (outBlob) {
              resolve(outBlob);
            } else {
              resolve(blob);
            }
          },
          "image/jpeg",
          0.95
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for canvas normalization"));
    };
    img.src = url;
  });
}
