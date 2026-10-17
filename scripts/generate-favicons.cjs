const fs = require("fs");
const path = require("path");
const jimp = require("jimp");

function createDIB(bitmap) {
  const w = bitmap.width;
  const h = bitmap.height;
  const andRowBytes = Math.ceil(w / 32) * 4;
  const andMaskSize = andRowBytes * h;
  const xorSize = w * h * 4;
  const headerSize = 40;
  const totalSize = headerSize + xorSize + andMaskSize;
  const buf = Buffer.alloc(totalSize);

  // BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, 0); // biSize
  buf.writeInt32LE(w, 4); // biWidth
  buf.writeInt32LE(h * 2, 8); // biHeight (2 * h required for ICO format)
  buf.writeUInt16LE(1, 12); // biPlanes
  buf.writeUInt16LE(32, 14); // biBitCount
  buf.writeUInt32LE(0, 16); // biCompression (BI_RGB)
  buf.writeUInt32LE(xorSize + andMaskSize, 20); // biSizeImage
  buf.writeInt32LE(0, 24); // biXPelsPerMeter
  buf.writeInt32LE(0, 28); // biYPelsPerMeter
  buf.writeUInt32LE(0, 32); // biClrUsed
  buf.writeUInt32LE(0, 36); // biClrImportant

  // XOR Mask: BGRA bottom-up
  let offset = headerSize;
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = bitmap.data[idx];
      const g = bitmap.data[idx + 1];
      const b = bitmap.data[idx + 2];
      const a = bitmap.data[idx + 3];
      buf[offset++] = b;
      buf[offset++] = g;
      buf[offset++] = r;
      buf[offset++] = a;
    }
  }

  // AND Mask: 1 bit per pixel bottom-up (0 = opaque / rendered by alpha, 1 = transparent)
  for (let y = h - 1; y >= 0; y--) {
    let rowStart = offset;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = bitmap.data[idx + 3];
      if (a < 128) {
        const byteOffset = rowStart + Math.floor(x / 8);
        const bitOffset = 7 - (x % 8);
        buf[byteOffset] |= 1 << bitOffset;
      }
    }
    offset += andRowBytes;
  }

  return buf;
}

function buildICO(dibs) {
  const numImages = dibs.length;
  const headerSize = 6 + 16 * numImages;
  let currentOffset = headerSize;
  const entries = [];

  for (const d of dibs) {
    entries.push({
      width: d.size,
      height: d.size,
      size: d.dib.length,
      offset: currentOffset,
      dib: d.dib,
    });
    currentOffset += d.dib.length;
  }

  const icoBuf = Buffer.alloc(currentOffset);
  icoBuf.writeUInt16LE(0, 0); // reserved (0)
  icoBuf.writeUInt16LE(1, 2); // type 1 = ICO
  icoBuf.writeUInt16LE(numImages, 4);

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const off = 6 + i * 16;
    icoBuf.writeUInt8(e.width === 256 ? 0 : e.width, off);
    icoBuf.writeUInt8(e.height === 256 ? 0 : e.height, off + 1);
    icoBuf.writeUInt8(0, off + 2); // color count
    icoBuf.writeUInt8(0, off + 3); // reserved
    icoBuf.writeUInt16LE(1, off + 4); // planes
    icoBuf.writeUInt16LE(32, off + 6); // bitCount
    icoBuf.writeUInt32LE(e.size, off + 8); // dwBytesInRes
    icoBuf.writeUInt32LE(e.offset, off + 12); // dwImageOffset
    e.dib.copy(icoBuf, e.offset);
  }

  return icoBuf;
}

async function main() {
  const publicDir = path.join(__dirname, "..", "public");
  const srcPath = path.join(publicDir, "favicon.png");
  console.log("Loading source image from:", srcPath);

  const src = await jimp.Jimp.read(srcPath);

  // 1. Generate PNG sizes
  const pngOutputs = [
    { filename: "favicon-16x16.png", size: 16 },
    { filename: "favicon-32x32.png", size: 32 },
    { filename: "favicon-48x48.png", size: 48 },
    { filename: "apple-touch-icon.png", size: 180 },
    { filename: "icon-192x192.png", size: 192 },
  ];

  for (const p of pngOutputs) {
    const outPath = path.join(publicDir, p.filename);
    const resized = src.clone().resize({
      w: p.size,
      h: p.size,
      mode: jimp.ResizeStrategy.BICUBIC,
    });
    await resized.write(outPath);
    console.log(`[GENERATED] ${p.filename} (${p.size}x${p.size})`);
  }

  // 2. Generate multi-resolution Windows ICO (16, 32, 48)
  const icoSizes = [16, 32, 48];
  const dibs = [];
  for (const s of icoSizes) {
    const resized = src.clone().resize({
      w: s,
      h: s,
      mode: jimp.ResizeStrategy.BICUBIC,
    });
    dibs.push({ size: s, dib: createDIB(resized.bitmap) });
  }

  const icoBuf = buildICO(dibs);
  const icoPath = path.join(publicDir, "favicon.ico");
  fs.writeFileSync(icoPath, icoBuf);
  console.log(
    `[GENERATED] favicon.ico (${icoBuf.length} bytes, multi-resolution 16x16, 32x32, 48x48)`,
  );
}

main().catch((err) => {
  console.error("Failed to generate favicons:", err);
  process.exit(1);
});
