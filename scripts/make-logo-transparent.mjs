import sharp from "sharp";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const input = join(root, "public", "logo.png");
const output = join(root, "public", "logo-transparent.png");

if (!existsSync(input)) {
  console.error("Missing public/logo.png");
  process.exit(1);
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/** Sample background from corners */
const samples = [
  [0, 0],
  [width - 1, 0],
  [0, height - 1],
  [width - 1, height - 1],
  [1, 1],
  [width - 2, height - 2],
].map(([x, y]) => {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
});
const bgR = Math.round(samples.reduce((s, c) => s + c[0], 0) / samples.length);
const bgG = Math.round(samples.reduce((s, c) => s + c[1], 0) / samples.length);
const bgB = Math.round(samples.reduce((s, c) => s + c[2], 0) / samples.length);

const tolerance = 38;
const visited = new Uint8Array(width * height);
const queue = [];

for (let x = 0; x < width; x++) {
  queue.push([x, 0], [x, height - 1]);
}
for (let y = 0; y < height; y++) {
  queue.push([0, y], [width - 1, y]);
}

function idx(x, y) {
  return y * width + x;
}

while (queue.length) {
  const [x, y] = queue.pop();
  const p = idx(x, y);
  if (x < 0 || y < 0 || x >= width || y >= height || visited[p]) continue;
  visited[p] = 1;
  const i = p * 4;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (colorDistance(r, g, b, bgR, bgG, bgB) <= tolerance) {
    data[i + 3] = 0;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

/** Soften anti-alias fringe near transparency */
for (let y = 1; y < height - 1; y++) {
  for (let x = 1; x < width - 1; x++) {
    const p = idx(x, y);
    const i = p * 4;
    if (data[i + 3] === 0) continue;
    const neighbors = [
      visited[idx(x + 1, y)],
      visited[idx(x - 1, y)],
      visited[idx(x, y + 1)],
      visited[idx(x, y - 1)],
    ];
    const transparentNeighbors = neighbors.filter(Boolean).length;
    if (transparentNeighbors >= 2 && colorDistance(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB) <= tolerance + 20) {
      data[i + 3] = 0;
    }
  }
}

await sharp(data, {
  raw: { width, height, channels: 4 },
})
  .png()
  .toFile(output);

console.log(`Created ${output} (${width}x${height}) bg=(${bgR},${bgG},${bgB})`);
