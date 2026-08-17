import type { Locale } from "@/lib/i18n/types";
import type {
  BusinessRule,
  InventoryLink,
  ModifierGroup,
  ModifierOption,
  ProductBuilderConfig,
  ProductBuilderGroup,
  ProductBuilderOption,
  ProductModifierGroup,
  ProductModifierOption,
  ProductSuggestion,
  SelectionState,
  SelectedModifier,
} from "@/types/modifiers";
import type { Product } from "@/types";

function localizedName(
  item: { name_he: string; name_ar: string; name_en: string },
  locale: Locale
): string {
  if (locale === "he") return item.name_he || item.name_en;
  if (locale === "ar") return item.name_ar || item.name_he;
  return item.name_en || item.name_he;
}

export function buildProductBuilderConfig(input: {
  productId: string;
  groups: ModifierGroup[];
  options: ModifierOption[];
  productGroups: ProductModifierGroup[];
  productOptions: ProductModifierOption[];
  rules: BusinessRule[];
  suggestions: ProductSuggestion[];
  inventory: InventoryLink[];
}): ProductBuilderConfig {
  const { productId, groups, options, productGroups, productOptions, rules, suggestions, inventory } =
    input;

  const inventoryByOption = new Map(inventory.map((i) => [i.optionId, i]));
  const productOptionByOptionId = new Map(
    productOptions.filter((po) => po.productId === productId).map((po) => [po.optionId, po])
  );

  const builderGroups: ProductBuilderGroup[] = productGroups
    .filter((pg) => pg.productId === productId && pg.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => {
      const group = groups.find((g) => g.id === link.groupId && g.active && !g.archived);
      if (!group) return null;

      const groupOptions = options
        .filter((o) => o.groupId === group.id && o.active && !o.archived)
        .map((option) => {
          const override = productOptionByOptionId.get(option.id);
          if (override && !override.active) return null;

          const inv = inventoryByOption.get(option.id);
          const inStock =
            !inv || !inv.active || !inv.trackInventory || inv.quantityOnHand > 0;

          const builderOption: ProductBuilderOption = {
            ...option,
            effectivePriceDelta: override?.priceDeltaOverride ?? option.priceDelta,
            inStock,
            hidden: false,
          };
          return builderOption;
        })
        .filter(Boolean) as ProductBuilderOption[];

      groupOptions.sort((a, b) => {
        const ao = productOptionByOptionId.get(a.id)?.sortOrderOverride;
        const bo = productOptionByOptionId.get(b.id)?.sortOrderOverride;
        return (ao ?? a.sortOrder) - (bo ?? b.sortOrder);
      });

      return {
        linkId: link.id,
        group,
        options: groupOptions,
        selectionType: group.selectionType,
        requirement: link.requirement ?? group.requirement,
        displayType: link.displayType ?? group.displayType,
        sortOrder: link.sortOrder,
        hidden: false,
      };
    })
    .filter(Boolean) as ProductBuilderGroup[];

  return {
    productId,
    groups: builderGroups,
    rules: rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority),
    suggestions: suggestions
      .filter((s) => s.triggerProductId === productId && s.active)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

function isOptionSelected(state: SelectionState, optionId: string): boolean {
  return Object.values(state).some((entries) =>
    entries.some((e) => e.optionId === optionId && e.quantity > 0)
  );
}

function groupHasSelection(state: SelectionState, groupId: string): boolean {
  return (state[groupId]?.length ?? 0) > 0;
}

function evaluateCondition(
  condition: BusinessRule["conditions"][0],
  state: SelectionState,
  context: { productId?: string; categoryId?: string }
): boolean {
  switch (condition.type) {
    case "option_selected":
      return condition.optionId ? isOptionSelected(state, condition.optionId) : false;
    case "option_not_selected":
      return condition.optionId ? !isOptionSelected(state, condition.optionId) : true;
    case "group_has_selection":
      return condition.groupId ? groupHasSelection(state, condition.groupId) : false;
    case "product_is":
      return Boolean(condition.productId && condition.productId === context.productId);
    case "category_is":
      return Boolean(condition.categoryId && condition.categoryId === context.categoryId);
    default:
      return false;
  }
}

export function applyBusinessRules(
  config: ProductBuilderConfig,
  state: SelectionState,
  context: { productId?: string; categoryId?: string } = { productId: config.productId }
): ProductBuilderConfig {
  const hiddenGroups = new Set<string>();
  const hiddenOptions = new Set<string>();
  const shownGroups = new Set<string>();
  const shownOptions = new Set<string>();

  for (const rule of config.rules) {
    const matches = rule.conditions.every((condition) =>
      evaluateCondition(condition, state, {
        productId: context.productId ?? config.productId,
        categoryId: context.categoryId,
      })
    );
    if (!matches) continue;

    for (const action of rule.actions) {
      switch (action.type) {
        case "hide_group":
          if (action.groupId) {
            hiddenGroups.add(action.groupId);
            shownGroups.delete(action.groupId);
          }
          break;
        case "hide_option":
          if (action.optionId) {
            hiddenOptions.add(action.optionId);
            shownOptions.delete(action.optionId);
          }
          break;
        case "show_group":
          if (action.groupId) {
            shownGroups.add(action.groupId);
            hiddenGroups.delete(action.groupId);
          }
          break;
        case "show_option":
          if (action.optionId) {
            shownOptions.add(action.optionId);
            hiddenOptions.delete(action.optionId);
          }
          break;
      }
    }
  }

  const groups = config.groups
    .map((g) => {
      const groupHidden = hiddenGroups.has(g.group.id);
      const options = g.options.map((o) => ({
        ...o,
        hidden: groupHidden || hiddenOptions.has(o.id),
      }));
      return { ...g, hidden: groupHidden, options };
    })
    .filter((g) => !g.hidden);

  return { ...config, groups };
}

export function pruneInvalidSelections(
  config: ProductBuilderConfig,
  state: SelectionState,
  context: { productId?: string; categoryId?: string } = { productId: config.productId }
): SelectionState {
  const visible = applyBusinessRules(config, state, context);
  const validOptionsByGroup = new Map(
    visible.groups.map((group) => [
      group.group.id,
      new Set(
        group.options
          .filter((option) => !option.hidden && option.inStock)
          .map((option) => option.id)
      ),
    ])
  );
  const next: SelectionState = {};
  for (const [groupId, entries] of Object.entries(state)) {
    const validOptions = validOptionsByGroup.get(groupId);
    if (!validOptions) continue;
    const validEntries = entries.filter(
      (entry) => entry.quantity > 0 && validOptions.has(entry.optionId)
    );
    if (validEntries.length > 0) next[groupId] = validEntries;
  }
  return next;
}

export function calculateUnitPrice(
  basePrice: number,
  selections: SelectedModifier[]
): number {
  const extras = selections.reduce((sum, s) => sum + s.priceDelta * s.quantity, 0);
  return basePrice + extras;
}

export function calculateLineTotal(
  unitPrice: number,
  quantity: number
): number {
  return unitPrice * Math.max(0, quantity);
}

export function validateSelections(
  config: ProductBuilderConfig,
  state: SelectionState,
  context?: { productId?: string; categoryId?: string }
): string[] {
  const errors: string[] = [];
  const visibleConfig = applyBusinessRules(config, state, context);

  for (const group of visibleConfig.groups) {
    if (group.hidden) continue;
    const visibleOptions = group.options.filter((o) => !o.hidden && o.inStock);
    const selected = (state[group.group.id] ?? []).filter((s) => s.quantity > 0);
    const selectedVisible = selected.filter((s) =>
      visibleOptions.some((o) => o.id === s.optionId)
    );
    const totalQty = selectedVisible.reduce((sum, s) => sum + s.quantity, 0);

    if (group.requirement === "required" && totalQty === 0) {
      errors.push(`required:${group.group.id}`);
      continue;
    }

    if (group.selectionType === "single" && totalQty > 1) {
      errors.push(`single:${group.group.id}`);
    }

    if (group.selectionType === "multiple") {
      const min = group.group.minSelections;
      const max = group.group.maxSelections;
      if (totalQty > 0 && totalQty < min) errors.push(`min:${group.group.id}:${min}`);
      if (totalQty > max) errors.push(`max:${group.group.id}:${max}`);
    }
  }

  return errors;
}

export function buildSelectedModifiers(
  config: ProductBuilderConfig,
  state: SelectionState,
  locale: Locale,
  context?: { productId?: string; categoryId?: string }
): SelectedModifier[] {
  const visibleConfig = applyBusinessRules(config, state, context);
  const result: SelectedModifier[] = [];

  for (const group of visibleConfig.groups) {
    if (group.hidden) continue;
    const entries = state[group.group.id] ?? [];
    for (const entry of entries) {
      if (entry.quantity <= 0) continue;
      const option = group.options.find((o) => o.id === entry.optionId && !o.hidden);
      if (!option) continue;
      result.push({
        groupId: group.group.id,
        groupName: localizedName(group.group, locale),
        optionId: option.id,
        optionName: localizedName(option, locale),
        priceDelta: option.effectivePriceDelta,
        quantity: entry.quantity,
        kitchenNote: option.kitchenNote,
      });
    }
  }

  return result;
}

export function collectKitchenNotes(selections: SelectedModifier[]): string[] {
  return selections
    .filter((s) => s.kitchenNote)
    .map((s) => `${s.optionName}${s.quantity > 1 ? ` ×${s.quantity}` : ""}: ${s.kitchenNote}`);
}

export function selectionsFingerprint(
  productId: string,
  selections: SelectedModifier[],
  notes?: string
): string {
  const mods = [...selections]
    .sort((a, b) => a.groupId.localeCompare(b.groupId) || a.optionId.localeCompare(b.optionId))
    .map((s) => `${s.optionId}:${s.quantity}`)
    .join("|");
  return `${productId}::${mods}::${notes ?? ""}`;
}

export function productHasBuilder(config: ProductBuilderConfig | null): boolean {
  return Boolean(config && config.groups.some((g) => g.options.length > 0));
}

export function getSuggestedProducts(
  config: ProductBuilderConfig,
  allProducts: Product[],
  locale: Locale
): { product: Product; message?: string }[] {
  return config.suggestions
    .map((s) => {
      const product = allProducts.find((p) => p.id === s.suggestedProductId && p.available);
      if (!product) return null;
      const message =
        locale === "he"
          ? s.message_he
          : locale === "ar"
            ? s.message_ar
            : s.message_en;
      return { product, message };
    })
    .filter(Boolean) as { product: Product; message?: string }[];
}

/** Restore ProductBuilder selection state from saved order/cart modifiers */
export function modifiersToSelectionState(modifiers: SelectedModifier[]): SelectionState {
  const state: SelectionState = {};
  for (const mod of modifiers) {
    const entries = state[mod.groupId] ?? [];
    entries.push({ optionId: mod.optionId, quantity: mod.quantity || 1 });
    state[mod.groupId] = entries;
  }
  return state;
}
