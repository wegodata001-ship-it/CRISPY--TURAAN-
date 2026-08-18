export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
/** 96dpi CSS pixels for 210mm × 297mm */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
/** ~14mm safe inset */
export const A4_SAFE_PX = 52;

export const MENU_ARABIC_FONT =
  'var(--font-cairo), var(--font-tajawal), "Noto Naskh Arabic", "Segoe UI", Tahoma, sans-serif';

export const ARABIC_SAMPLE_WORDS = [
  "المشروبات الباردة",
  "آيس لاتيه",
  "قهوة عربية",
  "شاي بالنعناع",
  "كريب شوكولاتة",
  "إضافات",
  "عرض العائلة",
] as const;

export function formatMenuPrice(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "";
  const amount = Number.isInteger(price) ? String(price) : price.toFixed(2);
  return `${amount} ₪`;
}

export function looksLikeMojibake(text: string): boolean {
  return /[þÿÃÂ�]/.test(text) || /(?:Ã.|Ø.|Ù.){3,}/.test(text);
}

export function assertArabicIntact(text: string): boolean {
  if (!text) return true;
  if (looksLikeMojibake(text)) return false;
  return /[\u0600-\u06FF]/.test(text) || !/[^\x00-\x7F]/.test(text);
}
