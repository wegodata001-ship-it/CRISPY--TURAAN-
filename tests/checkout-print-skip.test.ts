import { describe, expect, it } from "vitest";
import { interpretCheckoutApiPayload } from "@/lib/orders/checkout-client-result";
import { shouldRotateCheckoutRequestId } from "@/lib/phone-otp/checkout-client";

describe("checkout when auto-print is intentionally disabled", () => {
  it("treats ok + printSkipped as success (staging/local mock)", () => {
    expect(
      interpretCheckoutApiPayload(true, {
        ok: true,
        orderId: "ord-skip-1",
        orderNumber: "MC-SKIP",
        printQueued: false,
        printSkipped: true,
      })
    ).toEqual({
      success: true,
      data: { id: "ord-skip-1", orderNumber: "MC-SKIP" },
      printQueued: false,
      printSkipped: true,
    });
  });

  it("still fails when print was required but not queued (real kitchen miss)", () => {
    expect(
      interpretCheckoutApiPayload(false, {
        ok: false,
        code: "PRINT_NOT_QUEUED",
        message: "تم حفظ الطلب، لكن قائمة الطباعة لم تؤكد الاستلام. أعد المحاولة ولن يُنشأ طلب آخر.",
        orderId: "ord-fail-1",
        orderNumber: "MC-FAIL",
      })
    ).toMatchObject({
      success: false,
      code: "PRINT_NOT_QUEUED",
    });
  });

  it("does not rotate requestId on PRINT_NOT_QUEUED (no duplicate order)", () => {
    expect(shouldRotateCheckoutRequestId("PRINT_NOT_QUEUED")).toBe(false);
  });
});
