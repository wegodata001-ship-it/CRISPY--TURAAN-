"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useT, useLocale } from "@/components/providers/locale-provider";

interface StickyCatalogBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function StickyCatalogBar({ searchQuery, onSearchChange }: StickyCatalogBarProps) {
  const t = useT();
  const { dir } = useLocale();

  return (
    <div
      id="search"
      className="sticky top-[52px] z-30 border-b border-beige-dark/15 bg-cream/95 backdrop-blur-md md:top-[60px]"
    >
      <div className="px-4 py-2 md:hidden md:px-6">
        <div className="relative">
          <Search
            className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee/40"
            strokeWidth={1.75}
          />
          <Input
            placeholder={t("header.search")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={t("header.search")}
            className="h-10 border-beige-dark/30 bg-warm-white ps-10"
            dir={dir}
          />
        </div>
      </div>
    </div>
  );
}
