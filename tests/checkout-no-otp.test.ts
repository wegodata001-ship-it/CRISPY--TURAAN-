import { describe, expect, it } from "vitest";
import { interpretCheckoutApiPayload } from "@/lib/orders/checkout-client-result";
import { parseIsraeliMobile } from "@/lib/phone/israeli-mobile";
import { resolveCheckoutSettlementModeFromEnv } from "@/lib/payments/hyp/checkout-plan";
import {
  canAdvanceKitchenWorkflow,
  canPrintKitchenTicketBrowser,
} from "@/lib/orders/kitchen-action-gate";
import { HYP_PRODUCTION_FIREBASE_PROJECT_ID } from "@/lib/payments/hyp/env-gate";

describe("checkout without OTP / phoneProof", () => {
  it("accepts Israeli mobile format without proof ids", () => {
    expect(parseIsraeliMobile("0501234567")?.local).toBe("0501234567");
    expect(parseIsraeliMobile("+972501234567")?.local).toBe("0501234567");
    expect(parseIsraeliMobile("123")).toBeNull();
  });

  it("treats cash success without phoneProof as a normal kitchen print checkout", () => {
    expect(
      interpretCheckoutApiPayload(true, {
        ok: true,
        orderId: "ord-cash-1",
        orderNumber: "MC-1",
        printQueued: true,
      })
    ).toEqual({
      success: true,
      data: { id: "ord-cash-1", orderNumber: "MC-1" },
      printQueued: true,
    });
  });

  it("treats card success with paymentUrl as Hyp redirect without phoneProof", () => {
    expect(
      interpretCheckoutApiPayload(true, {
        ok: true,
        orderId: "ord-card-1",
        orderNumber: "MC-2",
        awaitingPayment: true,
        paymentUrl: "https://pay.hyp.co.il/p/?mock=1",
        printQueued: false,
      })
    ).toEqual({
      success: true,
      data: { id: "ord-card-1", orderNumber: "MC-2" },
      paymentUrl: "https://pay.hyp.co.il/p/?mock=1",
      printQueued: false,
      awaitingPayment: true,
    });
  });

  it("does not require PHONE_NOT_VERIFIED for a valid checkout payload", () => {
    const result = interpretCheckoutApiPayload(true, {
      ok: true,
      orderId: "ord-3",
      orderNumber: "MC-3",
      printQueued: true,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result).not.toHaveProperty("code", "PHONE_NOT_VERIFIED");
  });

  it("maps INVALID_PHONE without implying OTP was required", () => {
    expect(
      interpretCheckoutApiPayload(false, {
        ok: false,
        code: "INVALID_PHONE",
        message: "أدخل رقم هاتف إسرائيلي بصيغة 05XXXXXXXX",
      })
    ).toEqual({
      success: false,
      error: "أدخل رقم هاتف إسرائيلي بصيغة 05XXXXXXXX",
      code: "INVALID_PHONE",
    });
  });
});

describe("payment protection remains after OTP removal", () => {
  const unpaidCard = {
    status: "received",
    paymentMethod: "card",
    paymentStatus: "pending",
    requiresOnlinePayment: true,
    awaitingHypPayment: true,
  };
  const paidCard = {
    ...unpaidCard,
    paymentStatus: "paid",
    awaitingHypPayment: false,
  };
  const cash = {
    status: "received",
    paymentMethod: "cash",
    paymentStatus: "pending",
  };

  it("blocks kitchen/print for unpaid online card; allows cash and paid card", () => {
    expect(canAdvanceKitchenWorkflow(unpaidCard, "preparing")).toBe(false);
    expect(canPrintKitchenTicketBrowser(unpaidCard)).toBe(false);
    expect(canAdvanceKitchenWorkflow(cash, "preparing")).toBe(true);
    expect(canPrintKitchenTicketBrowser(cash)).toBe(true);
    expect(canAdvanceKitchenWorkflow(paidCard, "preparing")).toBe(true);
    expect(canPrintKitchenTicketBrowser(paidCard)).toBe(true);
  });

  it("keeps production Hyp disarmed when payment flags are false", () => {
    const mode = resolveCheckoutSettlementModeFromEnv("card", {
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: HYP_PRODUCTION_FIREBASE_PROJECT_ID,
      FIREBASE_ADMIN_PROJECT_ID: HYP_PRODUCTION_FIREBASE_PROJECT_ID,
      HYP_PAYMENTS_ENABLED: "false",
      HYP_PAY_PRODUCTION_ENABLED: "false",
      HYP_STAGING_MOCK: "false",
      HYP_PAY_MASOF: "secret-masof",
      HYP_PAY_KEY: "secret-key",
      HYP_PAY_PASSP: "secret-passp",
      NEXT_PUBLIC_SITE_URL: "https://almostafachicken.com",
      VERCEL_ENV: "production",
    });
    expect(mode).toEqual({ kind: "legacy_print" });
  });
});
