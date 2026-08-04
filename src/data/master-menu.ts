import { CATEGORY_META, type BusinessType } from "@/lib/menu/category-meta";
import { getCategoryPlaceholder } from "@/lib/menu/placeholders";

export interface MasterMenuProduct {
  id: string;
  categoryId: string;
  nameHe: string;
  nameAr: string;
  nameEn: string;
  descriptionHe: string;
  descriptionAr: string;
  descriptionEn: string;
  price: number;
  cost: number;
  profit: number;
  businessType: BusinessType;
  popular: boolean;
  available: boolean;
  image: string;
  sortOrder: number;
  active: boolean;
}

export interface MasterMenuCategory {
  id: string;
  nameHe: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  image: string;
  sortOrder: number;
  active: boolean;
}

type RawProduct = {
  nameHe: string;
  nameAr?: string;
  nameEn: string;
  price: number;
  cost?: number;
  popular?: boolean;
  description?: string;
};

type RawCategory = {
  categoryId: string;
  products: RawProduct[];
};

/**
 * MISHKAT CAFÉ — Master Menu (PDF source of truth)
 * Prices, costs, profit, popularity & business type per official menu document.
 */
const RAW_MENU: RawCategory[] = [
  {
    categoryId: "soft-drinks",
    products: [
      { nameHe: "מים מינרליים", nameEn: "Mineral Water", price: 8 },
      { nameHe: "סודה", nameEn: "Soda Water", price: 10 },
      { nameHe: "קולה / זירו", nameEn: "Cola / Zero", price: 13, popular: true },
      { nameHe: "פאנטה", nameEn: "Fanta", price: 13 },
      { nameHe: "ספרייט", nameEn: "Sprite", price: 13 },
      { nameHe: "XL", nameEn: "XL Energy Drink", price: 12 },
      { nameHe: "XL Teen (Ten)", nameEn: "XL Teen", price: 12 },
    ],
  },
  {
    categoryId: "fresh-juices",
    products: [
      { nameHe: "מיץ תפוזים סחוט", nameEn: "Fresh Orange Juice", price: 18, popular: true },
      { nameHe: "מיץ גזר סחוט", nameEn: "Fresh Carrot Juice", price: 18 },
      { nameHe: "תפוגזר", nameEn: "Apple-Carrot-Orange Mix", price: 20, popular: true },
      { nameHe: "מיץ תפוחים", nameEn: "Apple Juice", price: 20 },
      { nameHe: "לימונדה טבעית", nameEn: "Natural Lemonade", price: 16, popular: true },
      { nameHe: "לימונענע גרוס", nameEn: "Lemon Mint (Crushed)", price: 20 },
    ],
  },
  {
    categoryId: "shakes",
    products: [
      { nameHe: "שייק קינדר", nameEn: "Kinder Shake", price: 28, popular: true },
      { nameHe: "שייק אוראו", nameEn: "Oreo Shake", price: 28, popular: true },
      { nameHe: "שייק אלפחורס", nameEn: "Alphonso Mango Shake", price: 28 },
      { nameHe: "שייק פיסטוק", nameEn: "Pistachio Shake", price: 30, popular: true },
      { nameHe: "שייק שוקולד", nameEn: "Chocolate Shake", price: 25 },
      { nameHe: "שייק וניל", nameEn: "Vanilla Shake", price: 25 },
      { nameHe: "שייק תות", nameEn: "Strawberry Shake", price: 26 },
      { nameHe: "שייק פסיפלורה", nameEn: "Passion Fruit Shake", price: 26 },
      { nameHe: "שייק מנגו", nameEn: "Mango Shake", price: 26 },
      { nameHe: "שייק אננס / אפרסק", nameEn: "Pineapple / Peach Shake", price: 28 },
      { nameHe: "שייק פירות יער", nameEn: "Mixed Berries Shake", price: 28 },
      { nameHe: "פיניה קולדה", nameEn: "Piña Colada Shake", price: 28 },
      { nameHe: "שייק ספיישל", nameEn: "Special Shake", price: 30, popular: true },
    ],
  },
  {
    categoryId: "hot-drinks",
    products: [
      { nameHe: "אמריקאנו", nameEn: "Americano", price: 14, popular: true },
      { nameHe: "אספרסו Single", nameEn: "Espresso Single", price: 10 },
      { nameHe: "אספרסו Double", nameEn: "Espresso Double", price: 13, popular: true },
      { nameHe: "מקיאטו", nameEn: "Macchiato", price: 11 },
      { nameHe: "הפוך / קפוצ'ינו", nameEn: "Cappuccino / Latte", price: 16, popular: true },
      { nameHe: "נס קפה", nameEn: "Instant Coffee", price: 14 },
      { nameHe: "סחלב חם", nameEn: "Hot Sahlab", price: 22 },
      { nameHe: "ספאניש לאטה חם", nameEn: "Hot Spanish Latte", price: 22, popular: true },
      { nameHe: "שוקו חם", nameEn: "Hot Chocolate", price: 16, popular: true },
      { nameHe: "שוקולד חם", nameEn: "Hot Drinking Chocolate", price: 20 },
      { nameHe: "תה / תה צמחים", nameEn: "Tea / Herbal Tea", price: 12 },
      { nameHe: "אפוגטו", nameEn: "Affogato", price: 20, popular: true },
    ],
  },
  {
    categoryId: "ice-drinks",
    products: [
      { nameHe: "אייס קפה", nameEn: "Iced Coffee", price: 18, popular: true },
      { nameHe: "אייס ספאניש לאטה", nameEn: "Iced Spanish Latte", price: 26, popular: true },
      { nameHe: "אייס טירמיסו", nameEn: "Iced Tiramisu", price: 26 },
      { nameHe: "אייס פרפראצ'ינו", nameEn: "Iced Frappuccino", price: 26, popular: true },
      { nameHe: "אייס תות", nameEn: "Iced Strawberry", price: 24 },
      { nameHe: "אייס מנגו", nameEn: "Iced Mango", price: 24 },
      { nameHe: "אייס סחלב", nameEn: "Iced Sahlab", price: 24 },
      { nameHe: "אייס רוז", nameEn: "Iced Rose", price: 22 },
    ],
  },
  {
    categoryId: "breakfast",
    products: [
      { nameHe: "ארוחת בוקר לבחירה", nameEn: "Build Your Breakfast", price: 62, popular: true },
      { nameHe: "שקשוקה", nameEn: "Shakshuka", price: 42, popular: true },
      { nameHe: "פריטטה", nameEn: "Frittata", price: 36 },
      { nameHe: "ביצת עין / חביתה", nameEn: "Fried Egg / Omelette", price: 15 },
      { nameHe: "טוסט (בייגל)", nameEn: "Toast (Bagel)", price: 34 },
      { nameHe: "פאן קייק", nameEn: "Pancakes", price: 32, popular: true },
    ],
  },
  {
    categoryId: "sandwiches",
    products: [
      { nameHe: "קוראסון חלומי", nameEn: "Halloumi Croissant", price: 38, popular: true },
      { nameHe: "קוראסון סלמון", nameEn: "Salmon Croissant", price: 44 },
      { nameHe: "קוראסון רוסטביף", nameEn: "Roast Beef Croissant", price: 46 },
      { nameHe: "קוראסון טונה", nameEn: "Tuna Croissant", price: 36 },
      { nameHe: "קוראסון גבינה צהובה", nameEn: "Yellow Cheese Croissant", price: 26 },
      { nameHe: "טארט ממולא אבוקדו", nameEn: "Avocado Stuffed Tart", price: 38 },
    ],
  },
  {
    categoryId: "salads",
    products: [
      { nameHe: "תבולה עם לאבנה", nameEn: "Tabbouleh with Labneh", price: 42 },
      { nameHe: "סלט פתוש", nameEn: "Fatoush Salad", price: 44 },
      { nameHe: "סלט חלומי", nameEn: "Halloumi Salad", price: 48, popular: true },
      { nameHe: "סלט קיסר", nameEn: "Caesar Salad", price: 52, popular: true },
      { nameHe: "סלט שרימפס", nameEn: "Shrimp Salad", price: 62 },
      { nameHe: "סלט יווני / בולגרית", nameEn: "Greek / Bulgarian Salad", price: 44 },
      { nameHe: "סלט אגסים / תערובת", nameEn: "Pear & Mix Salad", price: 48 },
      { nameHe: "פרנץ' טוסט", nameEn: "French Toast", price: 38 },
    ],
  },
  {
    categoryId: "mains-pasta",
    products: [
      { nameHe: "לאפה חזה עוף", nameEn: "Chicken Breast Laffa", price: 54, popular: true },
      { nameHe: "לאפה פילה", nameEn: "Fillet Laffa", price: 68 },
      { nameHe: "רביולי", nameEn: "Ravioli", price: 52 },
      { nameHe: "פטוצ'יני", nameEn: "Fettuccine", price: 48 },
      { nameHe: "לזניה בשר טחון", nameEn: "Ground Beef Lasagna", price: 58 },
      { nameHe: "פטריות ממולאות", nameEn: "Stuffed Mushrooms", price: 46 },
      { nameHe: "פסטה שמנת פטריות", nameEn: "Cream Mushroom Pasta", price: 48, popular: true },
      { nameHe: "פסטה פסטו / עגבניות", nameEn: "Pesto / Tomato Pasta", price: 44 },
      { nameHe: "פסטה 27", nameEn: "Pasta 27", price: 52, popular: true },
      { nameHe: "פוקאצ'ה", nameEn: "Focaccia", price: 24 },
    ],
  },
  {
    categoryId: "bakery",
    products: [
      { nameHe: "קוראסון חמאה", nameEn: "Butter Croissant", price: 18 },
      { nameHe: "קוראסון שקדים", nameEn: "Almond Croissant", price: 22 },
      { nameHe: "קוראסון שוקולד", nameEn: "Chocolate Croissant", price: 22, popular: true },
      { nameHe: "קוראסון גבינה", nameEn: "Cheese Croissant", price: 22 },
      { nameHe: "בורקס גבינה / תפוח", nameEn: "Cheese / Apple Boreka", price: 16 },
      { nameHe: "מאפה קובייה", nameEn: "Cube Pastry", price: 28 },
      { nameHe: "מאפה פטל", nameEn: "Raspberry Pastry", price: 28 },
      { nameHe: "מאפה מרובע עם קרם", nameEn: "Square Cream Pastry", price: 30 },
      { nameHe: "מאפה מעוין + פירות", nameEn: "Diamond Fruit Pastry", price: 28 },
      { nameHe: "סינבון", nameEn: "Cinnamon Roll", price: 26, popular: true },
      { nameHe: "מאפה שטרודל", nameEn: "Strudel Pastry", price: 26 },
      { nameHe: "פאן וייס / פיסטוק", nameEn: "Funnel Cake / Pistachio", price: 30 },
      { nameHe: "טארט פירות", nameEn: "Fruit Tart", price: 28, popular: true },
    ],
  },
  {
    categoryId: "desserts",
    products: [
      { nameHe: "רד וולווט", nameEn: "Red Velvet", price: 36, popular: true },
      { nameHe: "מוס קינדר", nameEn: "Kinder Mousse", price: 32 },
      { nameHe: "מוס אוראו", nameEn: "Oreo Mousse", price: 32, popular: true },
      { nameHe: "עוגת גבינה אפויה", nameEn: "Baked Cheesecake", price: 38 },
      { nameHe: "סאן סבסטיאן", nameEn: "San Sebastian Cheesecake", price: 40, popular: true },
      { nameHe: "חלאוות אלג'בן", nameEn: "Al-Jabin Halawat", price: 34 },
      { nameHe: "ליאלי ביירות", nameEn: "Layali Beirut", price: 32 },
      { nameHe: "טירמיסו", nameEn: "Tiramisu", price: 36, popular: true },
      { nameHe: "קערת וואפל / קרפ", nameEn: "Waffle / Crepe Bowl", price: 38 },
      { nameHe: "בראוניז", nameEn: "Brownies", price: 18 },
      { nameHe: "טרס לצ'ס", nameEn: "Tres Leches", price: 36 },
      { nameHe: "כוסות קינוח אישיות", nameEn: "Personal Dessert Cups", price: 26 },
    ],
  },
  {
    categoryId: "ice-cream-yogurt",
    products: [
      { nameHe: "גלידה אמריקאית", nameEn: "American Ice Cream", price: 15, popular: true },
      { nameHe: "גלידה (ג'לאטו)", nameEn: "Gelato Ice Cream", price: 18 },
      { nameHe: "יוגורט טבעי", nameEn: "Natural Yogurt", price: 22 },
      { nameHe: "תוספות ליוגורט", nameEn: "Yogurt Toppings", price: 12 },
    ],
  },
];

