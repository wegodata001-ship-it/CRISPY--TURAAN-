"use client";

import { useT } from "@/components/providers/locale-provider";
import { formatPrice, cn } from "@/lib/utils";
import {
  formatSelectionHint,
  getVisiblePreviewOptions,
  type ModifierPreviewGroup,
} from "@/lib/menu/modifier-preview";

function OptionLabel({
  name,
  priceDelta,
}: {
  name: string;
  priceDelta: number;
}) {
  return (
    <span className="inline-flex max-w-full items-baseline gap-0.5 truncate rounded-md bg-beige/55 px-1.5 py-0.5 text-[10px] leading-tight text-coffee/70 dark:bg-white/5 dark:text-warm-white/65">
      <span className="truncate">{name}</span>
      {priceDelta > 0 ? (
        <span className="shrink-0 font-medium text-turquoise/90">
          +{formatPrice(priceDelta)}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Compact, non-interactive modifier preview for product cards.
 * Clicks bubble to the card (opens product) — no selection UI.
 */
export function ProductModifierPreview({
  groups,
  className,
}: {
  groups: ModifierPreviewGroup[];
  className?: string;
}) {
  const t = useT();

  if (!groups.length) return null;

  return (
    <div
      className={cn("mt-1.5 space-y-1.5 pointer-events-none select-none", className)}
    >
      {groups.map((group) => {
        const { visible, hiddenCount } = getVisiblePreviewOptions(group.options);
        const hint = formatSelectionHint(group, {
          chooseOne: t("catalog.chooseOne", "בחירה אחת"),
          chooseExact: (n) =>
            t("catalog.chooseExact", "בחירת {n}").replace("{n}", String(n)),
          chooseUpTo: (n) =>
            t("catalog.chooseUpTo", "בחירה עד {n}").replace("{n}", String(n)),
        });

        return (
          <div key={group.groupId} className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="text-[10px] font-semibold tracking-wide text-coffee/45 dark:text-warm-white/40">
                {group.groupName}
              </span>
              {hint ? (
                <span className="text-[10px] text-coffee/40 dark:text-warm-white/35">
                  · {hint}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {visible.map((option) => (
                <OptionLabel
                  key={option.id}
                  name={option.name}
                  priceDelta={option.priceDelta}
                />
              ))}
              {hiddenCount > 0 ? (
                <span className="inline-flex items-center rounded-md bg-beige/40 px-1.5 py-0.5 text-[10px] font-medium text-coffee/55 dark:bg-white/5 dark:text-warm-white/50">
                  {t("catalog.moreOptions", "+{n} אפשרויות").replace(
                    "{n}",
                    String(hiddenCount)
                  )}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
