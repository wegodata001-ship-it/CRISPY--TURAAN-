import { describe, expect, it } from "vitest";
import {
  buildResolvedProductModifierLinks,
  categoryIdsForProduct,
  countActiveProductsInCategoryTree,
  inheritedAddonSourcesForProduct,
  resolveAddonGroupIds,
  type CategoryAddonLink,
  type ProductAddonExclusion,
} from "@/lib/product-builder/category-addons";
import type { Category, Product } from "@/types";
import type { ProductModifierGroup } from "@/types/modifiers";

function category(partial: Partial<Category> & Pick<Category, "id">): Category {
  return {
    name_he: "קטגוריה",
    name_ar: "فئة",
    name_en: "Category",
    icon: "",
    image: "",
    color: "",
    sortOrder: 1,
    active: true,
    ...partial,
  };
}

function product(
  partial: Partial<Product> & Pick<Product, "id" | "categoryId">
): Product {
  return {
    name_he: "מוצר",
    name_ar: "منتج",
    name_en: "Product",
    description_he: "",
    description_ar: "",
    description_en: "",
    subcategoryId: null,
    price: 10,
    cost: 0,
    profit: 10,
    businessType: "food",
    image: "",
    isPopular: false,
    isNew: false,
    available: true,
    active: true,
    sortOrder: 1,
    ...partial,
  } as Product;
}

function categoryLink(
  partial: Partial<CategoryAddonLink> & Pick<CategoryAddonLink, "id" | "categoryId" | "groupId">
): CategoryAddonLink {
  return { sortOrder: 0, active: true, ...partial };
}

function productLink(
  partial: Partial<ProductModifierGroup> &
    Pick<ProductModifierGroup, "id" | "productId" | "groupId">
): ProductModifierGroup {
  return { sortOrder: 0, active: true, ...partial };
}

describe("category add-on resolution", () => {
  const kids = category({ id: "kids", name_he: "ארוחות ילדים" });
  const drinks = category({ id: "drinks", name_he: "שתייה" });
  const burger = category({ id: "burger", name_he: "בורגר" });
  const categories = [kids, drinks, burger];

  it("collects own and parent category ids", () => {
    const child = category({ id: "cola", parentId: "drinks" });
    expect(
      categoryIdsForProduct({ categoryId: "cola", subcategoryId: null }, [drinks, child])
    ).toEqual(expect.arrayContaining(["cola", "drinks"]));
  });

  it("kids meals inherit sizes only", () => {
    const crispy = product({ id: "kids-crispy", categoryId: "kids" });
    expect(
      resolveAddonGroupIds({
        product: crispy,
        categories,
        categoryLinks: [categoryLink({ id: "c1", categoryId: "kids", groupId: "sizes" })],
        productLinks: [],
        exclusions: [],
      })
    ).toEqual(["sizes"]);
  });

  it("drinks inherit ice only", () => {
    const coke = product({ id: "coke", categoryId: "drinks" });
    expect(
      resolveAddonGroupIds({
        product: coke,
        categories,
        categoryLinks: [categoryLink({ id: "c2", categoryId: "drinks", groupId: "ice" })],
        productLinks: [],
        exclusions: [],
      })
    ).toEqual(["ice"]);
  });

  it("burger can inherit multiple groups", () => {
    const item = product({ id: "classic", categoryId: "burger" });
    expect(
      resolveAddonGroupIds({
        product: item,
        categories,
        categoryLinks: [
          categoryLink({ id: "b1", categoryId: "burger", groupId: "sizes", sortOrder: 0 }),
          categoryLink({ id: "b2", categoryId: "burger", groupId: "extras", sortOrder: 1 }),
          categoryLink({ id: "b3", categoryId: "burger", groupId: "sauces", sortOrder: 2 }),
        ],
        productLinks: [],
        exclusions: [],
      })
    ).toEqual(["sizes", "extras", "sauces"]);
  });

  it("adds product extras on top of category defaults", () => {
    const crispy = product({ id: "kids-crispy", categoryId: "kids" });
    expect(
      resolveAddonGroupIds({
        product: crispy,
        categories,
        categoryLinks: [categoryLink({ id: "c1", categoryId: "kids", groupId: "sizes" })],
        productLinks: [productLink({ id: "p1", productId: "kids-crispy", groupId: "sauces" })],
        exclusions: [],
      })
    ).toEqual(["sizes", "sauces"]);
  });

  it("product exclusion removes an inherited group", () => {
    const bottle = product({ id: "coke-bottle", categoryId: "drinks" });
    expect(
      resolveAddonGroupIds({
        product: bottle,
        categories,
        categoryLinks: [categoryLink({ id: "c2", categoryId: "drinks", groupId: "ice" })],
        productLinks: [],
        exclusions: [{ id: "e1", productId: "coke-bottle", groupId: "ice" }],
      })
    ).toEqual([]);
  });

  it("de-duplicates the same group from category and product", () => {
    const coke = product({ id: "coke", categoryId: "drinks" });
    expect(
      resolveAddonGroupIds({
        product: coke,
        categories,
        categoryLinks: [categoryLink({ id: "c2", categoryId: "drinks", groupId: "ice" })],
        productLinks: [productLink({ id: "p1", productId: "coke", groupId: "ice" })],
        exclusions: [],
      })
    ).toEqual(["ice"]);
  });

  it("counts active products in a category tree", () => {
    const products = [
      product({ id: "a", categoryId: "kids" }),
      product({ id: "b", categoryId: "kids", active: false }),
      product({ id: "c", categoryId: "drinks" }),
    ];
    expect(countActiveProductsInCategoryTree(products, "kids", categories)).toBe(1);
  });

  it("reports inherited sources for the product editor", () => {
    const coke = product({ id: "coke", categoryId: "drinks" });
    expect(
      inheritedAddonSourcesForProduct({
        product: coke,
        categories,
        categoryLinks: [categoryLink({ id: "c2", categoryId: "drinks", groupId: "ice" })],
      })
    ).toEqual([{ groupId: "ice", categoryId: "drinks" }]);
  });

  it("builds virtual product links for the customer catalog", () => {
    const products = [product({ id: "kids-crispy", categoryId: "kids" })];
    const links = buildResolvedProductModifierLinks({
      products,
      categories,
      categoryLinks: [categoryLink({ id: "c1", categoryId: "kids", groupId: "sizes" })],
      productLinks: [productLink({ id: "p1", productId: "kids-crispy", groupId: "sauces" })],
      exclusions: [],
    });
    expect(links.map((link) => link.groupId)).toEqual(["sizes", "sauces"]);
    expect(links.every((link) => link.productId === "kids-crispy")).toBe(true);
  });

  it("does not apply an exclusion from a different product", () => {
    const coke = product({ id: "coke", categoryId: "drinks" });
    expect(
      resolveAddonGroupIds({
        product: coke,
        categories,
        categoryLinks: [categoryLink({ id: "c2", categoryId: "drinks", groupId: "ice" })],
        productLinks: [],
        exclusions: [{ id: "e1", productId: "other", groupId: "ice" }],
      })
    ).toEqual(["ice"]);
  });
});
