import type { Category, Product } from "@/types";

export function getRootCategories(categories: Category[]): Category[] {
  return categories
    .filter((c) => !c.parentId && c.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSubcategories(categories: Category[], parentId: string): Category[] {
  return categories
    .filter((c) => c.parentId === parentId && c.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function hasSubcategories(categories: Category[], parentId: string): boolean {
  return categories.some((c) => c.parentId === parentId && c.active);
}

export function getRootCategoriesForAdmin(categories: Category[]): Category[] {
  return categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Total active products under a root category (direct + via subcategories) */
export function countProductsInCategory(
  products: Product[],
  categoryId: string,
  categories: Category[]
): number {
  const subIds = new Set(
    categories.filter((c) => c.parentId === categoryId).map((c) => c.id)
  );
  return products.filter((p) => {
    if (!p.active) return false;
    if (p.categoryId !== categoryId) return false;
    if (p.subcategoryId) return subIds.has(p.subcategoryId);
    return true;
  }).length;
}

export function countProductsInSubcategory(products: Product[], subcategoryId: string): number {
  return products.filter((p) => p.active && p.subcategoryId === subcategoryId).length;
}

export function filterMenuProducts(
  products: Product[],
  categoryId: string | null,
  subcategoryId: string | null,
  categories: Category[]
): Product[] {
  const active = products.filter((p) => p.active);

  if (!categoryId) return active;

  if (subcategoryId) {
    return active.filter((p) => p.subcategoryId === subcategoryId);
  }

  if (hasSubcategories(categories, categoryId)) {
    return [];
  }

  return active.filter((p) => p.categoryId === categoryId && !p.subcategoryId);
}

/** Digital menu display: show ALL products for a root category (including subcategories). */
export function filterMenuDisplayProducts(
  products: Product[],
  categoryId: string | null,
  categories: Category[]
): Product[] {
  const active = products.filter((p) => p.active);
  if (!categoryId) return sortProducts(active);

  const childIds = new Set(
    categories.filter((c) => c.parentId === categoryId && c.active).map((c) => c.id)
  );

  return sortProducts(
    active.filter(
      (p) =>
        p.categoryId === categoryId ||
        childIds.has(p.categoryId) ||
        (p.subcategoryId != null && childIds.has(p.subcategoryId))
    )
  );
}

export function sortProducts(products: Product[]): Product[] {
  return [...products].sort(
    (a, b) =>
      Number(b.isPopular) - Number(a.isPopular) ||
      a.sortOrder - b.sortOrder
  );
}
