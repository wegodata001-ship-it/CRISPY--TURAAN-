import type { Order, OrderStatus, PaymentStatus } from "@/types";

/** Canonical order statuses — the only values the UI may show or write. */
export const ORDER_STATUSES: OrderStatus[] = [
  "received",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "received",
  "preparing",
  "ready",
];

export const ORDER_STATUS_LABEL_KEY: Record<OrderStatus, string> = {
  received: "admin.status.received",
  preparing: "admin.status.preparing",
  ready: "admin.status.ready",
  delivered: "admin.status.delivered",
  cancelled: "admin.status.cancelled",
};

export const CUSTOMER_ORDER_STATUS_LABEL_KEY: Record<OrderStatus, string> = {
  received: "orders.status.received",
  preparing: "orders.status.preparing",
  ready: "orders.status.ready",
  delivered: "orders.status.delivered",
  cancelled: "orders.status.cancelled",
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received: "preparing",
  preparing: "ready",
  ready: "delivered",
};

/**
 * Read-time compatibility for stored values.
 * pending → received, confirmed → preparing. Unknown values stay received.
 */
export function normalizeOrderStatus(value: unknown): OrderStatus {
  if (value === "pending" || value === "received") return "received";
  if (value === "confirmed" || value === "preparing") return "preparing";
  if (value === "ready" || value === "delivered" || value === "cancelled") return value;
  return "received";
}

export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  return NEXT_STATUS[normalizeOrderStatus(status)] ?? null;
}

export function isActiveOrderStatus(status: OrderStatus): boolean {
  return ACTIVE_ORDER_STATUSES.includes(normalizeOrderStatus(status));
}

export function isActiveOrder(order: Pick<Order, "status">): boolean {
  return isActiveOrderStatus(order.status);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  const canonical = normalizeOrderStatus(status);
  return canonical === "delivered" || canonical === "cancelled";
}

export function orderStatusBadgeVariant(
  status: OrderStatus
): "pending" | "preparing" | "ready" | "delivered" | "cancelled" {
  const canonical = normalizeOrderStatus(status);
  return canonical === "received" ? "pending" : canonical;
}

export function isToday(value: string, now = new Date()): boolean {
  const date = new Date(value);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function orderAgeMinutes(order: Pick<Order, "createdAt">, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(order.createdAt).getTime()) / 60_000));
}

export function averagePreparationMinutes(orders: Order[]): number | null {
  const durations = orders.flatMap((order) => {
    if (!order.preparationStartedAt || !order.readyAt) return [];
    const duration =
      (new Date(order.readyAt).getTime() -
        new Date(order.preparationStartedAt).getTime()) /
      60_000;
    return Number.isFinite(duration) && duration >= 0 ? [duration] : [];
  });
  if (durations.length === 0) return null;
  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}

export function effectivePaymentStatus(order: Pick<Order, "paymentStatus">): PaymentStatus {
  return order.paymentStatus ?? "pending";
}

export function countOrdersByStatus(
  orders: Array<Pick<Order, "status">>,
  status: OrderStatus
): number {
  return orders.filter((order) => normalizeOrderStatus(order.status) === status).length;
}

export function orderSearchText(order: Order): string {
  return [
    order.orderNumber,
    order.customerName,
    order.customerPhone,
    order.notes,
    ...order.items.flatMap((item) => [
      item.productName,
      item.notes,
      ...(item.modifiers?.flatMap((modifier) => [
        modifier.groupName,
        modifier.optionName,
        modifier.kitchenNote,
      ]) ?? []),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}
