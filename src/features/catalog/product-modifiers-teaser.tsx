"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import type { ModifierPreviewGroup } from "@/lib/menu/modifier-preview";

/**
 * Compact, non-interactive hint that a product has sizes/extras.
 * Full details open in the display modal / product drawer — not on the card.
 */
export function ProductModifiersTeaser({
  groups,
  className,
}: {
  groups: ModifierPreviewGroup[];
  className?: string;
}) {
  const t = useT();
  const { dir } = useLocale();

  if (!groups.length) return null;

  const optionCount = groups.reduce((sum, group) => sum + group.options.length, 0);
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <p
      className={cn(
        "mt-1.5 flex min-w-0 items-center gap-1 text-[12px] font-medium leading-snug text-turquoise",
        className
      )}
    >
      <span className="truncate">
        {t("catalog.sizesAndExtras", "גדלים ותוספות")}
        {optionCount > 0 ? (
          <span className="font-normal text-coffee/45 dark:text-warm-white/45">
            {" · "}
            {t("catalog.optionsCount", "{n} אפשרויות").replace(
              "{n}",
              String(optionCount)
            )}
          </span>
        ) : null}
      </span>
      <Chevron className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
    </p>
  );
}
