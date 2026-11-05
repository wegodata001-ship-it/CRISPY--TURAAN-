import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type HypUiPaymentStatus = "paid" | "failed" | "cancelled" | "pending";

/**
 * Opaque browser token for /checkout/payment-result.
 * Query `status=paid` alone must never be trusted — only a server-issued token is.
 */
export function createHypResultToken(): string {
  return randomBytes(24).toString("hex");
}

export function hashHypResultToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function hypResultTokensMatch(expectedHash: string, token: string): boolean {
  const actual = hashHypResultToken(token);
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || !/^[a-f0-9]{64}$/.test(actual)) return false;
  return timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(actual, "hex"));
}

/** Coarse UI payload — never expose full order docs to unauthenticated callers. */
export type HypResultSessionView = {
  status: HypUiPaymentStatus;
  /** Optional short public reference; omit when privacy requires. */
  orderLabel?: string;
  code?: string;
};

export function publicOrderLabel(orderNumber: string | undefined | null): string | undefined {
  const n = (orderNumber || "").trim();
  if (!n) return undefined;
  // Show only last 4 chars of order number to limit leakage if token is shared.
  if (n.length <= 4) return `#${n}`;
  return `#…${n.slice(-4)}`;
}
