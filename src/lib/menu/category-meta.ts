export type BusinessType = "beverage" | "food" | "bakery" | "dessert" | "dairy";

export interface CategoryMeta {
  id: string;
  nameHe: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  businessType: BusinessType;
  basePrice: number;
}

export const CATEGORY_META: CategoryMeta[] = [
  {
    id: "soft-drinks",
    nameHe: "שתייה קלה ומוגזים",
    nameAr: "مشروبات غازية",
    nameEn: "Soft Drinks",
    icon: "glass-water",
    businessType: "beverage",
    basePrice: 12,
  },
  {
    id: "fresh-juices",
    nameHe: "מיצים סחוטים ורעננים",
    nameAr: "عصائر طازجة",
    nameEn: "Fresh Juices",
    icon: "citrus",
    businessType: "beverage",
    basePrice: 26,
  },
  {
    id: "shakes",
    nameHe: "שייקים",
    nameAr: "شيكات",
    nameEn: "Shakes",
    icon: "milk",
    businessType: "beverage",
    basePrice: 32,
  },
  {
    id: "hot-drinks",
    nameHe: "שתייה חמה",
    nameAr: "مشروبات ساخنة",
    nameEn: "Hot Drinks",
    icon: "coffee",
    businessType: "beverage",
    basePrice: 16,
  },
  {
    id: "ice-drinks",
    nameHe: "משקאות אייס",
    nameAr: "مشروبات مثلجة",
    nameEn: "Iced Drinks",
    icon: "snowflake",
    businessType: "beverage",
    basePrice: 28,
  },
  {
    id: "breakfast",
    nameHe: "ארוחות בוקר",
    nameAr: "فطور",
    nameEn: "Breakfast",
    icon: "egg-fried",
    businessType: "food",
    basePrice: 42,
  },
  {
    id: "sandwiches",
    nameHe: "כריכים / קוראסונים",
    nameAr: "ساندوiches / كرواسون",
    nameEn: "Sandwiches & Croissants",
    icon: "sandwich",
    businessType: "food",
    basePrice: 36,
  },
  {
    id: "salads",
    nameHe: "סלטים",
    nameAr: "سلطات",
    nameEn: "Salads",
    icon: "salad",
    businessType: "food",
    basePrice: 46,
  },
  {
    id: "mains-pasta",
    nameHe: "מנות עיקריות / פסטות",
    nameAr: "أطباق رئيسية ومعكرونة",
    nameEn: "Mains & Pasta",
    icon: "utensils",
    businessType: "food",
    basePrice: 58,
  },
  {
    id: "bakery",
    nameHe: "מאפים ובורקסים",
    nameAr: "مخبوزات وبوريكas",
    nameEn: "Bakery & Borekas",
    icon: "croissant",
    businessType: "bakery",
    basePrice: 18,
  },
  {
    id: "desserts",
    nameHe: "קינוחים",
    nameAr: "حلويات",
    nameEn: "Desserts",
    icon: "cake",
    businessType: "dessert",
    basePrice: 36,
  },
  {
    id: "ice-cream-yogurt",
    nameHe: "גלידות ויוגורט",
    nameAr: "آيس كريم ويوغurt",
    nameEn: "Ice Cream & Yogurt",
    icon: "ice-cream",
    businessType: "dairy",
    basePrice: 22,
  },
];

export function getCategoryMeta(id: string): CategoryMeta | undefined {
  return CATEGORY_META.find((c) => c.id === id);
}
