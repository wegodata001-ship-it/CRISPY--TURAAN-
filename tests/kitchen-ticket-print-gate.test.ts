import { afterEach, describe, expect, it, vi } from "vitest";
import { printKitchenTicket } from "@/lib/orders/kitchen-ticket";
import type { Order } from "@/types";

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    orderNumber: "MC-1",
    customerId: "guest-checkout",
    customerName: "Test",
    status: "received",
    items: [{ productId: "p1", productName: "Item", quantity: 1, price: 20 }],
    total: 20,
    paymentMethod: "card",
    paymentStatus: "pending",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("browser kitchen ticket print gate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("refuses unpaid online-card orders without opening a print window", () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });
    const result = printKitchenTicket(
      baseOrder({ requiresOnlinePayment: true, awaitingHypPayment: true })
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("awaiting_online_payment");
    expect(open).not.toHaveBeenCalled();
  });

  it("prints after trusted paid for online-card orders", () => {
    const print = vi.fn();
    const focus = vi.fn();
    const close = vi.fn();
    const write = vi.fn();
    const open = vi.fn(() => ({
      document: { write, close },
      focus,
      print,
    }));
    vi.stubGlobal("window", { open });
    const result = printKitchenTicket(
      baseOrder({
        requiresOnlinePayment: true,
        paymentStatus: "paid",
        awaitingHypPayment: false,
      })
    );
    expect(result).toEqual({ ok: true });
    expect(open).toHaveBeenCalledOnce();
    expect(print).toHaveBeenCalledOnce();
  });

  it("still prints cash pending (legacy)", () => {
    const print = vi.fn();
    const focus = vi.fn();
    const close = vi.fn();
    const write = vi.fn();
    const open = vi.fn(() => ({
      document: { write, close },
      focus,
      print,
    }));
    vi.stubGlobal("window", { open });
    const result = printKitchenTicket(
      baseOrder({ paymentMethod: "cash", paymentStatus: "pending" })
    );
    expect(result).toEqual({ ok: true });
    expect(open).toHaveBeenCalledOnce();
  });
});
