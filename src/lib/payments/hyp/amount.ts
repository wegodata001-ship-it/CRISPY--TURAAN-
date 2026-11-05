/**
 * Hyp Pay `Amount` uses major currency units with up to two fractional digits
 * (e.g. 47.30 ILS → "47.30"), NOT agorot/subunits.
 * @see https://developers.hyp.co.il/pay/reference/actions
 */

const AMOUNT_EPS = 0.005;

/** Canonical two-decimal string for Hyp `Amount` and storage. */
export function normalizeHypAmount(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const rounded = Math.round(amount * 100) / 100;
  if (rounded <= 0) return null;
  return rounded.toFixed(2);
}

export function hypAmountParam(amount: number): string | null {
  return normalizeHypAmount(amount);
}

export function parseHypAmount(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

export function amountsMatch(expected: number, actual: number): boolean {
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) return false;
  return Math.abs(expected - actual) < AMOUNT_EPS;
}
