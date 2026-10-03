import { createCanvas, loadImage } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "tmp", "logo-qa");
mkdirSync(outDir, { recursive: true });
const logo = await loadImage(join(process.cwd(), "public", "logo.png"));

const surfaces = [
  ["white", "#FFFFFF"],
  ["cream", "#FFF5E6"],
  ["red", "#D71920"],
  ["black", "#171717"],
];

for (const [name, color] of surfaces) {
  const canvas = createCanvas(640, 720);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const height = 420;
  const width = Math.round(height * (logo.width / logo.height));
  ctx.drawImage(logo, (canvas.width - width) / 2, 120, width, height);
  writeFileSync(join(outDir, `${name}.png`), canvas.toBuffer("image/png"));
}

console.log("wrote", surfaces.map(([name]) => name).join(", "));
