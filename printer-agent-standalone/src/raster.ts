import { concatBuffers, GS, escAlign, escCut, escFeedLines, escInit } from "./escpos";

export function escRasterBitImage(widthPx: number, heightPx: number, monoBytes: Buffer): Buffer {
  const widthBytes = Math.ceil(widthPx / 8);
  const expected = widthBytes * heightPx;
  if (monoBytes.length !== expected) {
    throw new Error(`Raster size mismatch: got ${monoBytes.length}, expected ${expected}`);
  }
  const xL = widthBytes & 0xff;
  const xH = (widthBytes >> 8) & 0xff;
  const yL = heightPx & 0xff;
  const yH = (heightPx >> 8) & 0xff;
  return concatBuffers(Buffer.from([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]), monoBytes);
}

export function rgbaToMonoRaster(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 180
): Buffer {
  const widthBytes = Math.ceil(width / 8);
  const out = Buffer.alloc(widthBytes * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i] ?? 255;
      const g = data[i + 1] ?? 255;
      const b = data[i + 2] ?? 255;
      const a = data[i + 3] ?? 255;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const black = a > 20 && lum < threshold;
      if (black) {
        out[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return out;
}

export function wrapRasterReceipt(
  raster: Buffer,
  cut: "full" | "partial" | "none" = "full"
): Buffer {
  const parts = [escInit(), escAlign("center"), raster, escAlign("left"), escFeedLines(4)];
  if (cut !== "none") parts.push(escCut(cut));
  return concatBuffers(...parts);
}
