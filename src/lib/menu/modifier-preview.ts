import type { Locale } from "@/lib/i18n/types";
import { getLocalizedName } from "@/lib/i18n/localized-content";
import type {
  ModifierGroup,
  ModifierOption,
  ProductModifierGroup,
} from "@/types/modifiers";
import { isEnabledFlag, isVisibleRecord } from "@/lib/product-builder/visibility";

export type ModifierPreviewOption = {
  id: string;
  name: string;
  priceDelta: number;
};

export type ModifierPreviewGroup = {
  groupId: string;
  groupName: string;
  requirement: "required" | "optional";
  selectionType: ModifierGroup["selectionType"];
  minSelections: number;
  maxSelections: number;
  options: ModifierPreviewOption[];
};

const MAX_VISIBLE_OPTIONS = 3;

/** Build productId → preview groups once (no N+1). */
export function buildModifierPreviewByProductId(
  links: ProductModifierGroup[],
  groups: ModifierGroup[],
  options: ModifierOption[],
  locale: Locale
): Map<string, ModifierPreviewGroup[]> {
  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const optionsByGroup = new Map<string, ModifierOption[]>();

  for (const option of options) {
    if (!isVisibleRecord(option)) continue;
    const list = optionsByGroup.get(option.groupId) ?? [];
    list.push(option);
    optionsByGroup.set(option.groupId, list);
  }
  for (const list of optionsByGroup.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const byProduct = new Map<string, ModifierPreviewGroup[]>();
  const activeLinks = [...links]
    .filter((link) => isEnabledFlag(link.active))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const link of activeLinks) {
    const group = groupsById.get(link.groupId);
    if (!group || !isVisibleRecord(group)) continue;

    const groupOptions = optionsByGroup.get(group.id) ?? [];
    if (groupOptions.length === 0) continue;

    const preview: ModifierPreviewGroup = {
      groupId: group.id,
      groupName: getLocalizedName(group, locale),
      requirement: link.requirement ?? group.requirement,
      selectionType: group.selectionType,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      options: groupOptions.map((option) => ({
        id: option.id,
        name: getLocalizedName(option, locale),
        priceDelta: option.priceDelta ?? 0,
      })),
    };

    const existing = byProduct.get(link.productId) ?? [];
    existing.push(preview);
    byProduct.set(link.productId, existing);
  }

  return byProduct;
}

export function getVisiblePreviewOptions(options: ModifierPreviewOption[]): {
  visible: ModifierPreviewOption[];
  hiddenCount: number;
} {
  if (options.length <= MAX_VISIBLE_OPTIONS) {
    return { visible: options, hiddenCount: 0 };
  }
  return {
    visible: options.slice(0, MAX_VISIBLE_OPTIONS),
    hiddenCount: options.length - MAX_VISIBLE_OPTIONS,
  };
}

export function formatSelectionHint(
  group: ModifierPreviewGroup,
  labels: {
    chooseOne: string;
    chooseExact: (n: number) => string;
    chooseUpTo: (n: number) => string;
  }
): string | null {
  const { selectionType, requirement, minSelections, maxSelections } = group;

  if (selectionType === "single") {
    return requirement === "required" ? labels.chooseOne : null;
  }

  if (minSelections > 0 && minSelections === maxSelections) {
    return labels.chooseExact(minSelections);
  }

  if (maxSelections > 1) {
    return labels.chooseUpTo(maxSelections);
  }

  if (minSelections > 1) {
    return labels.chooseExact(minSelections);
  }

  return null;
}
