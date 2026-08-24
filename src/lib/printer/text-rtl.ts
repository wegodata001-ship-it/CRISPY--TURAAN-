import bidiFactory from "bidi-js";
import { ArabicShaper } from "arabic-persian-reshaper";

const bidi = bidiFactory();

/**
 * Convert logical Unicode to visual order for LTR ESC/POS byte printing.
 * Uses the Unicode Bidirectional Algorithm (via bidi-js) — not ad-hoc reversal.
 */
export function toVisualOrder(logical: string): string {
  if (!logical) return logical;
  const levels = bidi.getEmbeddingLevels(logical);
  return bidi.getReorderedString(logical, levels);
}

/**
 * Arabic: shape connected forms first, then BiDi to visual order.
 * Note: shaped presentation forms often cannot be encoded in CP864/CP1256 —
 * text-mode Arabic may still fail; raster is the reliable path.
 */
export function shapeArabicToVisual(logical: string): string {
  const shaped = ArabicShaper.convertArabic(logical);
  return toVisualOrder(shaped);
}
