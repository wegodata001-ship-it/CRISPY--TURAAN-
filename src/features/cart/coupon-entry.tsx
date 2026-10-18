"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { useCart } from "@/features/cart/cart-context";
import { couponReceiptLine } from "@/lib/coupons/engine";

export function CouponEntry() {
  const t = useT();
  const { locale } = useLocale();
  const { coupon, discount, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const activeLocale = locale === "he" || locale === "en" ? locale : "ar";

  const submit = async () => {
    setLoading(true);
    setError("");
    const result = await applyCoupon(code, activeLocale);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCode("");
  };

  if (coupon) {
    return (
      <div className="rounded-xl border border-[#2E9B55]/30 bg-[#2E9B55]/10 px-3 py-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-[#171717]">
            {couponReceiptLine({
              locale: activeLocale,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              discountAmount: discount,
            })}
          </p>
          <button type="button" onClick={removeCoupon} className="text-xs font-semibold text-[#A90F16]">
            {t("cart.couponRemove")}
          </button>
        </div>
        <p className="mt-1 text-xs text-[#70665D]" dir="ltr">{coupon.code}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold text-[#171717]">{t("cart.couponPrompt")}</p>
      <div className="mt-2 flex gap-2">
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="CRISPY7-01"
          className="h-11 uppercase"
          dir="ltr"
        />
        <Button type="button" variant="outline" className="h-11 shrink-0 rounded-xl" onClick={submit} disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("cart.couponApply")}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-[#A90F16]">{error}</p> : null}
    </div>
  );
}
