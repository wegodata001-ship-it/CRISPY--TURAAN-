/** Pending kitchen tickets older than this are not claimed until an admin approves them. */
export const STALE_AUTO_PRINT_MS = 18 * 60 * 60 * 1000;

/**
 * Real orders from 8 Oct 2026 that stayed PENDING while the tablet was offline.
 * They must not print automatically when the agent comes back.
 */
export const STALE_PRINT_JOB_IDS = [
  "NEW_ORDER_RX7fosRqYO1pQUI6sGIQ",
  "NEW_ORDER_yaZ7ZMAN5hj34vQKIDGq",
] as const;

export function isAutoPrintHeld(input: {
  id?: string | null;
  status?: string | null;
  adminApproved?: boolean | null;
  createdAtMs?: number | null;
  now?: number;
}): boolean {
  if (input.adminApproved === true) return false;
  if (input.status === "DISMISSED") return true;
  if (input.id && (STALE_PRINT_JOB_IDS as readonly string[]).includes(input.id)) return true;
  if (input.status !== "PENDING") return false;
  if (input.createdAtMs == null) return false;
  const now = input.now ?? Date.now();
  return now - input.createdAtMs > STALE_AUTO_PRINT_MS;
}
