import { describe, expect, it } from "vitest";
import {
  addonGroupDraftHasErrors,
  formatAddonPriceDelta,
  namedAddonOptions,
  newAddonOptionDraft,
  toModifierGroupInput,
  validateAddonGroupDraft,
  type AddonGroupDraft,
} from "@/lib/validation/addon-group-builder";
import {
  buildProductBuilderConfig,
  buildSelectedModifiers,
  calculateUnitPrice,
  validateSelections,
} from "@/lib/product-builder/engine";
import type { ProductBuilderConfig, ProductBuilderGroup } from "@/types/modifiers";

function sauces(overrides: Partial<AddonGroupDraft> = {}): AddonGroupDraft {
  return {
    name: "רטבים",
    required: false,
    selectionType: "multiple",
    minSelections: 0,
    maxSelections: 3,
    options: [
      newAddonOptionDraft({ name: "שום", priceDelta: 0 }),
      newAddonOptionDraft({ name: "קטשופ", priceDelta: 0 }),
      newAddonOptionDraft({ name: "מיונז", priceDelta: 0 }),
      newAddonOptionDraft({ name: "צ'ילי", priceDelta: 2 }),
    ],
    ...overrides,
  };
}

describe("addon group builder validation", () => {
  it("accepts the sauces test group", () => {
    const errors = validateAddonGroupDraft(sauces());
    expect(addonGroupDraftHasErrors(errors)).toBe(false);
  });

  it("rejects a group without a name", () => {
    const errors = validateAddonGroupDraft(sauces({ name: "   " }));
    expect(errors.name).toBe("name");
  });

  it("rejects a group with no named options", () => {
    const errors = validateAddonGroupDraft(
      sauces({ options: [newAddonOptionDraft(), newAddonOptionDraft()] })
    );
    expect(errors.options).toBe("options");
  });

  it("rejects an option that has a price but no name", () => {
    const priced = newAddonOptionDraft({ name: "", priceDelta: 3 });
    const errors = validateAddonGroupDraft(sauces({ options: [priced] }));
    expect(errors.optionNames?.[priced.clientId]).toBe("name");
  });

  it("rejects min greater than max", () => {
    const errors = validateAddonGroupDraft(sauces({ minSelections: 4, maxSelections: 2 }));
    expect(errors.minMax).toBe("range");
  });

  it("requires min ≥ 1 when the group is required", () => {
    const errors = validateAddonGroupDraft(sauces({ required: true, minSelections: 0 }));
    expect(errors.requiredMin).toBe("required");
  });

  it("maps a required single group to min 1 / max 1", () => {
    const input = toModifierGroupInput(
      sauces({
        name: "גודל",
        required: true,
        selectionType: "single",
        minSelections: 0,
        maxSelections: 3,
      }),
      0
    );
    expect(input.selectionType).toBe("single");
    expect(input.requirement).toBe("required");
    expect(input.minSelections).toBe(1);
    expect(input.maxSelections).toBe(1);
  });

  it("keeps optional multiple min/max", () => {
    const input = toModifierGroupInput(sauces(), 2);
    expect(input.minSelections).toBe(0);
    expect(input.maxSelections).toBe(3);
    expect(namedAddonOptions(sauces().options)).toHaveLength(4);
  });

  it("formats free and paid option prices without flipping RTL", () => {
    expect(formatAddonPriceDelta(0)).toBe("₪0");
    expect(formatAddonPriceDelta(2)).toBe("+₪2");
    expect(formatAddonPriceDelta(3.5)).toBe("+₪3.50");
  });
});

