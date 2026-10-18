import {
  customerCouponKey,
  evaluateCoupon,
  itemsSubtotal,
  missingStarterCodes,
  normalizeCouponCode,
  starterCouponDraft,
  type CouponSnapshot,
} from "@/lib/coupons/engine";

export type MemoryCoupon = CouponSnapshot & {
  campaignName: string;
  createdAt: string;
  updatedAt: string;
};

export type MemoryRedemption = {
  id: string;
  couponId: string;
  couponCode: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  redeemedAt: string;
  status: "redeemed" | "restored";
  requestId: string;
};

export type MemoryOrder = {
  id: string;
  couponCode?: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
};

/**
 * In-memory stand-in for the Firestore transaction.
 * Calls are serialized so two concurrent redemptions cannot both succeed.
 */
export class MemoryCouponStore {
  coupons = new Map<string, MemoryCoupon>();
  redemptions: MemoryRedemption[] = [];
  orders = new Map<string, MemoryOrder>();
  requests = new Map<string, string>();
  customerUses = new Set<string>();
  private queue: Promise<unknown> = Promise.resolve();

  private run<T>(work: () => T): Promise<T> {
    const next = this.queue.then(work, work);
    this.queue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  seedStarters(nowIso: string) {
    return this.run(() => {
      const missing = missingStarterCodes([...this.coupons.keys()]);
      for (const code of missing) {
        const draft = starterCouponDraft(code, nowIso);
        this.coupons.set(code, draft);
      }
      return missing;
    });
  }

  redeem(input: {
    requestId: string;
    code: string;
    items: Array<{ price: number; quantity: number }>;
    customerName: string;
    customerPhone?: string;
    customerId?: string;
    now: Date;
    failBeforeSave?: boolean;
  }) {
    return this.run(() => {
      const existingOrderId = this.requests.get(input.requestId);
      if (existingOrderId) {
        const order = this.orders.get(existingOrderId);
        if (!order) throw new Error("ORDER_MISSING");
        return { ok: true as const, orderId: existingOrderId, replayed: true, total: order.total };
      }
      const code = normalizeCouponCode(input.code);
      const coupon = this.coupons.get(code) ?? null;
      const customerKey = customerCouponKey(input.customerPhone, input.customerId);
      const decision = evaluateCoupon({
        coupon,
        subtotal: itemsSubtotal(input.items),
        now: input.now,
        alreadyUsedByCustomer: this.customerUses.has(`${code}:${customerKey}`),
      });
      if (!decision.ok) return decision;
      if (input.failBeforeSave) {
        return { ok: false as const, code: "ORDER_FAILED" as const };
      }
      const orderId = `order-${this.orders.size + 1}`;
      const quote = decision.quote;
      this.orders.set(orderId, {
        id: orderId,
        couponCode: code,
        subtotal: quote.subtotal,
        discount: quote.discountAmount,
        total: quote.total,
        status: "received",
      });
      this.redemptions.push({
        id: `${code}_${orderId}`,
        couponId: code,
        couponCode: code,
        orderId,
        customerName: input.customerName,
        customerPhone: input.customerPhone ?? "",
        originalAmount: quote.subtotal,
        discountAmount: quote.discountAmount,
        finalAmount: quote.total,
        redeemedAt: input.now.toISOString(),
        status: "redeemed",
        requestId: input.requestId,
      });
      if (coupon) {
        coupon.usedCount += 1;
        coupon.updatedAt = input.now.toISOString();
      }
      if (coupon?.onePerCustomer) this.customerUses.add(`${code}:${customerKey}`);
      this.requests.set(input.requestId, orderId);
      return { ok: true as const, orderId, replayed: false, total: quote.total, quote };
    });
  }
}
