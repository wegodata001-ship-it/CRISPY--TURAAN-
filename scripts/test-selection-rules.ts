import assert from "node:assert/strict";
import {
  applyBusinessRules,
  buildProductBuilderConfig,
  buildSelectedModifiers,
  calculateUnitPrice,
  pruneInvalidSelections,
  validateSelections,
} from "../src/lib/product-builder/engine";
import type {
  BusinessRule,
  ModifierGroup,
  ModifierOption,
  ProductModifierGroup,
  SelectionState,
} from "../src/types/modifiers";

const now = new Date().toISOString();
const group = (id: string, requirement: "required" | "optional" = "optional"): ModifierGroup => ({
  id,
  name_he: id,
  name_ar: id,
  name_en: id,
  selectionType: "single",
  requirement,
  minSelections: requirement === "required" ? 1 : 0,
  maxSelections: 1,
  displayType: "cards",
  sortOrder: 0,
  active: true,
  archived: false,
  createdAt: now,
  updatedAt: now,
});
const option = (id: string, groupId: string, priceDelta = 0): ModifierOption => ({
  id,
  groupId,
  name_he: id,
  name_ar: id,
  name_en: id,
  priceDelta,
  cost: 0,
  sortOrder: 0,
  active: true,
  archived: false,
  createdAt: now,
  updatedAt: now,
});
const rule = (
  id: string,
  condition: BusinessRule["conditions"][number],
  action: BusinessRule["actions"][number],
  priority: number
): BusinessRule => ({
  id,
  name: id,
  enabled: true,
  priority,
  conditions: [condition],
  actions: [action],
  createdAt: now,
  updatedAt: now,
});

const groups = [
  group("temperature", "required"),
  group("service"),
  group("milk"),
  group("ice"),
  group("cup"),
];
const options = [
  option("hot", "temperature"),
  option("cold", "temperature"),
  option("take-away", "service"),
  option("soy", "milk", 2),
  option("ice-cubes", "ice", 1),
];
const productGroups: ProductModifierGroup[] = ["temperature", "service", "milk", "ice", "cup"].map(
  (groupId, index) => ({
    id: `link-${groupId}`,
    productId: "coffee-product",
    groupId,
    sortOrder: index + 1,
    active: true,
  })
);
const rules = [
  rule("hot-hides-ice", { type: "option_selected", optionId: "hot" }, { type: "hide_group", groupId: "ice" }, 0),
  rule("selection-hides-milk", { type: "group_has_selection", groupId: "temperature" }, { type: "hide_group", groupId: "milk" }, 1),
  rule("selection-hides-cup", { type: "group_has_selection", groupId: "temperature" }, { type: "hide_group", groupId: "cup" }, 2),
  rule("cold-shows-ice", { type: "option_selected", optionId: "cold" }, { type: "show_group", groupId: "ice" }, 3),
  rule("coffee-shows-milk", { type: "category_is", categoryId: "coffee" }, { type: "show_group", groupId: "milk" }, 4),
  rule("take-away-shows-cup", { type: "option_selected", optionId: "take-away" }, { type: "show_group", groupId: "cup" }, 5),
];

const config = buildProductBuilderConfig({
  productId: "coffee-product",
  groups,
  options,
  productGroups,
  productOptions: [],
  rules,
  suggestions: [],
  inventory: [],
});

assert.deepEqual(config.groups.map((entry) => entry.group.id), [
  "temperature",
  "service",
  "milk",
  "ice",
  "cup",
]);

const hotState: SelectionState = {
  temperature: [{ optionId: "hot", quantity: 1 }],
  milk: [{ optionId: "soy", quantity: 1 }],
  ice: [{ optionId: "ice-cubes", quantity: 1 }],
};
const hotVisible = applyBusinessRules(config, hotState, {
  productId: "coffee-product",
  categoryId: "coffee",
});
assert.equal(hotVisible.groups.some((entry) => entry.group.id === "ice"), false);

const pruned = pruneInvalidSelections(config, hotState, {
  productId: "coffee-product",
  categoryId: "coffee",
});
assert.equal(pruned.ice, undefined);
const selections = buildSelectedModifiers(config, pruned, "he", {
  productId: "coffee-product",
  categoryId: "coffee",
});
assert.equal(calculateUnitPrice(14, selections), 16);
assert.equal(validateSelections(config, pruned, {
  productId: "coffee-product",
  categoryId: "coffee",
}).length, 0);

const coldState: SelectionState = {
  temperature: [{ optionId: "cold", quantity: 1 }],
  service: [{ optionId: "take-away", quantity: 1 }],
};
const coldVisible = applyBusinessRules(config, coldState, {
    productId: "coffee-product",
    categoryId: "coffee",
  });
assert.equal(coldVisible.groups.some((entry) => entry.group.id === "ice"), true);
assert.equal(coldVisible.groups.some((entry) => entry.group.id === "milk"), true);
assert.equal(coldVisible.groups.some((entry) => entry.group.id === "cup"), true);
assert.equal(
  applyBusinessRules(config, coldState, {
    productId: "coffee-product",
    categoryId: "tea",
  }).groups.some((entry) => entry.group.id === "milk"),
  false
);
assert.equal(validateSelections(config, {}).some((error) => error.startsWith("required:")), true);

console.log(
  JSON.stringify(
    {
      orderedAssignments: true,
      hotHidesIce: true,
      coldShowsIce: true,
      categoryRule: true,
      takeAwayShowsCup: true,
      invalidSelectionCleanup: true,
      realtimePricing: true,
      requiredValidation: true,
    },
    null,
    2
  )
);
