/**
 * Minimal ESC/POS command builders for HS-KH80ULAI (EPSON ESC/POS).
 * Isolated from order / auto-print flows.
 */

export const ESC = 0x1b;
export const GS = 0x1d;
export const LF = 0x0a;

export function escInit(): Buffer {
  return Buffer.from([ESC, 0x40]);
}

export function escAlign(mode: "left" | "center" | "right"): Buffer {
  const n = mode === "center" ? 1 : mode === "right" ? 2 : 0;
  return Buffer.from([ESC, 0x61, n]);
}

export function escBold(on: boolean): Buffer {
  return Buffer.from([ESC, 0x45, on ? 1 : 0]);
}

/** Select character code table (ESC t n). */
export function escSelectCodePage(n: number): Buffer {
  return Buffer.from([ESC, 0x74, n & 0xff]);
}

export function escFeedLines(lines: number): Buffer {
  const n = Math.max(0, Math.min(255, Math.floor(lines)));
  return Buffer.from([ESC, 0x64, n]);
}

/** Partial/full cut — try GS V 0 first (full cut on many models). */
export function escCut(mode: "full" | "partial" = "full"): Buffer {
  return Buffer.from([GS, 0x56, mode === "partial" ? 1 : 0]);
}

/**
 * Optional buzzer. ESC B n t is common on Epson-compatible kitchen printers.
 * Unsupported firmware should ignore this — never treat beep failure as a print failure.
 */
export function escBeep(count = 2, duration = 2): Buffer {
  const n = Math.max(1, Math.min(9, Math.floor(count)));
  const t = Math.max(1, Math.min(9, Math.floor(duration)));
  return Buffer.from([ESC, 0x42, n, t]);
}

export function textLine(text: string, encoding: BufferEncoding = "ascii"): Buffer {
  return Buffer.from(`${text}\n`, encoding);
}

export function concatBuffers(...parts: Buffer[]): Buffer {
  return Buffer.concat(parts);
}
