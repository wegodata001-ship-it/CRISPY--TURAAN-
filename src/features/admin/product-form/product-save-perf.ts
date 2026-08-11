/** Dev-only save pipeline timing (console) */
import type { ProductInput } from "@/lib/validation/schemas";

export type SavePerfMark =
  | "SAVE START"
  | "Validation"
  | "Image processing"
  | "Firestore product update"
  | "Atomic Firestore commit"
  | "Modifier links sync"
  | "Modifier links skipped"
  | "SAVE END";

export function createSavePerfTimer() {
  const t0 = performance.now();
  let last = t0;

  return {
    mark(label: SavePerfMark) {
      if (process.env.NODE_ENV !== "development") return;
      const now = performance.now();
      const stepMs = Math.round(now - last);
      const totalMs = Math.round(now - t0);
      console.info(`[ProductSave] ${label}: +${stepMs}ms (total ${totalMs}ms)`);
      last = now;
    },
  };
}

export function sameOrderedIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

export function pickChangedProductFields(
  current: ProductInput,
  initial: ProductInput | null
): Partial<ProductInput> {
  if (!initial) return current;
  const patch: Partial<ProductInput> = {};
  (Object.keys(current) as (keyof ProductInput)[]).forEach((key) => {
    if (current[key] !== initial[key]) {
      (patch as Record<keyof ProductInput, ProductInput[keyof ProductInput]>)[key] =
        current[key];
    }
  });
  return patch;
}
