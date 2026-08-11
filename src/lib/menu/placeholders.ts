import { BRAND } from "@/lib/brand";

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
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  if (trimmed.includes("firebasestorage.googleapis.com")) return true;
  if (trimmed.includes("firebasestorage.app")) return true;
  return false;
}

/** True when the product has a real uploaded image worth showing as a thumbnail */
export function hasRealProductImage(image: string | undefined | null): boolean {
  if (!image || !isAllowedProductImageUrl(image)) return false;
  const trimmed = image.trim();
  if (!trimmed || trimmed.includes("placeholder")) return false;
  if (trimmed === LOCAL_DEFAULT || trimmed === BRAND.store) return false;
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

/** Returns product image or a local category placeholder — never empty, never external fallback */
export function getProductImage(image: string | undefined | null, categoryId: string): string {
  if (image && isAllowedProductImageUrl(image) && !image.includes("placeholder")) {
    return image.trim();
  }
  return getCategoryPlaceholder(categoryId);
}

export const PRODUCT_IMAGE_FALLBACK = LOCAL_DEFAULT;
