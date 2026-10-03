"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/header";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/cart-context";
import { useT } from "@/components/providers/locale-provider";

export default function CartPage() {
  const { openCart, itemCount } = useCart();
  const t = useT();

  useEffect(() => {
    openCart();
  }, [openCart]);

  return (
    <>
      <SiteHeader />
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
        <AppLogo size="lg" href="/" className="h-16 w-auto" />
        <h1 className="mt-6 font-display text-2xl font-bold text-dark-brown">
          {t("cart.title")}
        </h1>
        <p className="mt-2 text-sm text-coffee-light">
          {itemCount > 0 ? t("cart.checkout") : t("cart.emptyHint")}
        </p>
        <Button asChild variant="turquoise" size="lg" className="mt-6 h-12 rounded-full px-8">
          <Link href="/">{t("cart.continueShopping")}</Link>
        </Button>
      </div>
    </>
  );
}
