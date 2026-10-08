import { describe, expect, it } from "vitest";
import {
  ACTIVE_ORDER_STATUSES,
  ORDER_STATUSES,
  countOrdersByStatus,
  isActiveOrder,
  nextOrderStatus,
  normalizeOrderStatus,
} from "@/lib/orders/operations";

describe("order status source of truth", () => {
  it("exposes exactly five statuses and no confirmed", () => {
    expect(ORDER_STATUSES).toEqual([
      "received",
      "preparing",
      "ready",
      "delivered",
      "cancelled",
    ]);
    expect(ORDER_STATUSES).not.toContain("confirmed");
    expect(ORDER_STATUSES).not.toContain("pending");
  });

  it("maps legacy pending and confirmed on read", () => {
    expect(normalizeOrderStatus("pending")).toBe("received");
    expect(normalizeOrderStatus("confirmed")).toBe("preparing");
    expect(normalizeOrderStatus("received")).toBe("received");
    expect(normalizeOrderStatus("unknown")).toBe("received");
  });

  it("advances received → preparing → ready → delivered", () => {
    expect(nextOrderStatus("received")).toBe("preparing");
    expect(nextOrderStatus("preparing")).toBe("ready");
    expect(nextOrderStatus("ready")).toBe("delivered");
    expect(nextOrderStatus("delivered")).toBeNull();
    expect(nextOrderStatus("cancelled")).toBeNull();
    expect(nextOrderStatus("pending" as never)).toBe("preparing");
    expect(nextOrderStatus("confirmed" as never)).toBe("ready");
  });

  it("treats kitchen-active statuses as received/preparing/ready", () => {
    expect(ACTIVE_ORDER_STATUSES).toEqual(["received", "preparing", "ready"]);
    expect(isActiveOrder({ status: "received" })).toBe(true);
    expect(isActiveOrder({ status: "delivered" })).toBe(false);
    expect(isActiveOrder({ status: "cancelled" })).toBe(false);
  });

  it("counts normalized legacy statuses together", () => {
    const orders = [
      { status: "pending" as never },
      { status: "received" },
      { status: "confirmed" as never },
      { status: "preparing" },
    ];
    expect(countOrdersByStatus(orders, "received")).toBe(2);
    expect(countOrdersByStatus(orders, "preparing")).toBe(2);
  });
});
