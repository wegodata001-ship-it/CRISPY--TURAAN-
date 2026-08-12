"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { formatPrice, cn } from "@/lib/utils";
import {
  applyBusinessRules,
  buildSelectedModifiers,
  calculateLineTotal,
  calculateUnitPrice,
  modifiersToSelectionState,
  pruneInvalidSelections,
  validateSelections,
} from "@/lib/product-builder/engine";
import type { Product } from "@/types";
import type {
  ProductBuilderConfig,
  ProductBuilderGroup,
  SelectedModifier,
  SelectionState,
} from "@/types/modifiers";

interface AddonsWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  config: ProductBuilderConfig;
  quantity: number;
  initialSelections?: SelectedModifier[];
  mode?: "add" | "edit";
  onConfirm: (result: {
    selections: SelectedModifier[];
    unitPrice: number;
  }) => void;
}

const EMPTY_SELECTIONS: SelectedModifier[] = [];

function localizedName(
  item: { name_he: string; name_ar: string; name_en: string },
  locale: string
) {
  if (locale === "he") return item.name_he || item.name_en;
  if (locale === "ar") return item.name_ar || item.name_he;
  return item.name_en || item.name_he;
}

function groupIsValid(group: ProductBuilderGroup, state: SelectionState) {
  const scopedConfig: ProductBuilderConfig = {
    productId: "",
    groups: [group],
    rules: [],
    suggestions: [],
  };
  return validateSelections(scopedConfig, state).length === 0;
}

function WizardProgress({
  step,
  count,
}: {
  step: number;
  count: number;
}) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all duration-200",
            index <= step
              ? "w-7 bg-turquoise"
              : "w-3 bg-beige-dark/35"
          )}
        />
      ))}
    </div>
  );
}

