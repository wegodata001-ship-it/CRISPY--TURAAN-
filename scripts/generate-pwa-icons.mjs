import { createCanvas, loadImage } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const logo = await loadImage(join(root, "public", "logo.png"));
const cream = "#FFF5E6";

function drawIcon(size, { paddingRatio = 0.12, background = cream } = {}) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);
  const pad = Math.round(size * paddingRatio);
  const box = size - pad * 2;
  const scale = Math.min(box / logo.width, box / logo.height);
  const w = Math.round(logo.width * scale);
  const h = Math.round(logo.height * scale);
  ctx.drawImage(logo, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toBuffer("image/png");
}

const files = {
  "public/icons/icon-192.png": drawIcon(192, { paddingRatio: 0.14 }),
  "public/icons/icon-512.png": drawIcon(512, { paddingRatio: 0.14 }),
  "public/icons/icon-maskable-512.png": drawIcon(512, { paddingRatio: 0.22 }),
  "public/icons/apple-touch-icon.png": drawIcon(180, { paddingRatio: 0.14 }),
};

for (const [path, buffer] of Object.entries(files)) {
  writeFileSync(join(root, path), buffer);
}

console.log("wrote", Object.keys(files).join(", "));
