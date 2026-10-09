/**
 * Google Photo Sphere (GPano) XMP Metadata Injector
 *
 * Google Street View Publish API strictly requires:
 * 1. GPano:UsePanoramaViewer="True"
 * 2. GPano:ProjectionType="equirectangular"
 * 3. FullPanoWidthPixels / FullPanoHeightPixels (strictly 2:1 aspect ratio)
 * 4. CroppedAreaImageWidthPixels / CroppedAreaImageHeightPixels
 *
 * CRITICAL DESIGN RULES (learned from Google rejection analysis):
 * - NEVER trust existing camera-embedded GPano XMP — it may be partial, outdated, or
 *   use attributes Google no longer accepts.
 * - ALWAYS strip ALL existing XMP APP1 segments before injecting fresh GPano XMP.
 *   A JPEG with dual XMP APP1 segments is treated as malformed by Google's parser.
 * - ALWAYS re-inject on every upload path, even if metadata appears present.
 */

export interface GPanoMetadata {
  heading?: number;
  pitch?: number;
  roll?: number;
  width?: number;
  height?: number;
  forceNormalize?: boolean;
}

const XMP_HEADER = "http://ns.adobe.com/xap/1.0/\0";
const XMP_HEADER_ALT = "http://ns.adobe.com/xap/1.0/ \0"; // some encoders add trailing space

/**
 * Strips ALL existing XMP APP1 segments from a JPEG binary.
 *
 * Google's Street View API parser rejects JPEGs that contain more than one XMP APP1
 * segment. Camera-generated XMP (from Insta360, Ricoh Theta, DJI, etc.) can be
 * stale, partial, or use deprecated attributes. We always strip and replace with a
 * clean, Google-spec-compliant XMP block.
 *
 * Algorithm:
 *  1. Walk the JPEG marker stream starting at offset 2 (after SOI 0xFFD8).
 *  2. For each APP1 (0xFFE1) segment, peek inside its payload for the XMP namespace
 *     header string. If found, omit this segment from the output buffer.
 *  3. Copy all other segments verbatim.
 */
