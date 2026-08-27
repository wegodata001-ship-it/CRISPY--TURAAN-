/**
 * Generate PWA icons from public/logo-transparent.png
 * Run: npx tsx scripts/generate-pwa-icons.mts
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const SOURCE = resolve(ROOT, "public/logo-transparent.png");
const OUT_DIR = resolve(ROOT, "public/icons");
const BG = "#F8F3ED";

async function icon(size: number, logoScale: number, outName: string) {
  const logoSize = Math.round(size * logoScale);
  const padding = Math.round((size - logoSize) / 2);
  const logo = await sharp(SOURCE)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logo, top: padding, left: padding }])
    .png()
    .toFile(resolve(OUT_DIR, outName));

  console.log(`[pwa-icons] ${outName} (${size}x${size})`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await icon(192, 0.72, "icon-192.png");
  await icon(512, 0.72, "icon-512.png");
  await icon(512, 0.62, "icon-maskable-512.png");
  await icon(180, 0.72, "apple-touch-icon.png");
  console.log("[pwa-icons] done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
