import type { ProductInput } from "@/lib/validation/schemas";

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
}

export function loadProductDraft(): ProductDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PRODUCT_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProductDraftPayload;
  } catch {
    return null;
  }
}

export function saveProductDraft(payload: ProductDraftPayload) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRODUCT_DRAFT_KEY, JSON.stringify(payload));
}

export function clearProductDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PRODUCT_DRAFT_KEY);
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
