export const ESC = 0x1b;
export const GS = 0x1d;

export function escInit(): Buffer {
  return Buffer.from([ESC, 0x40]);
}

export function escAlign(mode: "left" | "center" | "right"): Buffer {
  const n = mode === "center" ? 1 : mode === "right" ? 2 : 0;
  return Buffer.from([ESC, 0x61, n]);
}

export function escFeedLines(lines: number): Buffer {
  const n = Math.max(0, Math.min(255, Math.floor(lines)));
  return Buffer.from([ESC, 0x64, n]);
}

export function escCut(mode: "full" | "partial" = "full"): Buffer {
  return Buffer.from([GS, 0x56, mode === "partial" ? 1 : 0]);
}

export function escBeep(count = 2, duration = 2): Buffer {
  const n = Math.max(1, Math.min(9, Math.floor(count)));
  const t = Math.max(1, Math.min(9, Math.floor(duration)));
  return Buffer.from([ESC, 0x42, n, t]);
}

export function concatBuffers(...parts: Buffer[]): Buffer {
  return Buffer.concat(parts);
}
