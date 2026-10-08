"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatPrice, cn } from "@/lib/utils";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import {
  applyBusinessRules,
  buildSelectedModifiers,
  calculateUnitPrice,
  pruneInvalidSelections,
  validateSelections,
} from "@/lib/product-builder/engine";
import type { ProductBuilderConfig, SelectionState } from "@/types/modifiers";
import type { Product } from "@/types";

function localizedGroupName(
  group: { name_he: string; name_ar: string; name_en: string },
  locale: string
) {
  if (locale === "he") return group.name_he || group.name_en;
  if (locale === "ar") return group.name_ar || group.name_he;
  return group.name_en || group.name_he;
}

function ModifierGroupRenderer({
  group,
  state,
  onChange,
  locale,
}: {
  group: ProductBuilderConfig["groups"][0];
  state: SelectionState;
  onChange: (groupId: string, entries: { optionId: string; quantity: number }[]) => void;
  locale: string;
}) {
  const t = useT();
  const visibleOptions = group.options.filter((o) => !o.hidden && o.inStock);
  const selected = state[group.group.id] ?? [];
  const name = localizedGroupName(group.group, locale);

  const selectSingle = (optionId: string) => {
    onChange(group.group.id, [{ optionId, quantity: 1 }]);
  };

  const maxSelections = group.group.maxSelections;
  const totalSelected = selected.reduce((sum, s) => sum + s.quantity, 0);
  const reachedMax = maxSelections > 0 && totalSelected >= maxSelections;

  const toggleMultiple = (optionId: string) => {
    const exists = selected.find((s) => s.optionId === optionId);
    if (exists) {
      onChange(
        group.group.id,
        selected.filter((s) => s.optionId !== optionId)
      );
    } else {
      if (reachedMax) return;
      onChange(group.group.id, [...selected, { optionId, quantity: 1 }]);
    }
  };

  const adjustQty = (optionId: string, delta: number) => {
    const current = selected.find((s) => s.optionId === optionId);
    const nextQty = (current?.quantity ?? 0) + delta;
    if (nextQty <= 0) {
      onChange(
        group.group.id,
        selected.filter((s) => s.optionId !== optionId)
      );
      return;
    }
    if (delta > 0 && reachedMax) return;
    if (current) {
      onChange(
        group.group.id,
        selected.map((s) => (s.optionId === optionId ? { ...s, quantity: nextQty } : s))
      );
    } else {
      onChange(group.group.id, [...selected, { optionId, quantity: nextQty }]);
    }
  };

  if (visibleOptions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-semibold text-dark-brown">{name}</Label>
        {group.requirement === "required" && (
          <Badge variant="outline" className="text-[10px]">
            {t("builder.required")}
          </Badge>
        )}
        {group.selectionType === "single" && (
          <span className="text-xs text-coffee/50">{t("builder.chooseOne")}</span>
        )}
        {group.selectionType === "multiple" && maxSelections > 1 && (
          <span className={cn("text-xs tabular-nums", reachedMax ? "font-medium text-turquoise" : "text-coffee/50")}>
            {t("builder.chooseUpTo").replace("{max}", String(maxSelections))}
            <span className="ms-1" dir="ltr">
              ·{" "}
              {t("builder.selectedOf")
                .replace("{n}", String(totalSelected))
                .replace("{max}", String(maxSelections))}
            </span>
          </span>
        )}
      </div>

      {group.displayType === "dropdown" ? (
        <select
          className="w-full rounded-xl border border-beige-dark/30 bg-warm-white px-3 py-2 text-sm"
          value={selected[0]?.optionId ?? ""}
          onChange={(e) => selectSingle(e.target.value)}
        >
          <option value="">{t("builder.selectOption")}</option>
          {visibleOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {localizedGroupName(o, locale)}
              {o.effectivePriceDelta > 0 ? ` (+${formatPrice(o.effectivePriceDelta)})` : ""}
            </option>
          ))}
        </select>
      ) : (
        <div
          className={cn(
            "flex flex-wrap gap-2",
            group.displayType === "cards" && "grid grid-cols-2",
            group.displayType === "images" && "grid grid-cols-3"
          )}
        >
          {visibleOptions.map((option) => {
            const isSelected = selected.some((s) => s.optionId === option.id && s.quantity > 0);
            const qty = selected.find((s) => s.optionId === option.id)?.quantity ?? 0;
            const isQtyType =
              group.selectionType === "quantity" || group.selectionType === "counter";
            const isDisabled = reachedMax && !isSelected;

            return (
              <div key={option.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (isQtyType) adjustQty(option.id, 1);
                    else if (group.selectionType === "multiple") toggleMultiple(option.id);
                    else selectSingle(option.id);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-start text-sm transition-all",
                    isSelected
                      ? "border-turquoise bg-turquoise/10 text-dark-brown shadow-soft"
                      : "border-beige-dark/25 bg-warm-white/80 hover:border-turquoise/40",
                    isDisabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center border",
                      group.selectionType === "single" ? "rounded-full" : "rounded-[4px]",
                      isSelected ? "border-turquoise bg-turquoise" : "border-beige-dark/40"
                    )}
                    aria-hidden
                  />
                  {group.displayType === "images" && option.image && (
                    <div className="relative mb-1.5 aspect-square w-full overflow-hidden rounded-lg">
                      <Image src={option.image} alt="" fill className="object-cover" sizes="80px" />
                    </div>
                  )}
                  <span className="font-medium">{localizedGroupName(option, locale)}</span>
                  {option.effectivePriceDelta > 0 && (
                    <span className="ms-1 text-xs tabular-nums text-turquoise" dir="ltr">
                      +{formatPrice(option.effectivePriceDelta)}
                    </span>
                  )}
                </button>
                {isQtyType && isSelected && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustQty(option.id, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-bold">{qty}</span>
                    <button
                      type="button"
                      onClick={() => adjustQty(option.id, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProductBuilder({
  product,
  config,
  quantity,
  onQuantityChange,
  notes,
  onNotesChange,
  onUnitPriceChange,
  onValidChange,
  onSelectionsChange,
  initialState,
}: {
  product: Product;
  config: ProductBuilderConfig;
  quantity: number;
  onQuantityChange: (q: number) => void;
  notes: string;
  onNotesChange: (n: string) => void;
  onUnitPriceChange: (price: number) => void;
  onValidChange: (valid: boolean) => void;
  onSelectionsChange?: (selections: import("@/types/modifiers").SelectedModifier[]) => void;
  initialState?: SelectionState;
}) {
  const t = useT();
  const { locale } = useLocale();
  const localized = useLocalizedProduct(product);
  const [state, setState] = useState<SelectionState>(() => initialState ?? {});

  useEffect(() => {
    setState(initialState ?? {});
  }, [product.id, initialState]);

  const visibleConfig = useMemo(
    () =>
      applyBusinessRules(config, state, {
        productId: product.id,
        categoryId: product.categoryId,
      }),
    [config, product.categoryId, product.id, state]
  );

  useEffect(() => {
    const next = pruneInvalidSelections(config, state, {
      productId: product.id,
      categoryId: product.categoryId,
    });
    if (JSON.stringify(next) !== JSON.stringify(state)) setState(next);
  }, [config, product.categoryId, product.id, state]);

  const selections = useMemo(
    () =>
      buildSelectedModifiers(config, state, locale, {
        productId: product.id,
        categoryId: product.categoryId,
      }),
    [config, locale, product.categoryId, product.id, state]
  );

  const unitPrice = useMemo(
    () => calculateUnitPrice(product.price, selections),
    [product.price, selections]
  );

  const errors = useMemo(
    () =>
      validateSelections(config, state, {
        productId: product.id,
        categoryId: product.categoryId,
      }),
    [config, product.categoryId, product.id, state]
  );

  const isValid = errors.length === 0;

  useEffect(() => {
    onUnitPriceChange(unitPrice);
    onValidChange(isValid);
    onSelectionsChange?.(selections);
  }, [unitPrice, isValid, selections, onUnitPriceChange, onValidChange, onSelectionsChange]);

  const handleGroupChange = useCallback(
    (groupId: string, entries: { optionId: string; quantity: number }[]) => {
      setState((prev) => ({ ...prev, [groupId]: entries }));
    },
    []
  );

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold text-turquoise">
            {formatPrice(unitPrice)}
          </p>
          {unitPrice !== product.price && (
            <p className="text-xs text-coffee/45">
              {t("builder.basePrice")}: {formatPrice(product.price)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center font-bold">{quantity}</span>
          <button
            type="button"
            onClick={() => onQuantityChange(quantity + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {visibleConfig.groups.map((group) => (
        <ModifierGroupRenderer
          key={group.linkId}
          group={group}
          state={state}
          onChange={handleGroupChange}
          locale={locale}
        />
      ))}

      {!isValid && (
        <p className="text-xs text-amber-700">{t("builder.completeRequired")}</p>
      )}

      <div>
        <Label htmlFor="product-notes" className="text-sm">
          {t("builder.notes")}
        </Label>
        <Textarea
          id="product-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={t("builder.notesPlaceholder")}
          className="mt-1.5 min-h-[72px] rounded-xl"
        />
      </div>

      <p className="text-xs text-coffee/40" dir={localized.dir}>
        {localized.description}
      </p>
    </div>
  );
}

export function ProductBuilderPreview({
  product,
  config,
}: {
  product: Product;
  config: ProductBuilderConfig;
}) {
  const [unitPrice, setUnitPrice] = useState(product.price);
  const [valid, setValid] = useState(true);

  return (
    <div className="rounded-2xl border border-beige-dark/25 bg-beige/20 p-4">
      <ProductBuilder
        product={product}
        config={config}
        quantity={1}
        onQuantityChange={() => {}}
        notes=""
        onNotesChange={() => {}}
        onUnitPriceChange={setUnitPrice}
        onValidChange={setValid}
      />
      <p className="mt-3 text-center text-sm font-bold text-turquoise">
        Preview: {formatPrice(unitPrice)} {valid ? "✓" : "…"}
      </p>
    </div>
  );
}