/** Food-cost ratio from PDF business model (cost ≈ 38% of menu price) */
const DEFAULT_COST_RATIO = 0.38;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

function calcCost(price: number, explicit?: number): number {
  if (explicit !== undefined) return explicit;
  return Math.round(price * DEFAULT_COST_RATIO * 100) / 100;
}

function buildProducts(): MasterMenuProduct[] {
  const products: MasterMenuProduct[] = [];

  for (const group of RAW_MENU) {
    const meta = CATEGORY_META.find((c) => c.id === group.categoryId);
    if (!meta) continue;

    group.products.forEach((raw, index) => {
      const price = raw.price;
      const cost = calcCost(price, raw.cost);
      const id = `${group.categoryId}-${slugify(raw.nameEn || raw.nameHe)}`;

      const nameAr = raw.nameAr ?? raw.nameEn;
      const descHe =
        raw.description ?? `${raw.nameHe} — ${meta.nameHe} · MISHKAT CAFÉ`;

      products.push({
        id,
        categoryId: group.categoryId,
        nameHe: raw.nameHe,
        nameAr,
        nameEn: raw.nameEn,
        descriptionHe: descHe,
        descriptionAr: `${nameAr} — ${meta.nameAr} · MISHKAT CAFÉ`,
        descriptionEn: `${raw.nameEn} — ${meta.nameEn} · MISHKAT CAFÉ`,
        price,
        cost,
        profit: Math.round((price - cost) * 100) / 100,
        businessType: meta.businessType,
        popular: raw.popular ?? false,
        available: true,
        image: getCategoryPlaceholder(group.categoryId),
        sortOrder: index + 1,
        active: true,
      });
    });
  }

  return products;
}

function buildCategories(): MasterMenuCategory[] {
  return CATEGORY_META.map((meta, index) => ({
    id: meta.id,
    nameHe: meta.nameHe,
    nameAr: meta.nameAr,
    nameEn: meta.nameEn,
    icon: meta.icon,
    image: getCategoryPlaceholder(meta.id),
    sortOrder: index + 1,
    active: true,
  }));
}

export const masterMenuCategories = buildCategories();
export const masterMenuProducts = buildProducts();

export const MASTER_MENU_STATS = {
  categories: masterMenuCategories.length,
  products: masterMenuProducts.length,
  popular: masterMenuProducts.filter((p) => p.popular).length,
};