function GroupStep({
  group,
  state,
  onChange,
}: {
  group: ProductBuilderGroup;
  state: SelectionState;
  onChange: (
    groupId: string,
    entries: { optionId: string; quantity: number }[]
  ) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const selected = state[group.group.id] ?? [];
  const options = group.options.filter((option) => !option.hidden && option.inStock);
  const isQuantity =
    group.selectionType === "quantity" ||
    group.selectionType === "counter";

  const toggle = (optionId: string) => {
    const existing = selected.find((entry) => entry.optionId === optionId);

    if (isQuantity) {
      if (existing) {
        onChange(
          group.group.id,
          selected.map((entry) =>
            entry.optionId === optionId
              ? { ...entry, quantity: entry.quantity + 1 }
              : entry
          )
        );
      } else {
        onChange(group.group.id, [
          ...selected,
          { optionId, quantity: 1 },
        ]);
      }
      return;
    }

    if (group.selectionType === "multiple") {
      if (existing) {
        onChange(
          group.group.id,
          selected.filter((entry) => entry.optionId !== optionId)
        );
        return;
      }
      const max = Math.max(1, group.group.maxSelections);
      if (selected.length >= max) return;
      onChange(group.group.id, [
        ...selected,
        { optionId, quantity: 1 },
      ]);
      return;
    }

    onChange(group.group.id, [{ optionId, quantity: 1 }]);
  };

  const adjustQuantity = (optionId: string, delta: number) => {
    const existing = selected.find((entry) => entry.optionId === optionId);
    if (!existing) return;
    const nextQuantity = existing.quantity + delta;
    if (nextQuantity <= 0) {
      onChange(
        group.group.id,
        selected.filter((entry) => entry.optionId !== optionId)
      );
      return;
    }
    onChange(
      group.group.id,
      selected.map((entry) =>
        entry.optionId === optionId
          ? { ...entry, quantity: nextQuantity }
          : entry
      )
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-xl font-bold text-dark-brown">
          {localizedName(group.group, locale)}
        </h3>
        <p className="mt-1 text-sm text-coffee/55">
          {group.selectionType === "multiple"
            ? t("builder.multipleHint")
            : group.selectionType === "single"
              ? t("builder.singleHint")
              : t("builder.quantityHint")}
          {group.requirement === "required"
            ? ` · ${t("builder.required")}`
            : ` · ${t("builder.optional")}`}
        </p>
      </div>

      {group.requirement !== "required" && (
        <button
          type="button"
          onClick={() => onChange(group.group.id, [])}
          aria-pressed={selected.length === 0}
          className={cn(
            "flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-start text-sm transition-colors",
            selected.length === 0
              ? "border-turquoise bg-turquoise/10"
              : "border-beige-dark/25 bg-warm-white"
          )}
        >
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border",
              selected.length === 0
                ? "border-turquoise bg-turquoise text-white"
                : "border-beige-dark/40"
            )}
          >
            {selected.length === 0 && <Check className="h-3.5 w-3.5" />}
          </span>
          <span className="font-medium">{t("builder.noAddons")}</span>
        </button>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const entry = selected.find(
            (selection) => selection.optionId === option.id
          );
          const isSelected = Boolean(entry);

          return (
            <div
              key={option.id}
              className={cn(
                "relative overflow-hidden rounded-2xl border transition-all",
                isSelected
                  ? "border-turquoise bg-turquoise/10 shadow-soft"
                  : "border-beige-dark/25 bg-warm-white hover:border-turquoise/50"
              )}
            >
              <button
                type="button"
                onClick={() => toggle(option.id)}
                aria-pressed={isSelected}
                className="flex min-h-14 w-full items-center gap-3 px-3 py-3 text-start"
              >
                {option.image && (
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src={option.image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </span>
                )}
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center border",
                    group.selectionType === "single"
                      ? "rounded-full"
                      : "rounded-lg",
                    isSelected
                      ? "border-turquoise bg-turquoise text-white"
                      : "border-beige-dark/40"
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-dark-brown">
                    {localizedName(option, locale)}
                  </span>
                  {option.effectivePriceDelta > 0 && (
                    <span className="text-xs font-semibold text-turquoise">
                      +{formatPrice(option.effectivePriceDelta)}
                    </span>
                  )}
                </span>
              </button>

              {isQuantity && entry && (
                <div className="flex items-center justify-center gap-3 border-t border-beige-dark/15 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => adjustQuantity(option.id, -1)}
                    aria-label={t("cart.decreaseQuantity")}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-beige-dark/30"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold">
                    {entry.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustQuantity(option.id, 1)}
                    aria-label={t("cart.increaseQuantity")}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-beige-dark/30"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AddonsWizard({
  open,
  onOpenChange,
  product,
  config,
  quantity,
  initialSelections = EMPTY_SELECTIONS,
  mode = "add",
  onConfirm,
}: AddonsWizardProps) {
  const t = useT();
  const { locale, dir } = useLocale();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<SelectionState>(() =>
    modifiersToSelectionState(initialSelections)
  );

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setState(modifiersToSelectionState(initialSelections));
  }, [open, product.id, initialSelections]);

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
  const groups = visibleConfig.groups.filter(
    (group) =>
      !group.hidden &&
      group.options.some((option) => !option.hidden && option.inStock)
  );
  const isReview = step >= groups.length;
  const currentGroup = groups[Math.min(step, Math.max(0, groups.length - 1))];
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
  const total = calculateLineTotal(unitPrice, quantity);
  const currentValid =
    !currentGroup || isReview || groupIsValid(currentGroup, state);
  const allValid =
    validateSelections(config, state, {
      productId: product.id,
      categoryId: product.categoryId,
    }).length === 0;

  const updateGroup = (
    groupId: string,
    entries: { optionId: string; quantity: number }[]
  ) => {
    setState((previous) => ({ ...previous, [groupId]: entries }));
  };

  const goNext = () => {
    if (!currentValid) return;
    setStep((current) => Math.min(groups.length, current + 1));
  };

  const goBack = () => {
    setStep((current) => Math.max(0, current - 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        layout="custom"
        dir={dir}
        className="bottom-0 left-0 top-auto z-[1010] flex h-[88dvh] max-h-[88dvh] w-full max-w-none flex-col gap-0 rounded-b-none rounded-t-3xl border-b-0 p-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(760px,86vh)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border"
      >
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-beige-dark/40 sm:hidden" />
        <DialogHeader className="shrink-0 border-b border-beige-dark/15 px-5 pb-4 pt-4 text-start sm:px-6">
          <div className="pe-8">
            <DialogTitle className="font-display text-xl">
              {t("builder.customizeOrder")}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {localizedName(product, locale)}
            </DialogDescription>
          </div>
          {groups.length > 0 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-xs font-medium text-coffee/55">
                {isReview
                  ? t("builder.review")
                  : t("builder.stepOf")
                      .replace("{step}", String(step + 1))
                      .replace("{count}", String(groups.length))}
              </span>
              <WizardProgress
                step={Math.min(step, groups.length - 1)}
                count={groups.length}
              />
            </div>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isReview ? "review" : currentGroup?.group.id}
              initial={{ opacity: 0, x: dir === "rtl" ? -14 : 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir === "rtl" ? 14 : -14 }}
              transition={{ duration: 0.18 }}
            >
              {!isReview && currentGroup ? (
                <GroupStep
                  group={currentGroup}
                  state={state}
                  onChange={updateGroup}
                />
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-xl font-bold text-dark-brown">
                      {t("builder.reviewTitle")}
                    </h3>
                    <p className="mt-1 text-sm text-coffee/55">
                      {t("builder.reviewHint")}
                    </p>
                  </div>

                  {selections.length > 0 ? (
                    <div className="space-y-2">
                      {groups.map((group) => {
                        const selectedForGroup = selections.filter(
                          (selection) =>
                            selection.groupId === group.group.id
                        );
                        if (selectedForGroup.length === 0) return null;
                        return (
                          <div
                            key={group.group.id}
                            className="rounded-2xl bg-beige/25 px-4 py-3"
                          >
                            <p className="text-xs font-semibold text-coffee/55">
                              {localizedName(group.group, locale)}
                            </p>
                            <p className="mt-1 text-sm text-dark-brown">
                              {selectedForGroup
                                .map(
                                  (selection) =>
                                    `${selection.optionName}${
                                      selection.quantity > 1
                                        ? ` ×${selection.quantity}`
                                        : ""
                                    }`
                                )
                                .join(", ")}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-2xl bg-beige/25 px-4 py-3 text-sm text-coffee/60">
                      {t("builder.noAddonsSelected")}
                    </p>
                  )}

                  <div className="space-y-2 rounded-2xl border border-beige-dark/20 p-4 text-sm">
                    <div className="flex justify-between text-coffee/65">
                      <span>{t("builder.basePrice")}</span>
                      <span>{formatPrice(product.price)}</span>
                    </div>
                    {unitPrice !== product.price && (
                      <div className="flex justify-between text-coffee/65">
                        <span>{t("builder.addonsPrice")}</span>
                        <span>+{formatPrice(unitPrice - product.price)}</span>
                      </div>
                    )}
                    {quantity > 1 && (
                      <div className="flex justify-between text-coffee/65">
                        <span>{t("cart.quantity")}</span>
                        <span>×{quantity}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-beige-dark/15 pt-2 text-base font-bold">
                      <span>{t("cart.total")}</span>
                      <span className="text-turquoise">
                        {formatPrice(total)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="shrink-0 border-t border-beige-dark/15 bg-warm-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={goBack}
                className="min-h-12 flex-1 rounded-xl"
              >
                {dir === "rtl" ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
                {t("common.back")}
              </Button>
            )}

            {!isReview ? (
              <Button
                type="button"
                variant="turquoise"
                size="lg"
                disabled={!currentValid}
                onClick={goNext}
                className="min-h-12 flex-[1.5] rounded-xl"
              >
                {t("common.continue")}
                {dir === "rtl" ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="turquoise"
                size="lg"
                disabled={!allValid}
                onClick={() => onConfirm({ selections, unitPrice })}
                className="min-h-12 flex-[1.7] rounded-xl"
              >
                {mode === "edit"
                  ? t("builder.saveChanges")
                  : t("catalog.addToCart")}
                <span aria-hidden="true">·</span>
                {formatPrice(total)}
              </Button>
            )}
          </div>
          {!currentValid && currentGroup && (
            <p className="mt-2 text-center text-xs text-amber-700">
              {t("builder.completeCurrent")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
