export const ROLES = ["Admin", "Manager", "Employee"] as const;
export type UserRole = (typeof ROLES)[number];

export function isAdminRole(role: string): boolean {
  return role === "Admin";
}

export function canManageUsers(role: string): boolean {
  return role === "Admin";
}

export function canWriteCatalog(role: string): boolean {
  return role === "Admin" || role === "Manager";
}

export function canManageCosting(role: string): boolean {
  return role === "Admin";
}

/** Confirm pending Hyp redirects via VERIFY (Admin or Manager). */
export function canConfirmHypPayments(role: string): boolean {
  return role === "Admin" || role === "Manager";
}

/** Flag stale unpaid intents for review without cancelling (Admin or Manager). */
export function canFlagHypPaymentReview(role: string): boolean {
  return role === "Admin" || role === "Manager";
}

/**
 * Cancel unpaid Hyp order + restore held coupon after manual Hyp-portal review.
 * Admin-only — irreversible customer-facing side effects.
 */
export function canAbandonHypPayment(role: string): boolean {
  return role === "Admin";
}
