"use client";

import { Search, ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { useHideCustomerChrome } from "@/hooks/useAdminPath";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useCart } from "@/features/cart/cart-context";
import { useT } from "@/components/providers/locale-provider";

export function SiteHeader() {
  const { itemCount, openCart } = useCart();
  const t = useT();
  const pathname = usePathname();
  const hideChrome = useHideCustomerChrome();

  if (hideChrome) return null;

  const focusSearch = () => {
    const input = document.getElementById("menu-search") as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (pathname !== "/") {
      window.location.href = "/#menu-search";
    }
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 border-b border-beige-dark/20 bg-cream/95 backdrop-blur-md"
    >
      <div className="mx-auto grid h-[72px] max-w-[1180px] grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-1 px-3 md:h-[80px] md:px-6">
        <div className="flex justify-start">
          <button
            type="button"
            onClick={focusSearch}
            aria-label={t("header.search")}
            className="flex h-11 w-11 items-center justify-center rounded-full text-dark-brown"
          >
            <Search className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex justify-center">
          <Logo size="md" href="/" priority className="h-12 w-auto md:h-14" />
        </div>

        <div className="flex items-center justify-end gap-0.5">
          <LanguageSwitcher variant="dropdown" />
          <button
            type="button"
            onClick={openCart}
            aria-label={t("cart.openCart")}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-dark-brown"
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={2} />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -end-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-turquoise px-1 text-[10px] font-bold text-warm-white">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

/** @deprecated Use SiteHeader — kept for catalog search integration */
export function Header({
  searchQuery,
  onSearchChange,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) {
  void searchQuery;
  void onSearchChange;
  return <SiteHeader />;
}
