import type { Category, Product } from "@/types";
import type { ProductModifierGroup } from "@/types/modifiers";
import { isEnabledFlag } from "@/lib/product-builder/visibility";

export type CategoryAddonLink = {
  id: string;
  categoryId: string;
  groupId: string;
  sortOrder: number;
  active: boolean;
};

export type ProductAddonExclusion = {
  id: string;
  productId: string;
  groupId: string;
};

/** Categories whose defaults apply to this product (own + parent). */
export function categoryIdsForProduct(
  product: Pick<Product, "categoryId" | "subcategoryId">,
  categories: Category[]
): string[] {
  const ids = new Set<string>();
  if (product.categoryId) ids.add(product.categoryId);
  if (product.subcategoryId) ids.add(product.subcategoryId);

  const own = categories.find((category) => category.id === product.categoryId);
  if (own?.parentId) ids.add(own.parentId);

  const sub = categories.find((category) => category.id === product.subcategoryId);
  if (sub?.parentId) ids.add(sub.parentId);

  return [...ids];
}

export function productBelongsToCategory(
  product: Pick<Product, "categoryId" | "subcategoryId" | "active">,
  categoryId: string,
  categories: Category[]
): boolean {
  return categoryIdsForProduct(product, categories).includes(categoryId);
}

export function countActiveProductsInCategoryTree(
  products: Product[],
  categoryId: string,
  categories: Category[]
): number {
  return products.filter(
    (product) =>
      product.active !== false && productBelongsToCategory(product, categoryId, categories)
  ).length;
}

/**
 * category defaults + product extras − product exclusions, de-duplicated by groupId.
 */
export function resolveAddonGroupIds(input: {
  product: Pick<Product, "id" | "categoryId" | "subcategoryId">;
  categories: Category[];
  categoryLinks: CategoryAddonLink[];
  productLinks: ProductModifierGroup[];
  exclusions: ProductAddonExclusion[];
}): string[] {
  const categoryIds = new Set(categoryIdsForProduct(input.product, input.categories));
  const inherited = input.categoryLinks
    .filter((link) => categoryIds.has(link.categoryId) && isEnabledFlag(link.active))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => link.groupId);

  const extras = input.productLinks
    .filter((link) => link.productId === input.product.id && isEnabledFlag(link.active))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => link.groupId);

  const excluded = new Set(
    input.exclusions
      .filter((item) => item.productId === input.product.id)
      .map((item) => item.groupId)
  );

  const resolved: string[] = [];
  const seen = new Set<string>();
  for (const groupId of [...inherited, ...extras]) {
    if (excluded.has(groupId) || seen.has(groupId)) continue;
    seen.add(groupId);
    resolved.push(groupId);
  }
  return resolved;
}

export function inheritedAddonSourcesForProduct(input: {
  product: Pick<Product, "categoryId" | "subcategoryId">;
  categories: Category[];
  categoryLinks: CategoryAddonLink[];
}): { groupId: string; categoryId: string }[] {
  const categoryIds = new Set(categoryIdsForProduct(input.product, input.categories));
  const seen = new Set<string>();
  const sources: { groupId: string; categoryId: string }[] = [];
  for (const link of [...input.categoryLinks]
    .filter((item) => categoryIds.has(item.categoryId) && isEnabledFlag(item.active))
    .sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (seen.has(link.groupId)) continue;
    seen.add(link.groupId);
    sources.push({ groupId: link.groupId, categoryId: link.categoryId });
  }
  return sources;
}

/** Virtual product↔group links after category defaults + extras − exclusions. */
export function buildResolvedProductModifierLinks(input: {
  products: Pick<Product, "id" | "categoryId" | "subcategoryId">[];
  categories: Category[];
  categoryLinks: CategoryAddonLink[];
  productLinks: ProductModifierGroup[];
  exclusions: ProductAddonExclusion[];
}): ProductModifierGroup[] {
  const result: ProductModifierGroup[] = [];
  for (const product of input.products) {
    const groupIds = resolveAddonGroupIds({
      product,
      categories: input.categories,
      categoryLinks: input.categoryLinks,
      productLinks: input.productLinks,
      exclusions: input.exclusions,
    });
    groupIds.forEach((groupId, index) => {
      const existing = input.productLinks.find(
        (link) =>
          link.productId === product.id &&
          link.groupId === groupId &&
          isEnabledFlag(link.active)
      );
      result.push({
        id: existing?.id ?? `inherited:${product.id}:${groupId}`,
        productId: product.id,
        groupId,
        sortOrder: index,
        active: true,
        requirement: existing?.requirement,
        displayType: existing?.displayType,
        selectionType: existing?.selectionType,
      });
    });
  }
  return result;
}
