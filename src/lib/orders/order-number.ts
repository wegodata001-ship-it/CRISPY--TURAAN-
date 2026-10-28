/** Existing public order numbers: MC-year plus an 8 character tail. */
export function generateOrderNumber(now = new Date(), random = Math.random): string {
  const year = now.getFullYear();
  const tail = `${now.getTime().toString(36)}${random().toString(36).slice(2, 6)}`.toUpperCase();
  return `MC-${year}-${tail.slice(-8)}`;
}
