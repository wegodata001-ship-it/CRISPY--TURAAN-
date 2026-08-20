/** Initial products shown per category before “show more”. */
export const CATALOG_PREVIEW_COUNT = 3;

export function getCatalogVisibleProducts<T>(products: T[], expanded: boolean): T[] {
  if (expanded || products.length <= CATALOG_PREVIEW_COUNT) return products;
  return products.slice(0, CATALOG_PREVIEW_COUNT);
}

export function catalogRemainingCount(total: number): number {
  return Math.max(0, total - CATALOG_PREVIEW_COUNT);
}

export function shouldShowCatalogExpand(total: number): boolean {
  return total > CATALOG_PREVIEW_COUNT;
}

export function formatCatalogShowMoreLabel(
  remaining: number,
  t: (key: string, fallback?: string) => string
): string {
  if (remaining <= 0) return t("catalog.showMore", "הצג עוד");
  if (remaining === 1) {
    return t("catalog.showMoreOne", "הצג עוד מוצר אחד");
  }
  return t("catalog.showMoreCount", "הצג עוד {count} מוצרים").replace(
    "{count}",
    String(remaining)
  );
}

export function catalogExpandStorageKey(
  categoryId: string | null | undefined,
  subcategoryId?: string | null
): string {
  if (subcategoryId) return `sub:${subcategoryId}`;
  if (categoryId) return `cat:${categoryId}`;
  return "all";
}