function saucesConfig(): ProductBuilderConfig {
  const group: ProductBuilderGroup = {
    linkId: "link-1",
    selectionType: "multiple",
    requirement: "optional",
    displayType: "buttons",
    sortOrder: 0,
    hidden: false,
    group: {
      id: "sauces",
      name_he: "רטבים",
      name_ar: "רטבים",
      name_en: "Sauces",
      selectionType: "multiple",
      requirement: "optional",
      minSelections: 0,
      maxSelections: 3,
      displayType: "buttons",
      sortOrder: 0,
      active: true,
      archived: false,
      createdAt: "",
      updatedAt: "",
    },
    options: [
      { id: "garlic", groupId: "sauces", name_he: "שום", name_ar: "שום", name_en: "Garlic", priceDelta: 0, cost: 0, sortOrder: 0, active: true, archived: false, createdAt: "", updatedAt: "", effectivePriceDelta: 0, inStock: true, hidden: false },
      { id: "ketchup", groupId: "sauces", name_he: "קטשופ", name_ar: "קטשופ", name_en: "Ketchup", priceDelta: 0, cost: 0, sortOrder: 1, active: true, archived: false, createdAt: "", updatedAt: "", effectivePriceDelta: 0, inStock: true, hidden: false },
      { id: "mayo", groupId: "sauces", name_he: "מיונז", name_ar: "מיונז", name_en: "Mayo", priceDelta: 0, cost: 0, sortOrder: 2, active: true, archived: false, createdAt: "", updatedAt: "", effectivePriceDelta: 0, inStock: true, hidden: false },
      { id: "chili", groupId: "sauces", name_he: "צ'ילי", name_ar: "צ'ילי", name_en: "Chili", priceDelta: 2, cost: 0, sortOrder: 3, active: true, archived: false, createdAt: "", updatedAt: "", effectivePriceDelta: 2, inStock: true, hidden: false },
    ],
  };
  return { productId: "test-meal", groups: [group], rules: [], suggestions: [] };
}

describe("legacy active flags", () => {
  it("keeps assigned groups when active is missing on the link", () => {
    const config = buildProductBuilderConfig({
      productId: "kids",
      groups: [
        {
          id: "size",
          name_he: "גודל",
          name_ar: "גודל",
          name_en: "Size",
          selectionType: "single",
          requirement: "required",
          minSelections: 1,
          maxSelections: 1,
          displayType: "buttons",
          sortOrder: 0,
          active: true,
          archived: false,
          createdAt: "",
          updatedAt: "",
        },
      ],
      options: [
        {
          id: "small",
          groupId: "size",
          name_he: "קטן",
          name_ar: "קטן",
          name_en: "Small",
          priceDelta: 0,
          cost: 0,
          sortOrder: 0,
          active: true,
          archived: false,
          createdAt: "",
          updatedAt: "",
        },
      ],
      productGroups: [
        {
          id: "link-1",
          productId: "kids",
          groupId: "size",
          sortOrder: 0,
          active: undefined as unknown as boolean,
        },
      ],
      productOptions: [],
      rules: [],
      suggestions: [],
      inventory: [],
    });
    expect(config.groups).toHaveLength(1);
    expect(config.groups[0].options).toHaveLength(1);
  });
});

describe("customer addon rules and order snapshot", () => {
  it("allows 0–3 sauces and rejects a 4th", () => {
    const config = saucesConfig();
    expect(validateSelections(config, {})).toEqual([]);
    expect(
      validateSelections(config, {
        sauces: [
          { optionId: "garlic", quantity: 1 },
          { optionId: "ketchup", quantity: 1 },
          { optionId: "mayo", quantity: 1 },
        ],
      })
    ).toEqual([]);
    expect(
      validateSelections(config, {
        sauces: [
          { optionId: "garlic", quantity: 1 },
          { optionId: "ketchup", quantity: 1 },
          { optionId: "mayo", quantity: 1 },
          { optionId: "chili", quantity: 1 },
        ],
      })
    ).toContain("max:sauces:3");
  });

  it("adds addon prices into the line total and snapshots names", () => {
    const config = saucesConfig();
    const selections = buildSelectedModifiers(
      config,
      {
        sauces: [
          { optionId: "mayo", quantity: 1 },
          { optionId: "chili", quantity: 1 },
        ],
      },
      "he"
    );
    expect(calculateUnitPrice(42, selections)).toBe(44);
    expect(selections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ groupName: "רטבים", optionName: "צ'ילי", priceDelta: 2 }),
      ])
    );
    const laterConfig = saucesConfig();
    laterConfig.groups[0].options[3].effectivePriceDelta = 3;
    expect(selections.find((s) => s.optionId === "chili")?.priceDelta).toBe(2);
  });
});
