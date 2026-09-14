import { describe, expect, it } from "vitest";
import {
  buildModifierPreviewByProductId,
  formatSelectionHint,
  getVisiblePreviewOptions,
} from "@/lib/menu/modifier-preview";
import type {
  ModifierGroup,
  ModifierOption,
  ProductModifierGroup,
} from "@/types/modifiers";

function group(partial: Partial<ModifierGroup> & Pick<ModifierGroup, "id">): ModifierGroup {
  return {
    name_he: "קבוצה",
    name_ar: "مجموعة",
    name_en: "Group",
    selectionType: "single",
    requirement: "optional",
    minSelections: 0,
    maxSelections: 1,
    displayType: "chips",
    sortOrder: 1,
    active: true,
    archived: false,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

function option(
  partial: Partial<ModifierOption> & Pick<ModifierOption, "id" | "groupId">
): ModifierOption {
  return {
    name_he: "אופציה",
    name_ar: "خيار",
    name_en: "Option",
    priceDelta: 0,
    cost: 0,
    sortOrder: 1,
    active: true,
    archived: false,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

function link(
  partial: Partial<ProductModifierGroup> &
    Pick<ProductModifierGroup, "id" | "productId" | "groupId">
): ProductModifierGroup {
  return {
    sortOrder: 1,
    active: true,
    ...partial,
  };
}

describe("buildModifierPreviewByProductId", () => {
  it("returns empty map entry when product has no modifiers", () => {
    const map = buildModifierPreviewByProductId([], [], [], "he");
    expect(map.get("p1") ?? []).toEqual([]);
  });

  it("builds localized preview for linked groups only", () => {
    const groups = [
      group({
        id: "g1",
        name_he: "חלב",
        name_ar: "حليب",
        name_en: "Milk",
        requirement: "required",
      }),
      group({ id: "g2", name_he: "לא משויך" }),
    ];
    const options = [
      option({
        id: "o1",
        groupId: "g1",
        name_he: "רגיל",
        name_ar: "عادي",
        name_en: "Regular",
        sortOrder: 1,
      }),
      option({
        id: "o2",
        groupId: "g1",
        name_he: "סויה",
        name_ar: "صويا",
        name_en: "Soy",
        priceDelta: 2,
        sortOrder: 2,
      }),
      option({ id: "o3", groupId: "g2", name_he: "מוסתר" }),
    ];
    const links = [link({ id: "l1", productId: "p1", groupId: "g1", requirement: "required" })];

    const map = buildModifierPreviewByProductId(links, groups, options, "ar");
    const preview = map.get("p1") ?? [];

    expect(preview).toHaveLength(1);
    expect(preview[0].groupName).toBe("حليب");
    expect(preview[0].options.map((o) => o.name)).toEqual(["عادي", "صويا"]);
    expect(preview[0].options[1].priceDelta).toBe(2);
    expect(map.has("p2")).toBe(false);
  });

  it("skips inactive/archived groups and empty option lists", () => {
    const groups = [
      group({ id: "g1", active: false }),
      group({ id: "g2", archived: true }),
      group({ id: "g3" }),
    ];
    const options = [
      option({ id: "o1", groupId: "g1" }),
      option({ id: "o2", groupId: "g2" }),
      option({ id: "o3", groupId: "g3", active: false }),
    ];
    const links = [
      link({ id: "l1", productId: "p1", groupId: "g1" }),
      link({ id: "l2", productId: "p1", groupId: "g2" }),
      link({ id: "l3", productId: "p1", groupId: "g3" }),
    ];

    const preview = buildModifierPreviewByProductId(links, groups, options, "he").get("p1") ?? [];
    expect(preview).toEqual([]);
  });

  it("keeps link order and multiple groups", () => {
    const groups = [group({ id: "g1", name_he: "א" }), group({ id: "g2", name_he: "ב" })];
    const options = [
      option({ id: "o1", groupId: "g1" }),
      option({ id: "o2", groupId: "g2" }),
    ];
    const links = [
      link({ id: "l2", productId: "p1", groupId: "g2", sortOrder: 2 }),
      link({ id: "l1", productId: "p1", groupId: "g1", sortOrder: 1 }),
    ];

    const preview = buildModifierPreviewByProductId(links, groups, options, "he").get("p1") ?? [];
    expect(preview.map((g) => g.groupId)).toEqual(["g1", "g2"]);
  });
});

describe("getVisiblePreviewOptions", () => {
  it("truncates after 3 options", () => {
    const options = [
      { id: "1", name: "a", priceDelta: 0 },
      { id: "2", name: "b", priceDelta: 0 },
      { id: "3", name: "c", priceDelta: 0 },
      { id: "4", name: "d", priceDelta: 0 },
      { id: "5", name: "e", priceDelta: 0 },
    ];
    expect(getVisiblePreviewOptions(options)).toEqual({
      visible: options.slice(0, 3),
      hiddenCount: 2,
    });
  });
});

describe("formatSelectionHint", () => {
  const labels = {
    chooseOne: "בחירה אחת",
    chooseExact: (n: number) => `בחירת ${n}`,
    chooseUpTo: (n: number) => `בחירה עד ${n}`,
  };

  it("shows choose one for required single", () => {
    expect(
      formatSelectionHint(
        {
          groupId: "g",
          groupName: "Milk",
          requirement: "required",
          selectionType: "single",
          minSelections: 1,
          maxSelections: 1,
          options: [],
        },
        labels
      )
    ).toBe("בחירה אחת");
  });

  it("shows exact count when min equals max", () => {
    expect(
      formatSelectionHint(
        {
          groupId: "g",
          groupName: "Flavors",
          requirement: "required",
          selectionType: "multiple",
          minSelections: 2,
          maxSelections: 2,
          options: [],
        },
        labels
      )
    ).toBe("בחירת 2");
  });

  it("shows up-to when max > 1", () => {
    expect(
      formatSelectionHint(
        {
          groupId: "g",
          groupName: "Extras",
          requirement: "optional",
          selectionType: "multiple",
          minSelections: 0,
          maxSelections: 3,
          options: [],
        },
        labels
      )
    ).toBe("בחירה עד 3");
  });
});
