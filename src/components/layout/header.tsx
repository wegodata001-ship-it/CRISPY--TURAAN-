"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingBag, User } from "lucide-react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useCart } from "@/features/cart/cart-context";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Header({ searchQuery, onSearchChange }: HeaderProps) {
  const { itemCount, openCart } = useCart();
  const t = useT();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <motion.header
      role="banner"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "sticky top-0 z-40 border-b transition-all duration-300",
        scrolled
          ? "border-beige-dark/25 bg-warm-white/85 shadow-elevated backdrop-blur-xl"
          : "border-beige-dark/15 bg-cream/80 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 md:gap-5 md:px-6 md:py-3">
        <Logo size="sm" href="/" priority className="md:hidden" />
        <Logo size="md" href="/" showText showTagline priority className="hidden md:flex" />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {[
            { href: "/", label: t("nav.home") },
            { href: "/catalog", label: t("nav.catalog") },
            { href: "/#offers", label: t("footer.offers") },
            { href: "/orders", label: t("nav.orders") },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-coffee/70 transition-colors hover:bg-beige/50 hover:text-dark-brown"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="relative mx-auto flex-1 max-w-xl">
          <Search
            className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee/40"
            strokeWidth={1.75}
          />
          <Input
            placeholder={t("header.search")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={t("header.search")}
            className="h-10 border-beige-dark/30 bg-warm-white/70 ps-10 shadow-soft md:h-11"
          />
        </div>

        <LanguageSwitcher compact className="hidden sm:flex" />

        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative"
            onClick={openCart}
            aria-label={t("cart.openCart")}
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
            {itemCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                aria-live="polite"
                className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-turquoise px-1 text-[10px] font-bold text-warm-white"
              >
                {itemCount}
              </motion.span>
            )}
          </Button>

          <Link href="/account" aria-label={t("nav.account")}>
            <Button variant="ghost" size="icon-sm">
              <User className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
