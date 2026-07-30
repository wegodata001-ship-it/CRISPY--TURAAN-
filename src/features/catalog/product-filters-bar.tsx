"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductFilters } from "@/types";

interface ProductFiltersBarProps {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export function ProductFiltersBar({
  filters,
  onFiltersChange,
  showFilters,
  onToggleFilters,
}: ProductFiltersBarProps) {
  const activeFilterCount = [
    filters.isPopular,
    filters.isNew,
    filters.available === true,
    filters.minPrice,
    filters.maxPrice,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      isPopular: undefined,
      isNew: undefined,
      available: undefined,
      minPrice: undefined,
      maxPrice: undefined,
    });
  };

  return (
    <div className="px-4 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={onToggleFilters}
            className="shrink-0"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-turquoise text-[10px] text-warm-white">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Select
            value={filters.sortBy || "newest"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                sortBy: value as ProductFilters["sortBy"],
              })
            }
          >
            <SelectTrigger className="h-8 w-[130px] shrink-0 rounded-lg border-beige-dark/40 bg-warm-white/80 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price-asc">Price: Low</SelectItem>
              <SelectItem value="price-desc">Price: High</SelectItem>
              <SelectItem value="name-asc">A-Z</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-warm-white/60 p-3 border border-beige-dark/20">
          <FilterToggle
            label="Popular"
            active={!!filters.isPopular}
            onClick={() =>
              onFiltersChange({
                ...filters,
                isPopular: filters.isPopular ? undefined : true,
              })
            }
          />
          <FilterToggle
            label="New"
            active={!!filters.isNew}
            onClick={() =>
              onFiltersChange({
                ...filters,
                isNew: filters.isNew ? undefined : true,
              })
            }
          />
          <FilterToggle
            label="Available"
            active={filters.available === true}
            onClick={() =>
              onFiltersChange({
                ...filters,
                available: filters.available ? undefined : true,
              })
            }
          />
          <FilterToggle
            label="Under 25₪"
            active={filters.maxPrice === 25}
            onClick={() =>
              onFiltersChange({
                ...filters,
                maxPrice: filters.maxPrice === 25 ? undefined : 25,
              })
            }
          />
          <FilterToggle
            label="25-40₪"
            active={filters.minPrice === 25 && filters.maxPrice === 40}
            onClick={() =>
              onFiltersChange({
                ...filters,
                minPrice:
                  filters.minPrice === 25 && filters.maxPrice === 40
                    ? undefined
                    : 25,
                maxPrice:
                  filters.minPrice === 25 && filters.maxPrice === 40
                    ? undefined
                    : 40,
              })
            }
          />
          <FilterToggle
            label="40₪+"
            active={filters.minPrice === 40 && !filters.maxPrice}
            onClick={() =>
              onFiltersChange({
                ...filters,
                minPrice:
                  filters.minPrice === 40 && !filters.maxPrice
                    ? undefined
                    : 40,
                maxPrice: undefined,
              })
            }
          />
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-coffee/60"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "bg-turquoise text-warm-white"
          : "bg-beige/60 text-coffee hover:bg-beige"
      )}
    >
      {label}
    </button>
  );
}
