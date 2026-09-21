#!/usr/bin/env node
/**
 * One-off asset build: the site's favicon set, cut from the train photograph.
 *
 * The source is a 1024px cut-out of a Kelana Jaya line train, kept at
 * `assets/train-source.png` rather than in `public/` so the 772 KB original is
 * never shipped — only these icons are.
 *
 * A whole train does not survive 16px: it reads as a diagonal smear. A square
 * crop of the cab does, so that is what the icons use. Run `npm run icons`
 * after replacing the source.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const SRC = resolve(root, "assets/train-source.png");

/** Ink bounds of the cut-out, so the crop survives a re-export of the source. */
async function inkBounds(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

/** The cab, as a square taken from the right edge of the train's ink. */
function cabSquare(bounds) {
  const height = bounds.maxY - bounds.minY;
  const size = Math.min(height, bounds.maxX + 1);
  return { left: bounds.maxX + 1 - size, top: bounds.minY, size };
}

async function renderSquare(file, crop, size, background, colours) {
  return sharp(file)
    .extract({ left: crop.left, top: crop.top, width: crop.size, height: crop.size })
    .resize(size, size, { fit: "cover", background })
    .png({ palette: true, colours, compressionLevel: 9 })
    .toBuffer();
}

/**
 * ICO with PNG-compressed entries. Browsers have accepted PNG inside .ico since
 * Vista, and sharp cannot write the container itself.
 */
function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach((image, index) => {
    const entry = index * 16;
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, entry + 0);
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, entry + 1);
    directory.writeUInt8(0, entry + 2); // palette size
    directory.writeUInt8(0, entry + 3); // reserved
    directory.writeUInt16LE(1, entry + 4); // colour planes
    directory.writeUInt16LE(32, entry + 6); // bits per pixel
    directory.writeUInt32LE(image.data.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += image.data.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.data)]);
}

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const paper = { r: 250, g: 249, b: 247, alpha: 1 };

const bounds = await inkBounds(SRC);
const crop = cabSquare(bounds);
console.log(`source ${SRC}`);
console.log(`  ink ${bounds.minX},${bounds.minY} → ${bounds.maxX},${bounds.maxY}`);
console.log(`  cab square ${crop.size}px at ${crop.left},${crop.top}`);

const icoSizes = [16, 32, 48];
const icoImages = [];
for (const size of icoSizes) {
  icoImages.push({ size, data: await renderSquare(SRC, crop, size, transparent, 256) });
}
writeFileSync(resolve(root, "public/favicon.ico"), packIco(icoImages));
console.log(`  wrote public/favicon.ico  (${icoSizes.join(", ")})`);

writeFileSync(
  resolve(root, "public/icon-192.png"),
  await renderSquare(SRC, crop, 192, transparent, 128),
);
console.log("  wrote public/icon-192.png  (192)");

// Apple composites transparency onto black on older iOS, so this one is grounded.
writeFileSync(
  resolve(root, "public/apple-touch-icon.png"),
  await renderSquare(SRC, crop, 180, paper, 128),
);
console.log("  wrote public/apple-touch-icon.png  (180, on paper)");

const total = readFileSync(resolve(root, "public/favicon.ico")).length
  + readFileSync(resolve(root, "public/icon-192.png")).length
  + readFileSync(resolve(root, "public/apple-touch-icon.png")).length;
console.log(`  total shipped ${(total / 1024).toFixed(1)} KB (source is ${
  (readFileSync(SRC).length / 1024).toFixed(0)
} KB and never ships)`);
