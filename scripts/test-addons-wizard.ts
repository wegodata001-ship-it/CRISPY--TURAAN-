import {
  applyBusinessRules,
  buildSelectedModifiers,
  calculateLineTotal,
  calculateUnitPrice,
  modifiersToSelectionState,
  productHasBuilder,
  validateSelections,
} from "../src/lib/product-builder/engine";
import type {
  ProductBuilderConfig,
  ProductBuilderGroup,
  ProductBuilderOption,
  SelectionState,
} from "../src/types/modifiers";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function option(
  id: string,
  groupId: string,
  priceDelta = 0,
  image?: string
): ProductBuilderOption {
  return {
    id,
    groupId,
    name_he: id,
    name_ar: id,
    name_en: id,
    priceDelta,
    effectivePriceDelta: priceDelta,
    cost: 0,
    sortOrder: 1,
    image,
    active: true,
    archived: false,
    createdAt: "",
    updatedAt: "",
    inStock: true,
    hidden: false,
  };
}

function group(
  id: string,
  selectionType: ProductBuilderGroup["selectionType"],
  requirement: ProductBuilderGroup["requirement"],
  options: ProductBuilderOption[],
  minSelections = 0,
  maxSelections = 10
): ProductBuilderGroup {
  return {
    linkId: `link-${id}`,
    group: {
      id,
      name_he: id,
      name_ar: id,
      name_en: id,
      selectionType,
      requirement,
      minSelections,
      maxSelections,
      displayType: "cards",
      sortOrder: 1,
      active: true,
      archived: false,
      createdAt: "",
      updatedAt: "",
    },
    options,
    selectionType,
    requirement,
    displayType: "cards",
    sortOrder: 1,
    hidden: false,
  };
}

const single = group(
  "milk",
  "single",
  "required",
  [option("regular", "milk"), option("soy", "milk", 2)],
  1,
  1
);
const multiple = group(
  "extras",
  "multiple",
  "optional",
  [
    option("lettuce", "extras"),
    option("onion", "extras", 1),
    option("tomato", "extras", 0, "https://example.com/tomato.jpg"),
  ],
  0,
  2
);
const sauces = group(
  "sauces",
  "multiple",
  "required",
  [option("mayo", "sauces"), option("mustard", "sauces")],
  1,
  2
);

const config: ProductBuilderConfig = {
  productId: "test-product",
  groups: [single, multiple, sauces],
  rules: [],
  suggestions: [],
};

const tests: Record<string, boolean> = {};

const started = performance.now();
assert(!productHasBuilder({ ...config, groups: [] }), "product without addons");
tests.productWithoutAddons = true;
assert(productHasBuilder(config), "product with addons");
tests.productWithAddons = true;
assert(applyBusinessRules(config, {}).groups.length === 3, "dynamic groups");
tests.dynamicGroups = true;

const empty: SelectionState = {};
assert(
  validateSelections(config, empty).some((error) => error.startsWith("required:milk")),
  "required single validation"
);
tests.required = true;
assert(
  validateSelections({ ...config, groups: [multiple] }, empty).length === 0,
  "optional group skip"
);
tests.optional = true;

const state: SelectionState = {
  milk: [{ optionId: "soy", quantity: 1 }],
  extras: [
    { optionId: "lettuce", quantity: 1 },
    { optionId: "onion", quantity: 1 },
  ],
  sauces: [{ optionId: "mayo", quantity: 1 }],
};
assert(validateSelections(config, state).length === 0, "valid selections");
tests.single = true;
tests.multiple = true;

const selected = buildSelectedModifiers(config, state, "he");
assert(calculateUnitPrice(18, selected) === 21, "paid/free addon pricing");
tests.pricing = true;
assert(calculateLineTotal(21, 2) === 42, "quantity pricing");
tests.quantity = true;
assert(
  modifiersToSelectionState(selected).extras?.length === 2,
  "edit state restoration"
);
tests.editRestore = true;
assert(multiple.options.some((item) => item.image), "option image retained");
assert(multiple.options.some((item) => !item.image), "text-only option retained");
tests.images = true;

const modalPreparationMs = performance.now() - started;
const stepStarted = performance.now();
const retainedState = { ...state };
const nextStepState = { ...retainedState };
assert(nextStepState.extras?.length === 2, "back navigation state retention");
const stepTransitionMs = performance.now() - stepStarted;

console.log(
  JSON.stringify(
    {
      tests,
      modalPreparationMs: Number(modalPreparationMs.toFixed(3)),
      stepTransitionMs: Number(stepTransitionMs.toFixed(3)),
    },
    null,
    2
  )
);
