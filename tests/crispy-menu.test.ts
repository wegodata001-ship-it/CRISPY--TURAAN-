import { describe, expect, it } from "vitest";
import {
  CRISPY_MENU_STATS,
  FAMILY_COLESLAW_CONTENTS,
  crispyMenuCategories,
  crispyMenuProducts,
  crispyModifierOptions,
  crispyProductModifierLinks,
} from "@/data/crispy-menu";
import { buildReceiptModelFromOrder } from "@/lib/print-jobs/receipt-model";

describe("CRISPY menu seed data", () => {
  it("has 9 categories and a unique product id for every listed dish", () => {
    expect(crispyMenuCategories).toHaveLength(9);
    expect(new Set(crispyMenuCategories.map((category) => category.sortOrder)).size).toBe(9);
    expect(new Set(crispyMenuProducts.map((product) => product.id)).size).toBe(
      crispyMenuProducts.length
    );
    expect(CRISPY_MENU_STATS.products).toBe(crispyMenuProducts.length);
    expect(crispyMenuProducts.length).toBeGreaterThanOrEqual(94);
  });

  it("hides only the unconfirmed 235 family meal and flags both 17-piece meals", () => {
    const review = crispyMenuProducts.filter((product) => product.needsReview);
    expect(review.map((product) => product.id).sort()).toEqual([
      "crispy-family-crispy-17",
      "crispy-family-crispy-17-review",
    ]);
    const hidden = crispyMenuProducts.filter((product) => !product.active);
    expect(hidden).toHaveLength(1);
    expect(hidden[0]?.price).toBe(235);
    expect(crispyMenuProducts.find((product) => product.id === "crispy-family-crispy-17")?.price).toBe(185);
  });

  it("prices cheese at 5 and included drinks at 0, using listed extra prices", () => {
    const cheese = crispyModifierOptions.find((option) => option.id === "opt-sandwich-cheese");
    expect(cheese?.priceDelta).toBe(5);
    const freeIngredients = crispyModifierOptions.filter(
      (option) => option.groupId === "sandwich-ingredients" && option.id !== "opt-sandwich-cheese"
    );
    expect(freeIngredients.every((option) => option.priceDelta === 0)).toBe(true);
    const drinks = crispyModifierOptions.filter((option) => option.groupId.startsWith("included-drink"));
    expect(drinks.length).toBeGreaterThan(0);
    expect(drinks.every((option) => option.priceDelta === 0)).toBe(true);
    const fries = crispyModifierOptions.find((option) => option.id === "opt-crispy-extra-fries-large");
    expect(fries?.priceDelta).toBe(20);
  });

  it("uses coleslaw only on crispy family meals", () => {
    const crispyFamily = crispyMenuProducts.filter(
      (product) => product.categoryId === "crispy-family" && product.nameAr.includes("كريسبي")
    );
    expect(crispyFamily.every((product) => product.descriptionAr === FAMILY_COLESLAW_CONTENTS)).toBe(true);
    const thigh = crispyMenuProducts.find((product) => product.id === "crispy-family-thigh-8");
    expect(thigh?.descriptionAr).toContain("سلطة");
    expect(thigh?.descriptionAr).not.toContain("كولسلو");
  });

  it("assigns sandwich ingredients only to sandwiches", () => {
    const sandwiches = crispyMenuProducts.filter((product) => product.categoryId === "crispy-sandwiches");
    expect(sandwiches.every((product) => product.modifierGroupIds.includes("sandwich-ingredients"))).toBe(true);
    const others = crispyMenuProducts.filter((product) => product.categoryId !== "crispy-sandwiches");
    expect(others.some((product) => product.modifierGroupIds.includes("sandwich-ingredients"))).toBe(false);
    expect(crispyProductModifierLinks.every((link) => link.id === `${link.productId}__${link.groupId}`)).toBe(true);
  });
});

describe("CRISPY receipt keeps add-ons and notes", () => {
  it("prints the sandwich, cheese price, and customer note", () => {
    const receipt = buildReceiptModelFromOrder({
      orderNumber: "CR-MENU-1",
      customerName: "اختبار قائمة",
      customerPhone: "0500000000",
      notes: "بدون حار",
      total: 45,
      subtotal: 45,
      discount: 0,
      delivery: 0,
      paymentMethod: "cash",
      locale: "ar",
      createdAt: "2026-10-12T10:00:00+03:00",
      items: [
        {
          productId: "crispy-sandwich-crispy-burger",
          productName: "كرسبي برغر + شيبس",
          quantity: 1,
          price: 45,
          notes: "بدون بصل",
          modifiers: [
            {
              groupId: "sandwich-ingredients",
              groupName: "مكونات الساندويتش",
              optionId: "opt-sandwich-cheese",
              optionName: "جبنة",
              priceDelta: 5,
              quantity: 1,
            },
          ],
        },
      ],
    });
    const item = receipt.items[0];
    expect(item?.name).toBe("كرسبي برغر + شيبس");
    expect(item?.modifiers.map((modifier) => modifier.label).join(" ")).toMatch(/جبنة/);
    expect(item?.modifiers.map((modifier) => modifier.label).join(" ")).toMatch(/5/);
    expect(item?.notes).toMatch(/بدون بصل/);
    expect(receipt.notes).toMatch(/بدون حار/);
  });
});
