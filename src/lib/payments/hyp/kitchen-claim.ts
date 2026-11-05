/**
 * Durable kitchen-print claim rules (Firestore-backed; mirrored in Memory store for tests).
 * Only one claim owner may proceed; failure clears the claim for retry.
 */

export const KITCHEN_PRINT_CLAIM_STALE_MS = 2 * 60 * 1000;

export type KitchenPrintClaimState = {
  kitchenPrintReleased?: boolean;
  kitchenPrintClaimId?: string | null;
  kitchenPrintClaimedAtMs?: number | null;
  status?: string;
};

export type KitchenClaimDecision =
  | { action: "already_released" }
  | { action: "deny"; reason: "not_paid" | "claimed_by_other" }
  | { action: "claim"; claimId: string };

export function decideKitchenPrintClaim(input: {
  state: KitchenPrintClaimState | null | undefined;
  claimId: string;
  nowMs: number;
  staleMs?: number;
}): KitchenClaimDecision {
  const state = input.state;
  if (!state || state.status !== "paid") return { action: "deny", reason: "not_paid" };
  if (state.kitchenPrintReleased === true) return { action: "already_released" };

  const existing = (state.kitchenPrintClaimId || "").trim();
  const claimedAt = state.kitchenPrintClaimedAtMs || 0;
  const staleMs = input.staleMs ?? KITCHEN_PRINT_CLAIM_STALE_MS;
  if (existing && existing !== input.claimId) {
    if (claimedAt && input.nowMs - claimedAt < staleMs) {
      return { action: "deny", reason: "claimed_by_other" };
    }
  }
  return { action: "claim", claimId: input.claimId };
}

export function shouldClearKitchenPrintClaimOnFailure(input: {
  state: KitchenPrintClaimState | null | undefined;
  claimId: string;
}): boolean {
  if (!input.state || input.state.kitchenPrintReleased === true) return false;
  return (input.state.kitchenPrintClaimId || "") === input.claimId;
}
