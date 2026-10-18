import { describe, expect, it } from "vitest";
import {
  couponReceiptLine,
  evaluateCoupon,
  missingStarterCodes,
  quoteDiscount,
  STARTER_COUPON_CODES,
  starterCouponDraft,
} from "@/lib/coupons/engine";
import { MemoryCouponStore } from "@/lib/coupons/memory-store";
import { buildReceiptModelFromOrder } from "@/lib/print-jobs/receipt-model";

const now = new Date("2026-10-18T08:00:00.000Z");

describe("coupon engine", () => {
  it("creates the ten starter codes once", () => {
    expect(STARTER_COUPON_CODES).toEqual([
      "CRISPY7-01",
      "CRISPY7-02",
      "CRISPY7-03",
      "CRISPY7-04",
      "CRISPY7-05",
      "CRISPY7-06",
      "CRISPY7-07",
      "CRISPY7-08",
      "CRISPY7-09",
      "CRISPY7-10",
    ]);
    expect(missingStarterCodes(["CRISPY7-01"])).toHaveLength(9);
    expect(missingStarterCodes(STARTER_COUPON_CODES)).toEqual([]);
    const draft = starterCouponDraft("CRISPY7-01", now.toISOString());
    expect(draft.discountValue).toBe(7);
    expect(draft.maxRedemptions).toBe(1);
    expect(draft.expiresAt).toBeNull();
    expect(draft.active).toBe(true);
  });

  it("discounts 7 percent of the product total", () => {
    expect(quoteDiscount(100, "percent", 7)).toEqual({ discountAmount: 7, total: 93 });
    expect(
      couponReceiptLine({
        locale: "ar",
        discountType: "percent",
        discountValue: 7,
        discountAmount: 7,
      })
    ).toBe("خصم الكوبون (7%): -₪7.00");
  });

  it("blocks a second redemption and a failed save does not consume the code", async () => {
    const store = new MemoryCouponStore();
    await store.seedStarters(now.toISOString());
    await store.seedStarters(now.toISOString());
    expect(store.coupons.size).toBe(10);

    const failed = await store.redeem({
      requestId: "fail-1",
      code: "CRISPY7-01",
      items: [{ price: 100, quantity: 1 }],
      customerName: "أحمد",
      customerPhone: "0501111111",
      now,
      failBeforeSave: true,
    });
    expect(failed.ok).toBe(false);
    expect(store.coupons.get("CRISPY7-01")?.usedCount).toBe(0);

    const first = await store.redeem({
      requestId: "req-1",
      code: "crispy7-01",
      items: [{ price: 50, quantity: 2 }],
      customerName: "أحمد",
      customerPhone: "0501111111",
      now,
    });
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.total).toBe(93);
    expect(store.coupons.get("CRISPY7-01")?.usedCount).toBe(1);
    expect(store.redemptions[0]?.customerName).toBe("أحمد");
    expect(store.redemptions[0]?.customerPhone).toBe("0501111111");

    const replay = await store.redeem({
      requestId: "req-1",
      code: "CRISPY7-01",
      items: [{ price: 100, quantity: 1 }],
      customerName: "أحمد",
      now,
    });
    expect(replay.ok && replay.replayed).toBe(true);
    expect(store.coupons.get("CRISPY7-01")?.usedCount).toBe(1);

    const second = await store.redeem({
      requestId: "req-2",
      code: "CRISPY7-01",
      items: [{ price: 100, quantity: 1 }],
      customerName: "דוד",
      customerPhone: "0502222222",
      now,
    });
    expect(second).toMatchObject({ ok: false, code: "USED_UP" });
  });

  it("lets only one of two concurrent checkouts redeem a single-use coupon", async () => {
    const store = new MemoryCouponStore();
    await store.seedStarters(now.toISOString());
    const [a, b] = await Promise.all([
      store.redeem({
        requestId: "a",
        code: "CRISPY7-02",
        items: [{ price: 80, quantity: 1 }],
        customerName: "לקוח א",
        customerPhone: "0501",
        now,
      }),
      store.redeem({
        requestId: "b",
        code: "CRISPY7-02",
        items: [{ price: 80, quantity: 1 }],
        customerName: "לקוח ב",
        customerPhone: "0502",
        now,
      }),
    ]);
    const results = [a, b];
    expect(results.filter((result) => result.ok).length).toBe(1);
    expect(results.filter((result) => !result.ok && result.code === "USED_UP").length).toBe(1);
    expect(store.coupons.get("CRISPY7-02")?.usedCount).toBe(1);
  });

  it("rejects an expired coupon before any redemption", () => {
    const coupon = starterCouponDraft("CRISPY7-03", now.toISOString());
    const decision = evaluateCoupon({
      coupon: { ...coupon, expiresAt: "2026-10-01T00:00:00.000Z" },
      subtotal: 40,
      now,
    });
    expect(decision).toMatchObject({ ok: false, code: "EXPIRED" });
  });

  it("prints the coupon discount between the items total and the amount due", () => {
    const model = buildReceiptModelFromOrder(
      {
        orderNumber: "MC-2026-TEST",
        customerName: "أحمد",
        customerPhone: "0501111111",
        items: [],
        notes: "",
        subtotal: 100,
        discount: 7,
        total: 93,
        couponCode: "CRISPY7-01",
        couponDiscountType: "percent",
        couponDiscountValue: 7,
        paymentMethod: "cash",
        locale: "ar",
        createdAt: now.toISOString(),
        orderType: "pickup",
      },
      "ar"
    );
    expect(model.subtotal).toBe(100);
    expect(model.discount).toBe(7);
    expect(model.total).toBe(93);
    expect(model.couponLine).toBe("خصم الكوبون (7%): -₪7.00");

    const plain = buildReceiptModelFromOrder(
      {
        orderNumber: "MC-2026-PLAIN",
        customerName: "أحمد",
        items: [],
        total: 100,
        paymentMethod: "cash",
        locale: "ar",
        createdAt: now.toISOString(),
      },
      "ar"
    );
    expect(plain.couponLine).toBeUndefined();
    expect(plain.discount).toBeUndefined();
    expect(plain.total).toBe(100);
  });
});
