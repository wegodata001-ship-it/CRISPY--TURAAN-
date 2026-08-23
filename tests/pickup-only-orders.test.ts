import { describe, expect, it } from "vitest";
import { forcePickupForNewOrder } from "@/lib/orders/fulfillment";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("pickup-only new orders", () => {
  it("forces pickup, zero delivery fee, and drops address", () => {
    const result = forcePickupForNewOrder({
      subtotal: 100,
      discount: 10,
      delivery: 15,
      total: 105,
      orderType: "delivery",
      deliveryAddress: "Some street 1",
    });

    expect(result.orderType).toBe("pickup");
    expect(result.delivery).toBe(0);
    expect(result.deliveryAddress).toBeUndefined();
    expect(result.total).toBe(90);
  });

  it("recalculates total from products only when no discount", () => {
    const result = forcePickupForNewOrder({
      subtotal: 30,
      delivery: 15,
      total: 45,
      orderType: "delivery",
    });
    expect(result.total).toBe(30);
    expect(result.delivery).toBe(0);
  });

  it("checkout UI no longer offers delivery choice", () => {
    const checkout = readFileSync(
      resolve(process.cwd(), "src/app/checkout/page.tsx"),
      "utf8"
    );
    expect(checkout).not.toMatch(/setOrderType/);
    expect(checkout).not.toMatch(/\["pickup", "delivery"\]/);
    expect(checkout).toMatch(/checkout\.pickupFromStore/);
  });

  it("createOrder always applies pickup-only policy", () => {
    const service = readFileSync(
      resolve(process.cwd(), "src/services/orderService.ts"),
      "utf8"
    );
    expect(service).toMatch(/forcePickupForNewOrder/);
    expect(service).toMatch(/NEW_ORDER_FULFILLMENT/);
  });
});
