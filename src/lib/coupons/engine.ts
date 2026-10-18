export type CouponDiscountType = "percent" | "fixed";

export type CouponErrorCode =
  | "INVALID"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "USED_UP"
  | "MIN_AMOUNT"
  | "ALREADY_USED_BY_CUSTOMER";

export type CouponSnapshot = {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxRedemptions: number | null;
  usedCount: number;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  minOrderAmount: number | null;
  onePerCustomer: boolean;
};

export type CouponQuote = {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  subtotal: number;
  discountAmount: number;
  total: number;
};

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function quoteDiscount(
  subtotal: number,
  discountType: CouponDiscountType,
  discountValue: number
): { discountAmount: number; total: number } {
  const base = roundMoney(Math.max(0, subtotal));
  const raw =
    discountType === "percent" ? base * (discountValue / 100) : discountValue;
  const discountAmount = roundMoney(Math.min(Math.max(raw, 0), base));
  return { discountAmount, total: roundMoney(base - discountAmount) };
}

export function evaluateCoupon(input: {
  coupon: CouponSnapshot | null;
  subtotal: number;
  now: Date;
  alreadyUsedByCustomer?: boolean;
}): { ok: true; quote: CouponQuote } | { ok: false; code: CouponErrorCode } {
  const coupon = input.coupon;
  if (!coupon) return { ok: false, code: "INVALID" };
  if (!coupon.active) return { ok: false, code: "INACTIVE" };
  if (coupon.startsAt && input.now.getTime() < new Date(coupon.startsAt).getTime()) {
    return { ok: false, code: "NOT_STARTED" };
  }
  if (coupon.expiresAt && input.now.getTime() > new Date(coupon.expiresAt).getTime()) {
    return { ok: false, code: "EXPIRED" };
  }
  if (coupon.maxRedemptions != null && coupon.usedCount >= coupon.maxRedemptions) {
    return { ok: false, code: "USED_UP" };
  }
  if (coupon.minOrderAmount != null && input.subtotal < coupon.minOrderAmount) {
    return { ok: false, code: "MIN_AMOUNT" };
  }
  if (coupon.onePerCustomer && input.alreadyUsedByCustomer) {
    return { ok: false, code: "ALREADY_USED_BY_CUSTOMER" };
  }
  const priced = quoteDiscount(input.subtotal, coupon.discountType, coupon.discountValue);
  return {
    ok: true,
    quote: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      subtotal: roundMoney(input.subtotal),
      ...priced,
    },
  };
}

export function couponStatus(
  coupon: CouponSnapshot,
  now: Date
): "active" | "inactive" | "scheduled" | "used" | "expired" {
  if (!coupon.active) return "inactive";
  if (coupon.expiresAt && now.getTime() > new Date(coupon.expiresAt).getTime()) return "expired";
  if (coupon.maxRedemptions != null && coupon.usedCount >= coupon.maxRedemptions) return "used";
  if (coupon.startsAt && now.getTime() < new Date(coupon.startsAt).getTime()) return "scheduled";
  return "active";
}

export function remainingRedemptions(coupon: CouponSnapshot): number | null {
  if (coupon.maxRedemptions == null) return null;
  return Math.max(0, coupon.maxRedemptions - coupon.usedCount);
}

export const STARTER_COUPON_CODES = Array.from({ length: 10 }, (_, index) => {
  const n = String(index + 1).padStart(2, "0");
  return `CRISPY7-${n}`;
});

export function starterCouponDraft(code: string, nowIso: string) {
  return {
    code,
    campaignName: "CRISPY 7%",
    discountType: "percent" as const,
    discountValue: 7,
    maxRedemptions: 1,
    usedCount: 0,
    active: true,
    startsAt: nowIso,
    expiresAt: null,
    minOrderAmount: null,
    onePerCustomer: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function missingStarterCodes(existingCodes: string[]): string[] {
  const have = new Set(existingCodes.map(normalizeCouponCode));
  return STARTER_COUPON_CODES.filter((code) => !have.has(code));
}

export function customerCouponKey(phone: string | undefined, customerId: string | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits) return `phone:${digits}`;
  const id = (customerId ?? "").trim();
  return id ? `customer:${id}` : "anonymous";
}

export function itemsSubtotal(items: Array<{ price: number; quantity: number }>): number {
  return roundMoney(
    items.reduce((sum, item) => sum + roundMoney(item.price) * Math.max(0, item.quantity), 0)
  );
}

export function couponReceiptLine(input: {
  locale: "ar" | "he" | "en";
  discountType: CouponDiscountType;
  discountValue: number;
  discountAmount: number;
}): string {
  const amount = `-₪${input.discountAmount.toFixed(2)}`;
  const value =
    input.discountType === "percent" ? `${input.discountValue}%` : `₪${input.discountValue.toFixed(2)}`;
  if (input.locale === "he") return `הנחת קופון (${value}): ${amount}`;
  if (input.locale === "en") return `Coupon discount (${value}): ${amount}`;
  return `خصم الكوبون (${value}): ${amount}`;
}

export const COUPON_ERROR_TEXT: Record<CouponErrorCode, { ar: string; he: string; en: string }> = {
  INVALID: {
    ar: "الكوبون غير صالح",
    he: "הקופון לא תקין",
    en: "This coupon is not valid",
  },
  INACTIVE: {
    ar: "هذا الكوبون غير مفعّل",
    he: "הקופון לא פעיל",
    en: "This coupon is inactive",
  },
  NOT_STARTED: {
    ar: "الكوبون غير ساري بعد",
    he: "הקופון עדיין לא בתוקף",
    en: "This coupon is not active yet",
  },
  EXPIRED: {
    ar: "انتهت صلاحية الكوبون",
    he: "פג תוקף הקופון",
    en: "This coupon has expired",
  },
  USED_UP: {
    ar: "تم استخدام هذا الكوبون بالكامل",
    he: "הקופון נוצל במלואו",
    en: "This coupon has already been used",
  },
  MIN_AMOUNT: {
    ar: "مبلغ الطلب أقل من الحد الأدنى للكوبون",
    he: "סכום ההזמנה נמוך מהמינימום לקופון",
    en: "The order is below this coupon's minimum",
  },
  ALREADY_USED_BY_CUSTOMER: {
    ar: "لقد استخدمت هذا الكوبون من قبل",
    he: "כבר השתמשת בקופון הזה",
    en: "You have already used this coupon",
  },
};
