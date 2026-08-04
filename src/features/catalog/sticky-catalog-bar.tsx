"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CategoryScroll } from "@/features/catalog/category-scroll";

interface StickyCatalogBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategorySelect: (id: string) => void;
}

export function StickyCatalogBar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategorySelect,
}: StickyCatalogBarProps) {
  return (
    <div
      id="search"
      className="sticky top-[52px] z-30 border-b border-beige-dark/15 bg-cream/95 backdrop-blur-md md:top-[60px]"
    >
      <div className="px-4 py-2 md:px-6">
        <div className="relative md:hidden">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-coffee/40" />
          <Input
            placeholder="חיפוש בתפריט..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 border-beige-dark/30 bg-warm-white pl-9"
            dir="rtl"
          />
        </div>
      </div>
      <CategoryScroll selected={selectedCategory} onSelect={onCategorySelect} />
    </div>
  );
}
