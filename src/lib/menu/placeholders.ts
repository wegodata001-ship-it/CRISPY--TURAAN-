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

/** Returns product image or a local category placeholder — never empty, never external fallback */
export function getProductImage(image: string | undefined | null, categoryId: string): string {
  if (image && isAllowedProductImageUrl(image) && !image.includes("placeholder")) {
    return image.trim();
  }
  return getCategoryPlaceholder(categoryId);
}

export const PRODUCT_IMAGE_FALLBACK = LOCAL_DEFAULT;
