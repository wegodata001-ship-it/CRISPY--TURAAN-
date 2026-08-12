import type { Order, OrderStatus, PaymentStatus } from "@/types";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "delivered",
};

export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  return NEXT_STATUS[status] ?? null;
}

export function isActiveOrder(order: Order): boolean {
  return ACTIVE_ORDER_STATUSES.includes(order.status);
}

export function isToday(value: string, now = new Date()): boolean {
  const date = new Date(value);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function orderAgeMinutes(order: Order, now = Date.now()): number {
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

export function effectivePaymentStatus(order: Order): PaymentStatus {
  return order.paymentStatus ?? "pending";
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
