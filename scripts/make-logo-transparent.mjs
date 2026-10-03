import { createCanvas, loadImage } from "@napi-rs/canvas";
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const liveLogo = join(root, "public", "logo.png");
const sourceBackup = join(root, "public", "logo-source.png");
const outputs = [liveLogo, join(root, "public", "logo-transparent.png")];

if (!existsSync(liveLogo)) {
  console.error("Missing public/logo.png");
  process.exit(1);
}

if (!existsSync(sourceBackup)) {
  copyFileSync(liveLogo, sourceBackup);
}

const image = await loadImage(sourceBackup);
const { width, height } = image;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");
ctx.clearRect(0, 0, width, height);
ctx.drawImage(image, 0, 0);
const imageData = ctx.getImageData(0, 0, width, height);
const { data } = imageData;

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

const corners = [
  [0, 0],
  [width - 1, 0],
  [0, height - 1],
  [width - 1, height - 1],
].map(([x, y]) => {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
});

const bgR = Math.round(corners.reduce((sum, color) => sum + color[0], 0) / corners.length);
const bgG = Math.round(corners.reduce((sum, color) => sum + color[1], 0) / corners.length);
const bgB = Math.round(corners.reduce((sum, color) => sum + color[2], 0) / corners.length);

const tolerance = 36;
const visited = new Uint8Array(width * height);
const stack = [];

for (let x = 0; x < width; x += 1) {
  stack.push(x, 0, x, height - 1);
}
for (let y = 0; y < height; y += 1) {
  stack.push(0, y, width - 1, y);
}

while (stack.length) {
  const y = stack.pop();
  const x = stack.pop();
  if (x < 0 || y < 0 || x >= width || y >= height) continue;
  const p = y * width + x;
  if (visited[p]) continue;
  visited[p] = 1;
  const i = p * 4;
  if (colorDistance(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB) <= tolerance) {
    data[i + 3] = 0;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
}

for (let y = 1; y < height - 1; y += 1) {
  for (let x = 1; x < width - 1; x += 1) {
    const i = (y * width + x) * 4;
    if (data[i + 3] === 0) continue;
    const nearClear =
      data[i + 4 + 3] === 0 ||
      data[i - 4 + 3] === 0 ||
      data[i + width * 4 + 3] === 0 ||
      data[i - width * 4 + 3] === 0;
    if (!nearClear) continue;
    const distance = colorDistance(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB);
    if (distance <= tolerance + 18) {
      data[i + 3] = Math.max(0, Math.round(255 * (distance / (tolerance + 18))));
    }
  }
}

ctx.putImageData(imageData, 0, 0);
const png = canvas.toBuffer("image/png");
for (const output of outputs) writeFileSync(output, png);

let transparent = 0;
let opaque = 0;
for (let i = 3; i < data.length; i += 4) {
  if (data[i] === 0) transparent += 1;
  else opaque += 1;
}

console.log(
  JSON.stringify({
    width,
    height,
    bg: [bgR, bgG, bgB],
    transparent,
    opaque,
    outputs,
  })
);
