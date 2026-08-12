import type { ProductInput } from "@/lib/validation/schemas";
import { isAllowedProductImageUrl } from "@/lib/menu/placeholders";

export const PRODUCT_DRAFT_KEY = "mishkat-product-draft";

export type ProductFormTab = "details" | "images" | "modifiers" | "settings";

export type ManualTranslateField =
  | "nameAr"
  | "nameEn"
  | "descriptionAr"
  | "descriptionEn";

export interface ProductDraftPayload {
  values: ProductInput;
  galleryUrls: string[];
  linkedGroupIds: string[];
  manualFields: ManualTranslateField[];
  editingId?: string | null;
  savedAt: string;
  /** True when user had picked a local File/blob that cannot survive localStorage. */
  imageNeedsReupload?: boolean;
}

export function loadProductDraft(): ProductDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PRODUCT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProductDraftPayload;
    if (!isValidProductDraft(parsed)) {
      clearProductDraft();
      return null;
    }
    return parsed;
  } catch {
    clearProductDraft();
    return null;
  }
}

/** Structural validation — invalid drafts must never block dialog open. */
export function isValidProductDraft(draft: unknown): draft is ProductDraftPayload {
  if (!draft || typeof draft !== "object") return false;
  const d = draft as Partial<ProductDraftPayload>;
  if (!d.values || typeof d.values !== "object") return false;
  if (typeof d.values.nameHe !== "string") return false;
  if (!Array.isArray(d.galleryUrls)) return false;
  if (!Array.isArray(d.linkedGroupIds)) return false;
  if (!Array.isArray(d.manualFields)) return false;
  if (typeof d.savedAt !== "string") return false;
  return true;
}

export function saveProductDraft(payload: ProductDraftPayload) {
  if (typeof window === "undefined") return;
  const rawImage = payload.values.imageUrl?.trim() || payload.galleryUrls[0]?.trim() || "";
  const imageNeedsReupload =
    payload.imageNeedsReupload === true ||
    (Boolean(rawImage) && !isAllowedProductImageUrl(rawImage));
  // Never persist non-durable image refs (blob:/data:/broken hosts) into localStorage.
  const imageUrl =
    payload.values.imageUrl && isAllowedProductImageUrl(payload.values.imageUrl)
      ? payload.values.imageUrl.trim()
      : "";
  const galleryUrls = payload.galleryUrls
    .filter((url) => isAllowedProductImageUrl(url))
    .map((url) => url.trim());
  const normalized: ProductDraftPayload = {
    ...payload,
    values: { ...payload.values, imageUrl },
    galleryUrls: galleryUrls.length > 0 ? galleryUrls : imageUrl ? [imageUrl] : [],
    imageNeedsReupload: imageNeedsReupload && !imageUrl,
  };
  localStorage.setItem(PRODUCT_DRAFT_KEY, JSON.stringify(normalized));
}

export function clearProductDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PRODUCT_DRAFT_KEY);
}

/** Durable image URL from draft, or null when only a local File/blob was ever chosen. */
export function getDraftDurableImage(draft: ProductDraftPayload): string | null {
  const candidates = [draft.values.imageUrl, ...draft.galleryUrls];
  for (const url of candidates) {
    if (url && isAllowedProductImageUrl(url)) return url.trim();
  }
  return null;
}

export function draftHadLocalOnlyImage(draft: ProductDraftPayload): boolean {
  if (draft.imageNeedsReupload) return true;
  const raw = draft.values.imageUrl?.trim() || draft.galleryUrls[0]?.trim() || "";
  if (!raw) return false;
  return !isAllowedProductImageUrl(raw);
}

export function calcProfitMetrics(price: number, cost: number) {
  const profit = Math.round((price - cost) * 100) / 100;
  const marginPercent =
    price > 0 ? Math.round(((price - cost) / price) * 10000) / 100 : 0;
  return { profit, marginPercent };
}

export const DEFAULT_PRODUCT_VALUES: ProductInput = {
  nameHe: "",
  nameAr: "",
  nameEn: "",
  descriptionHe: "",
  descriptionAr: "",
  descriptionEn: "",
  categoryId: "",
  price: 0,
  cost: 0,
  profit: 0,
  businessType: "food",
  imageUrl: "",
  available: true,
  popular: false,
  newProduct: false,
  active: true,
  sortOrder: 0,
  subcategoryId: null,
};