export function stripExistingXmpSegments(jpegBytes: Uint8Array): Uint8Array {
  // Validate JPEG SOI
  if (jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
    return jpegBytes; // Not a valid JPEG — return unchanged, caller will handle
  }

  const XMP_NS_BYTES_A = new TextEncoder().encode("http://ns.adobe.com/xap/1.0/");
  const segments: Uint8Array[] = [jpegBytes.subarray(0, 2)]; // SOI
  let offset = 2;

  while (offset < jpegBytes.length - 1) {
    // Every JPEG marker starts with 0xFF
    if (jpegBytes[offset] !== 0xff) break;

    const marker = jpegBytes[offset + 1];

    // Markers without a length field (standalone): SOI (D8), EOI (D9), RST0-7 (D0-D7)
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      segments.push(jpegBytes.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    // SOS (Start of Scan) — compressed image data follows; copy everything to end
    if (marker === 0xda) {
      segments.push(jpegBytes.subarray(offset));
      break;
    }

    // All other markers have a 2-byte big-endian length (includes the 2 length bytes)
    if (offset + 3 >= jpegBytes.length) break;
    const segLen = (jpegBytes[offset + 2] << 8) | jpegBytes[offset + 3];
    const segEnd = offset + 2 + segLen; // marker(2) + length(segLen)

    if (segEnd > jpegBytes.length) {
      // Malformed — just copy the rest verbatim
      segments.push(jpegBytes.subarray(offset));
      break;
    }

    const segmentBytes = jpegBytes.subarray(offset, segEnd);

    // APP1 (0xFFE1) — check if it's an XMP segment
    if (marker === 0xe1 && segLen > XMP_NS_BYTES_A.length + 2) {
      // Payload starts at byte 4 (after 0xFF 0xE1 <len-hi> <len-lo>)
      const payloadStart = offset + 4;
      const payloadPreview = jpegBytes.subarray(payloadStart, Math.min(payloadStart + 35, jpegBytes.length));
      const previewStr = new TextDecoder("utf-8", { fatal: false }).decode(payloadPreview);

      const isXmpSegment =
        previewStr.startsWith("http://ns.adobe.com/xap/1.0/") ||
        previewStr.includes("http://ns.adobe.com/xap/1.0/ ");

      if (isXmpSegment) {
        // Skip this XMP APP1 segment — do NOT push to output
        offset = segEnd;
        continue;
      }
    }

    // Keep all other segments (APP0 JFIF, APP1 Exif, APP2 ICC, etc.)
    segments.push(segmentBytes);
    offset = segEnd;
  }

  // Concatenate all kept segments into a new buffer
  const totalLength = segments.reduce((sum, s) => sum + s.length, 0);
  const result = new Uint8Array(totalLength);
  let writeOffset = 0;
  for (const seg of segments) {
    result.set(seg, writeOffset);
    writeOffset += seg.length;
  }
  return result;
}

/**
 * Validates that a JPEG already contains a complete, Google-spec-compliant GPano XMP block.
 * This checks for the minimal required fields — not just the presence of any GPano string.
 *
 * Returns true ONLY if ALL required fields are present with valid values.
 * Returns false if any field is missing, malformed, or the aspect ratio is wrong.
 */
export function hasValidGPanoMetadata(jpegBytes: Uint8Array, width?: number, height?: number): boolean {
  try {
    const textDecoder = new TextDecoder("utf-8", { fatal: false });
    // Scan the first 64KB — all APP headers live here per JPEG spec
    const scanLen = Math.min(jpegBytes.length, 65536);
    const headerSlice = textDecoder.decode(jpegBytes.subarray(0, scanLen));

    // Must have all required Google Street View XMP fields
    const hasViewer = headerSlice.includes("UsePanoramaViewer>True<") || headerSlice.includes('UsePanoramaViewer="True"');
    const hasProjection = headerSlice.includes("ProjectionType>equirectangular<") || headerSlice.includes('ProjectionType="equirectangular"');
    const hasFullWidth = headerSlice.includes("FullPanoWidthPixels");
    const hasFullHeight = headerSlice.includes("FullPanoHeightPixels");
    const hasCroppedWidth = headerSlice.includes("CroppedAreaImageWidthPixels");
    const hasCroppedHeight = headerSlice.includes("CroppedAreaImageHeightPixels");

    if (!hasViewer || !hasProjection || !hasFullWidth || !hasFullHeight || !hasCroppedWidth || !hasCroppedHeight) {
      return false;
    }

    // If we know the actual dimensions, verify the encoded aspect ratio is 2:1
    if (width && height) {
      // Extract FullPanoWidthPixels value from XMP
      const widthMatch = headerSlice.match(/FullPanoWidthPixels[>="](\d+)/);
      const heightMatch = headerSlice.match(/FullPanoHeightPixels[>="](\d+)/);
      if (widthMatch && heightMatch) {
        const xmpW = parseInt(widthMatch[1], 10);
        const xmpH = parseInt(heightMatch[1], 10);
        // Reject if encoded dimensions disagree with actual or ratio isn't 2:1
        if (Math.abs(xmpW / xmpH - 2.0) > 0.01) return false;
        if (Math.abs(xmpW - width) > 2 || Math.abs(xmpH - height) > 2) return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * @deprecated Use hasValidGPanoMetadata() for reliable detection.
 * Kept for backward-compat with any external callers.
 */
export function hasGPanoMetadata(jpegBytes: Uint8Array): boolean {
  try {
    const textDecoder = new TextDecoder("utf-8", { fatal: false });
    const scanLen = Math.min(jpegBytes.length, 65536);
    const headerSlice = textDecoder.decode(jpegBytes.subarray(0, scanLen));
    return (
      headerSlice.includes("http://ns.google.com/photos/1.0/panorama/") ||
      headerSlice.includes("GPano:UsePanoramaViewer") ||
      headerSlice.includes('UsePanoramaViewer="True"') ||
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
 *
 * IMPORTANT: Call stripExistingXmpSegments() on the input BEFORE calling this function.
 * Injecting without stripping first produces dual-XMP JPEGs that Google's parser rejects.
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

  // Find optimal insertion point: after SOI (offset 2), or after APP0 JFIF if present.
  // We intentionally insert BEFORE any existing APP1 Exif block so XMP is encountered first.
  let insertOffset = 2;
  if (
    jpegBytes.length > 4 &&
    jpegBytes[2] === 0xff &&
    jpegBytes[3] === 0xe0 // APP0 JFIF
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
 * Reads actual JPEG pixel dimensions from the SOF (Start of Frame) marker in the binary stream.
 *
 * WHY THIS IS CRITICAL:
 * `img.naturalWidth / naturalHeight` in a browser APPLIES EXIF orientation automatically.
 * If a 360 camera wrote EXIF Orientation=6 (90° CW), the browser reports width=height_physical
 * and height=width_physical. Our XMP then claims the WRONG dimensions. Google reads the physical
 * SOF dimensions from the JPEG binary, sees a mismatch with XMP, and rejects with "must be 2:1".
 *
 * This function bypasses EXIF entirely and reads the true physical pixel dimensions.
 */
export function getJpegDimensionsFromSof(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 10 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let off = 2;
  while (off < bytes.length - 8) {
    if (bytes[off] !== 0xff) break;
    const mk = bytes[off + 1];
    // SOF markers: C0-C3, C5-C7, C9-CB, CD-CF (all DCT/lossless SOF variants)
    const isSof =
      (mk >= 0xc0 && mk <= 0xc3) ||
      (mk >= 0xc5 && mk <= 0xc7) ||
      (mk >= 0xc9 && mk <= 0xcb) ||
      (mk >= 0xcd && mk <= 0xcf);
    if (isSof && off + 8 < bytes.length) {
      // SOF layout: FF Cx [len_hi len_lo] [precision] [height_hi height_lo] [width_hi width_lo]
      const h = (bytes[off + 5] << 8) | bytes[off + 6];
      const w = (bytes[off + 7] << 8) | bytes[off + 8];
      if (w > 0 && h > 0) return { width: w, height: h };
    }
    // Skip to next marker
    if (mk === 0xd8 || mk === 0xd9 || (mk >= 0xd0 && mk <= 0xd7)) { off += 2; continue; }
    if (mk === 0xda) break; // SOS — compressed data starts, no more markers
    if (off + 3 >= bytes.length) break;
    const segLen = (bytes[off + 2] << 8) | bytes[off + 3];
    off += 2 + segLen;
  }
  return null;
}

/**
 * Ensures an image Blob has valid Google Photo Sphere GPano XMP headers embedded.
 *
 * KEY BEHAVIOR:
 * 1. Uses SOF-based dimension reading (physical JPEG pixels, not EXIF-corrected visual size)
 *    to prevent XMP dimension mismatch when EXIF Orientation ≠ 1.
 * 2. For images that are NOT 2:1: canvas-normalize to exact 2:1, then inject XMP with
 *    ORIGINAL dimensions as CroppedArea fields (not the canvas 2:1 target dimensions).
 * 3. For images that ARE already 2:1: strip existing XMP + inject fresh PanoPublish XMP.
 *    No re-encoding — preserves original JPEG quality exactly.
 * 4. `forceNormalize` means "always strip and reinject XMP" (not "always canvas re-encode").
 */
export async function ensureGPanoXmpBlob(
  blob: Blob,
  options: GPanoMetadata = {}
): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const rawBytes = new Uint8Array(arrayBuffer);

  // PRIMARY: Read dimensions from SOF marker (true physical pixels, unaffected by EXIF orientation)
  const sofDims = getJpegDimensionsFromSof(rawBytes);

  // FALLBACK: Read visual dimensions from <img> (respects EXIF rotation)
  let width = options.width ?? sofDims?.width;
  let height = options.height ?? sofDims?.height;

  if (!width || !height) {
    try {
      const dims = await getImageDimensions(blob);
      width = dims.width;
      height = dims.height;
    } catch {
      // Dimensions completely unavailable — injection will be skipped
    }
  }

  // If SOF dims available and EXIF-corrected visual dims differ significantly, prefer SOF
  // (prevents XMP dimension mismatch caused by EXIF orientation tags)
  if (sofDims && width && height) {
    const sofAspect = sofDims.width / sofDims.height;
    const visualAspect = width / height;
    // If the two sources disagree on orientation (portrait vs landscape), use SOF
    if (Math.abs(sofAspect - visualAspect) > 0.5) {
      console.info(
        `[PanoPublish XMP] EXIF orientation mismatch detected. ` +
        `SOF: ${sofDims.width}x${sofDims.height}, visual: ${width}x${height}. Using SOF dims.`
      );
      width = sofDims.width;
      height = sofDims.height;
    }
  }

  console.info(
    `[PanoPublish XMP] Processing ${width}x${height} (SOF: ${sofDims?.width}x${sofDims?.height}) ` +
    `aspect=${width && height ? (width/height).toFixed(3) : '?'} forceNormalize=${!!options.forceNormalize}`
  );

  const isAspectRatio2To1 = width && height && Math.abs(width / height - 2.0) <= 0.02;

  // --- Path A: genuinely non-2:1 aspect ratio ---
  // Canvas-normalize to exact 2:1 ONLY when required for geometry.
  // Use ORIGINAL dimensions (width, height) as CroppedArea XMP fields — the canvas target
  // dimensions (targetW, targetH) describe the FullPano sphere, not the content area.
  if (width && height && !isAspectRatio2To1) {
    try {
      const normalizedBlob = await normalizeTo2To1Canvas(blob, width, height);
      const normBuffer = await normalizedBlob.arrayBuffer();
      const normBytes = new Uint8Array(normBuffer);

      // Verify the canvas output dimensions match what we expect
      const normSofDims = getJpegDimensionsFromSof(normBytes);
      const targetW = normSofDims?.width ?? Math.max(width, height * 2);
      const targetH = normSofDims?.height ?? Math.round(targetW / 2);

      // IMPORTANT: pass original (width, height) — createGPanoXmpXml will compute correct
      // CroppedArea and FullPano fields from these. Passing (targetW, targetH) would make
      // CroppedAreaImageWidth = FullPanoWidth (no crop offset) which is incorrect.
      const injectedBytes = injectGPanoXmpBytes(
        normBytes,
        width,
        height,
        options.heading || 0,
        options.pitch || 0,
        options.roll || 0
      );
      console.info(`[PanoPublish XMP] Path A (canvas normalize): canvas=${targetW}x${targetH}, XMP content=${width}x${height}`);
      return new Blob([injectedBytes.buffer as ArrayBuffer], { type: "image/jpeg" });
    } catch (normErr) {
      console.warn("[PanoPublish XMP] Canvas normalize failed, falling through to strip+inject:", normErr);
    }
  }

  // --- Path B: 2:1 image (or canvas normalization failed) ---
  // Strip all existing XMP, inject fresh PanoPublish GPano XMP.
  // Byte-level injection: preserves original JPEG quality exactly.
  if (width && height) {
    try {
      const strippedBytes = stripExistingXmpSegments(rawBytes);
      const injected = injectGPanoXmpBytes(
        strippedBytes,
        width,
        height,
        options.heading || 0,
        options.pitch || 0,
        options.roll || 0
      );
      console.info(`[PanoPublish XMP] Path B (strip+inject): ${width}x${height} (2:1=${isAspectRatio2To1})`);
      return new Blob([injected.buffer as ArrayBuffer], { type: "image/jpeg" });
    } catch (e) {
      console.warn("[PanoPublish XMP] Could not strip+inject GPano XMP bytes:", e);
    }
  }

  console.warn(`[PanoPublish XMP] All paths failed — uploading without XMP. width=${width}, height=${height}`);
  return blob;
}

/**
 * Normalizes non-2:1 panoramic images onto a perfect 2:1 equirectangular canvas.
 * Note: canvas.toBlob() strips all JPEG APP segments (EXIF, XMP, ICC). The caller
 * must inject XMP after receiving the canvas output.
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

        // Fill background with clean black (equirectangular poles are black by convention)
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
