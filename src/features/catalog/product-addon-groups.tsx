"use client";

import type { MutableRefObject } from "react";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { formatPrice, cn } from "@/lib/utils";
import type { ProductBuilderConfig, ProductBuilderGroup, SelectionState } from "@/types/modifiers";

function localizedName(
  item: { name_he: string; name_ar: string; name_en: string },
  locale: string
) {
  if (locale === "he") return item.name_he || item.name_ar || item.name_en;
  if (locale === "ar") return item.name_ar || item.name_he || item.name_en;
  return item.name_en || item.name_he || item.name_ar;
}

function isSingleChoice(group: ProductBuilderGroup) {
  return group.selectionType === "single" || group.group.maxSelections <= 1;
}

export function ProductAddonGroups({
  config,
  state,
  onChange,
  errors = [],
  groupRefs,
}: {
  config: ProductBuilderConfig;
  state: SelectionState;
  onChange: (groupId: string, entries: { optionId: string; quantity: number }[]) => void;
  errors?: string[];
  groupRefs?: MutableRefObject<Record<string, HTMLElement | null>>;
}) {
  const t = useT();
  const { locale } = useLocale();
  const groups = config.groups.filter(
    (group) => !group.hidden && group.options.some((option) => !option.hidden && option.inStock)
  );

  if (groups.length === 0) return null;

  return (
    <div className="mt-5 space-y-5">
      {groups.map((group) => (
        <AddonGroupSection
          key={group.group.id}
          group={group}
          state={state}
          locale={locale}
          invalid={errors.some((error) => error.includes(group.group.id))}
          onChange={onChange}
          groupRefs={groupRefs}
          chooseOne={t("builder.chooseOne")}
          chooseUpTo={t("builder.chooseUpTo")}
          selectedOf={t("builder.selectedOf")}
          requiredLabel={t("builder.required")}
          pleaseSelect={t("builder.pleaseSelect")}
        />
      ))}
    </div>
  );
}

function AddonGroupSection({
  group,
  state,
  locale,
  invalid,
  onChange,
  groupRefs,
  chooseOne,
  chooseUpTo,
  selectedOf,
  requiredLabel,
  pleaseSelect,
}: {
  group: ProductBuilderGroup;
  state: SelectionState;
  locale: string;
  invalid: boolean;
  onChange: (groupId: string, entries: { optionId: string; quantity: number }[]) => void;
  groupRefs?: MutableRefObject<Record<string, HTMLElement | null>>;
  chooseOne: string;
  chooseUpTo: string;
  selectedOf: string;
  requiredLabel: string;
  pleaseSelect: string;
}) {
  const name = localizedName(group.group, locale);
  const selected = state[group.group.id] ?? [];
  const options = group.options.filter((option) => !option.hidden && option.inStock);
  const single = isSingleChoice(group);
  const maxSel = group.group.maxSelections;
  const totalQty = selected.reduce((sum, entry) => sum + entry.quantity, 0);
  const atMax = !single && maxSel > 0 && totalQty >= maxSel;
  const required = group.requirement === "required" || group.group.minSelections > 0;

  const hint = single
    ? chooseOne
    : maxSel > 1
      ? chooseUpTo.replace("{max}", String(maxSel))
      : chooseOne;

  const toggle = (optionId: string) => {
    const existing = selected.find((entry) => entry.optionId === optionId);
    if (single) {
      onChange(group.group.id, [{ optionId, quantity: 1 }]);
      return;
    }
    if (existing) {
      onChange(
        group.group.id,
        selected.filter((entry) => entry.optionId !== optionId)
      );
      return;
    }
    if (atMax) return;
    onChange(group.group.id, [...selected, { optionId, quantity: 1 }]);
  };

  return (
    <section
      ref={(node) => {
        if (groupRefs) groupRefs.current[group.group.id] = node;
      }}
      data-testid="product-addon-group"
      data-group-id={group.group.id}
      className={cn(
        "rounded-2xl border px-3 py-3",
        invalid ? "border-red-300 bg-red-50/60" : "border-beige-dark/15 bg-beige/10"
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-bold text-dark-brown">{name}</h3>
          <p className="mt-0.5 text-xs text-coffee/55">
            {required ? `${requiredLabel} • ` : ""}
            {hint}
          </p>
        </div>
        {!single && maxSel > 1 && (
          <p className={cn("text-xs font-semibold tabular-nums", atMax ? "text-turquoise" : "text-coffee/45")} dir="ltr">
            {selectedOf.replace("{n}", String(totalQty)).replace("{max}", String(maxSel))}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selected.some((entry) => entry.optionId === option.id && entry.quantity > 0);
          const disabled = atMax && !isSelected;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => toggle(option.id)}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors",
                isSelected
                  ? "border-turquoise bg-turquoise/10"
                  : "border-beige-dark/15 bg-warm-white hover:border-turquoise/40",
                disabled && "cursor-not-allowed opacity-40"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center border",
                  single ? "rounded-full" : "rounded-[5px]",
                  isSelected ? "border-turquoise bg-turquoise" : "border-beige-dark/40"
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1 font-medium text-dark-brown">
                {localizedName(option, locale)}
              </span>
              {option.effectivePriceDelta > 0 && (
                <span className="shrink-0 text-sm font-semibold tabular-nums text-turquoise" dir="ltr">
                  +{formatPrice(option.effectivePriceDelta)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {invalid && (
        <p className="mt-2 text-sm font-medium text-red-600">
          {pleaseSelect.replace("{name}", name)}
        </p>
      )}
    </section>
  );
}
