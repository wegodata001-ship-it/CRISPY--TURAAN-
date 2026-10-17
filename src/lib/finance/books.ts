/**
 * Sales, revenue, and customer-spend totals ignore orders created before this
 * instant. Menu prices and the orders themselves stay unchanged.
 * 16 Oct 2026, 11:36 Asia/Jerusalem.
 */
export const FINANCE_COUNT_FROM_ISO = "2026-10-16T08:36:00.000Z";

const FINANCE_COUNT_FROM_MS = Date.parse(FINANCE_COUNT_FROM_ISO);

export function countsTowardFinance(createdAt: string | undefined | null): boolean {
  if (!createdAt) return false;
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return false;
  return time >= FINANCE_COUNT_FROM_MS;
}

export function financeTotal(orders: Array<{ createdAt?: string | null; total?: number | null }>): number {
  return orders.reduce((sum, order) => {
    if (!countsTowardFinance(order.createdAt)) return sum;
    const total = order.total;
    return sum + (typeof total === "number" && Number.isFinite(total) ? total : 0);
  }, 0);
}
