import { describe, expect, it } from "vitest";
import { guardCardCheckoutResult } from "@/lib/orders/checkout-payment-guard";

describe("guardCardCheckoutResult", () => {
  it("allows cash success without paymentUrl", () => {
    const result = guardCardCheckoutResult({
      paymentMethod: "cash",
      result: {
        success: true,
        data: { id: "o1", orderNumber: "MC-1" },
        printQueued: false,
        printSkipped: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it("allows card success only with paymentUrl (Hyp / staging mock)", () => {
    expect(
      guardCardCheckoutResult({
        paymentMethod: "card",
        result: {
          success: true,
          data: { id: "o2", orderNumber: "MC-2" },
          paymentUrl: "http://localhost:3000/checkout/hyp-mock?Order=x",
          printQueued: false,
          awaitingPayment: true,
        },
      }).success
    ).toBe(true);
  });

  it("blocks card from cash-style success screen without paymentUrl", () => {
    const result = guardCardCheckoutResult({
      paymentMethod: "card",
      result: {
        success: true,
        data: { id: "o3", orderNumber: "MC-3" },
        printQueued: true,
      },
      locale: "ar",
    });
    expect(result).toMatchObject({
      success: false,
      code: "HYP_PAYMENT_LINK_FAILED",
    });
  });
});
