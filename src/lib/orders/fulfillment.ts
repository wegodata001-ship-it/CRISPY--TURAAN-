/**
 * Business policy: the café does not offer delivery.
 * New orders are always pickup. Legacy `delivery` orders remain readable.
 */

export const NEW_ORDER_FULFILLMENT = "pickup" as const;

export type OrderFulfillmentType = "pickup" | "delivery";

/** Normalize fulfillment fields for newly created orders only. */
export function forcePickupForNewOrder<
  T extends {
    orderType?: OrderFulfillmentType;
    delivery?: number;
    deliveryAddress?: string;
    subtotal: number;
    discount?: number;
    total: number;
  },
>(input: T): T & {
  orderType: typeof NEW_ORDER_FULFILLMENT;
  delivery: 0;
  deliveryAddress: undefined;
} {
  const discount = input.discount ?? 0;
  const total = Math.max(input.subtotal - discount, 0.01);

  return {
    ...input,
    orderType: NEW_ORDER_FULFILLMENT,
    delivery: 0,
    deliveryAddress: undefined,
    total,
  };
}
