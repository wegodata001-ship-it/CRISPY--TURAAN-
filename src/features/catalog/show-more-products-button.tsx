"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useT } from "@/components/providers/locale-provider";
import {
  catalogRemainingCount,
  formatCatalogShowMoreLabel,
} from "@/lib/catalog/preview";
import { cn } from "@/lib/utils";

interface ShowMoreProductsButtonProps {
  totalCount: number;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function ShowMoreProductsButton({
  totalCount,
  expanded,
  onToggle,
  className,
}: ShowMoreProductsButtonProps) {
  const t = useT();
  const remaining = catalogRemainingCount(totalCount);
  const label = expanded
    ? t("catalog.showLess", "הצג פחות")
    : formatCatalogShowMoreLabel(remaining, t);
  const Icon = expanded ? ChevronUp : ChevronDown;

  return (
    <div className={cn("mt-4 flex justify-center px-4", className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "inline-flex w-full max-w-sm items-center justify-center gap-2",
          "rounded-xl border border-beige-dark/25 bg-warm-white px-4 py-2.5",
          "text-sm font-medium text-coffee shadow-soft",
          "transition-all hover:border-turquoise/40 hover:text-turquoise",
          "active:scale-[0.98]"
        )}
      >
        <span>{label}</span>
        <Icon className="h-4 w-4 shrink-0 opacity-70" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
