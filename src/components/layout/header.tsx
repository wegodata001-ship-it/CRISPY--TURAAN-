"use client";

import Link from "next/link";
import { ShoppingBag, User } from "lucide-react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useCart } from "@/features/cart/cart-context";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", labelKey: "nav.home", exact: true },
  { href: "/catalog", labelKey: "nav.catalog" },
  { href: "/#offers", labelKey: "nav.offers" },
  { href: "/#about", labelKey: "nav.about" },
  { href: "/account", labelKey: "nav.contact" },
] as const;

export function SiteHeader() {
  const { itemCount, openCart } = useCart();
  const t = useT();
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 4));

  if (pathname.startsWith("/admin")) return null;

  return (
    <motion.header
      role="banner"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "sticky top-0 z-50 h-20 border-b bg-warm-white transition-shadow duration-300",
        scrolled ? "border-beige-dark/20 shadow-soft" : "border-beige-dark/10 shadow-none"
      )}
    >
      <div className="mx-auto flex h-full max-w-[1400px] items-center gap-4 px-4 md:px-6 lg:px-8">
        {/* Logo block — start (right in RTL) */}
        <div className="shrink-0">
          <Logo
            size="sm"
            href="/"
            showTagline
            priority
            className="flex-col !items-start gap-0.5 md:flex-row md:items-center md:gap-2.5"
          />
        </div>

        {/* Center navigation */}
        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => {
            const isActive =
              "exact" in link && link.exact
                ? pathname === link.href
                : pathname === link.href || pathname.startsWith(link.href.replace("/#", "/"));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-turquoise"
                    : "text-coffee/65 hover:bg-cream hover:text-dark-brown"
                )}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </nav>

        {/* Actions — end (left in RTL) */}
        <div className="ms-auto flex items-center gap-2 md:gap-3">
          <LanguageSwitcher compact className="hidden sm:inline-flex" />

          <Link
            href="/account"
            aria-label={t("nav.account")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-beige-dark/25 bg-cream/50 text-coffee transition-colors hover:border-turquoise/40 hover:text-turquoise"
          >
            <User className="h-4 w-4" strokeWidth={1.75} />
          </Link>

          <button
            type="button"
            onClick={openCart}
            aria-label={t("cart.openCart")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-beige-dark/25 bg-cream/50 text-coffee transition-colors hover:border-turquoise/40 hover:text-turquoise lg:hidden"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-turquoise px-1 text-[10px] font-bold text-warm-white">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </motion.header>
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
