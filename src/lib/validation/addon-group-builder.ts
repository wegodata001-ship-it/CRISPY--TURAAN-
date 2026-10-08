import { normalizeModifierGroupInput } from "@/lib/validation/modifier-normalize";
import type { ModifierGroupInput } from "@/lib/validation/modifier-schemas";

export type AddonOptionDraft = {
  clientId: string;
  id?: string;
  name: string;
  priceDelta: number;
};

export type AddonGroupDraft = {
  name: string;
  nameAr?: string;
  nameEn?: string;
  required: boolean;
  selectionType: "single" | "multiple";
  minSelections: number;
  maxSelections: number;
  options: AddonOptionDraft[];
};

export type AddonGroupFieldErrors = {
  name?: string;
  options?: string;
  optionNames?: Record<string, string>;
  minMax?: string;
  requiredMin?: string;
};

export function newAddonOptionDraft(overrides: Partial<AddonOptionDraft> = {}): AddonOptionDraft {
  return {
    clientId:
      overrides.clientId ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    name: overrides.name ?? "",
    priceDelta: overrides.priceDelta ?? 0,
    ...(overrides.id ? { id: overrides.id } : {}),
  };
}

export function isBlankOption(option: AddonOptionDraft): boolean {
  return !option.name.trim() && (!option.priceDelta || option.priceDelta === 0);
}

export function namedAddonOptions(options: AddonOptionDraft[]): AddonOptionDraft[] {
  return options.filter((option) => option.name.trim().length > 0);
}

export function validateAddonGroupDraft(draft: AddonGroupDraft): AddonGroupFieldErrors {
  const errors: AddonGroupFieldErrors = {};
  const named = namedAddonOptions(draft.options);
  const optionNames: Record<string, string> = {};

  if (!draft.name.trim()) {
    errors.name = "name";
  }

  for (const option of draft.options) {
    if (!option.name.trim() && option.priceDelta > 0) {
      optionNames[option.clientId] = "name";
    }
  }

  if (named.length === 0) {
    errors.options = "options";
  }

  if (Object.keys(optionNames).length > 0) {
    errors.optionNames = optionNames;
  }

  const maxSelections = draft.selectionType === "single" ? 1 : draft.maxSelections;
  const minSelections =
    draft.selectionType === "single"
      ? draft.required
        ? 1
        : 0
      : draft.minSelections;

  if (maxSelections < 1) {
    errors.minMax = "max";
  } else if (minSelections > maxSelections) {
    errors.minMax = "range";
  }

  if (draft.required && minSelections < 1) {
    errors.requiredMin = "required";
  }

  return errors;
}

export function addonGroupDraftHasErrors(errors: AddonGroupFieldErrors): boolean {
  return Boolean(
    errors.name ||
      errors.options ||
      errors.minMax ||
      errors.requiredMin ||
      (errors.optionNames && Object.keys(errors.optionNames).length > 0)
  );
}

export function toModifierGroupInput(
  draft: AddonGroupDraft,
  sortOrder: number
): ModifierGroupInput {
  return normalizeModifierGroupInput({
    nameHe: draft.name,
    nameAr: draft.nameAr,
    nameEn: draft.nameEn,
    selectionType: draft.selectionType,
    requirement: draft.required ? "required" : "optional",
    minSelections: draft.minSelections,
    maxSelections: draft.maxSelections,
    sortOrder,
    active: true,
    archived: false,
    displayType: "buttons",
  });
}

export function formatAddonPriceDelta(price: number): string {
  if (!price || price <= 0) return "₪0";
  const value = Number.isInteger(price) ? String(price) : price.toFixed(2);
  return `+₪${value}`;
}

