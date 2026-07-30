"use client";

import { Header } from "@/components/layout/header";
import { useCart } from "@/features/cart/cart-context";
import { useEffect } from "react";

export default function CartPage() {
  const { openCart } = useCart();

  useEffect(() => {
    openCart();
  }, [openCart]);

  return (
    <>
      <Header searchQuery="" onSearchChange={() => {}} />
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <p className="text-sm text-coffee/60">
          Your cart drawer should be open
        </p>
      </div>
    </>
  );
}
