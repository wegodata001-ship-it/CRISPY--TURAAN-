import { BRAND } from "@/lib/brand";

/**
 * Normalizes any image value into a usable URL:
 * - Firebase URLs pass through unchanged
 * - Local filenames get prepended with "/"
 * - "public/" prefix is stripped
 * - Empty/null returns null
 */
export function normalizeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  let trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  trimmed = trimmed.replace(/^\/?(public\/)/i, "");
  if (!trimmed.startsWith("/")) trimmed = `/${trimmed}`;
  return trimmed;
}

/**
 * Local-only product placeholders — never use external URLs here.
 * External images (Unsplash etc.) can 404 and break Next.js image optimization.
 */
const LOCAL_DEFAULT = BRAND.store;

/** Per-category local paths; all fall back to store.jpg until custom assets are added in /public/placeholders/ */
export const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  "soft-drinks": LOCAL_DEFAULT,
  "fresh-juices": LOCAL_DEFAULT,
  shakes: LOCAL_DEFAULT,
  "hot-drinks": LOCAL_DEFAULT,
  "ice-drinks": LOCAL_DEFAULT,
  breakfast: LOCAL_DEFAULT,
  sandwiches: LOCAL_DEFAULT,
  salads: LOCAL_DEFAULT,
  "mains-pasta": LOCAL_DEFAULT,
  bakery: LOCAL_DEFAULT,
  desserts: LOCAL_DEFAULT,
  "ice-cream-yogurt": LOCAL_DEFAULT,
};

export function getCategoryPlaceholder(categoryId: string): string {
  return CATEGORY_PLACEHOLDERS[categoryId] ?? LOCAL_DEFAULT;
}

export function isAllowedProductImageUrl(url: string): boolean {
  const normalized = normalizeImageUrl(url);
  if (!normalized) return false;
  if (/unsplash\.com|images\.unsplash\.com/i.test(normalized)) return false;
  if (normalized.startsWith("/")) return true;
  if (normalized.includes("firebasestorage.googleapis.com")) return true;
  if (normalized.includes("firebasestorage.app")) return true;
  return false;
}

/** True when the product has a real uploaded image worth showing as a thumbnail */
export function hasRealProductImage(image: string | undefined | null): boolean {
  const normalized = normalizeImageUrl(image);
  if (!normalized || !isAllowedProductImageUrl(normalized)) return false;
  if (normalized.includes("placeholder")) return false;
  if (normalized === LOCAL_DEFAULT || normalized === BRAND.store) return false;
  return true;
}

/** True when a category has a dedicated hero image (not the generic store fallback) */
export function hasRealCategoryImage(image: string | undefined | null, categoryId: string): boolean {
  if (!image || !isAllowedProductImageUrl(image)) return false;
  const trimmed = image.trim();
  if (!trimmed || trimmed.includes("placeholder")) return false;
  if (trimmed === LOCAL_DEFAULT || trimmed === BRAND.store) return false;
  const placeholder = getCategoryPlaceholder(categoryId);
  if (trimmed === placeholder) return false;
  return true;
}

/** Returns category hero image URL or null when no dedicated image exists */
export function getCategoryHeroImage(
  image: string | undefined | null,
  categoryId: string
): string | null {
  if (!hasRealCategoryImage(image, categoryId)) return null;
  return image!.trim();
}

/** Returns the product's own image URL, or empty string if none exists */
export function getProductImage(image: string | undefined | null, _categoryId?: string): string {
  if (hasRealProductImage(image)) return normalizeImageUrl(image)!;
  return "";
}

export const PRODUCT_IMAGE_FALLBACK = "";
