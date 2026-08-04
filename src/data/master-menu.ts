import { CATEGORY_META, type BusinessType } from "@/lib/menu/category-meta";
import { getCategoryPlaceholder } from "@/lib/menu/placeholders";

export interface MasterMenuProduct {
  id: string;
  categoryId: string;
  nameHe: string;
  nameEn: string;
  description: string;
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
  nameEn: string;
  icon: string;
  image: string;
  sortOrder: number;
  active: boolean;
}

type RawProduct = {
  nameHe: string;
  nameEn: string;
  popular?: boolean;
  priceOffset?: number;
  description?: string;
};

type RawCategory = {
  categoryId: string;
  products: RawProduct[];
};

/** Single source of truth — all categories & products from MISHKAT CAFÉ master menu */
const RAW_MENU: RawCategory[] = [
  {
    categoryId: "soft-drinks",
    products: [
      { nameHe: "מים מינרליים", nameEn: "Mineral Water" },
      { nameHe: "סודה", nameEn: "Soda Water" },
      { nameHe: "קולה / זירו", nameEn: "Cola / Zero", popular: true },
      { nameHe: "פאנטה", nameEn: "Fanta" },
      { nameHe: "ספרייט", nameEn: "Sprite" },
      { nameHe: "XL", nameEn: "XL Energy Drink" },
      { nameHe: "XL Teen (Ten)", nameEn: "XL Teen" },
    ],
  },
  {
    categoryId: "fresh-juices",
    products: [
      { nameHe: "מיץ תפוזים סחוט", nameEn: "Fresh Orange Juice", popular: true },
      { nameHe: "מיץ גזר סחוט", nameEn: "Fresh Carrot Juice" },
      { nameHe: "תפוגזר", nameEn: "Apple-Carrot-Orange Mix", popular: true },
      { nameHe: "מיץ תפוחים", nameEn: "Apple Juice" },
      { nameHe: "לימונדה טבעית", nameEn: "Natural Lemonade", popular: true },
      { nameHe: "לימונענע גרוס", nameEn: "Lemon Mint (Crushed)" },
    ],
  },
  {
    categoryId: "shakes",
    products: [
      { nameHe: "שייק קינדר", nameEn: "Kinder Shake", popular: true },
      { nameHe: "שייק אוראו", nameEn: "Oreo Shake", popular: true },
      { nameHe: "שייק אלפחורס", nameEn: "Alphonso Mango Shake" },
      { nameHe: "שייק פיסטוק", nameEn: "Pistachio Shake", popular: true },
      { nameHe: "שייק שוקולד", nameEn: "Chocolate Shake" },
      { nameHe: "שייק וניל", nameEn: "Vanilla Shake" },
      { nameHe: "שייק תות", nameEn: "Strawberry Shake" },
      { nameHe: "שייק פסיפלורה", nameEn: "Passion Fruit Shake" },
      { nameHe: "שייק מנגו", nameEn: "Mango Shake" },
      { nameHe: "שייק אננס / אפרסק", nameEn: "Pineapple / Peach Shake" },
      { nameHe: "שייק פירות יער", nameEn: "Mixed Berries Shake" },
      { nameHe: "פיניה קולדה", nameEn: "Piña Colada Shake" },
      { nameHe: "שייק ספיישל", nameEn: "Special Shake", popular: true },
    ],
  },
  {
    categoryId: "hot-drinks",
    products: [
      { nameHe: "אמריקאנו", nameEn: "Americano", popular: true },
      { nameHe: "אספרסו Single", nameEn: "Espresso Single" },
      { nameHe: "אספרסו Double", nameEn: "Espresso Double", popular: true },
      { nameHe: "מקיאטו", nameEn: "Macchiato" },
      { nameHe: "הפוך / קפוצ'ינו", nameEn: "Cappuccino / Latte", popular: true },
      { nameHe: "נס קפה", nameEn: "Instant Coffee" },
      { nameHe: "סחלב חם", nameEn: "Hot Sahlab" },
      { nameHe: "ספאניש לאטה חם", nameEn: "Hot Spanish Latte", popular: true },
      { nameHe: "שוקו חם", nameEn: "Hot Chocolate", popular: true },
      { nameHe: "שוקולד חם", nameEn: "Hot Drinking Chocolate" },
      { nameHe: "תה / תה צמחים", nameEn: "Tea / Herbal Tea" },
      { nameHe: "אפוגטו", nameEn: "Affogato", popular: true },
    ],
  },
  {
    categoryId: "ice-drinks",
    products: [
      { nameHe: "אייס קפה", nameEn: "Iced Coffee", popular: true },
      { nameHe: "אייס ספאניש לאטה", nameEn: "Iced Spanish Latte", popular: true },
      { nameHe: "אייס טירמיסו", nameEn: "Iced Tiramisu" },
      { nameHe: "אייס פרפראצ'ינו", nameEn: "Iced Frappuccino", popular: true },
      { nameHe: "אייס תות", nameEn: "Iced Strawberry" },
      { nameHe: "אייס מנגו", nameEn: "Iced Mango" },
      { nameHe: "אייס סחלב", nameEn: "Iced Sahlab" },
      { nameHe: "אייס רוז", nameEn: "Iced Rose" },
    ],
  },
  {
    categoryId: "breakfast",
    products: [
      { nameHe: "ארוחת בוקר לבחירה", nameEn: "Build Your Breakfast", popular: true },
      { nameHe: "שקשוקה", nameEn: "Shakshuka", popular: true },
      { nameHe: "פריטטה", nameEn: "Frittata" },
      { nameHe: "ביצת עין / חביתה", nameEn: "Fried Egg / Omelette" },
      { nameHe: "טוסט (בייגל)", nameEn: "Toast (Bagel)" },
      { nameHe: "פאן קייק", nameEn: "Pancakes", popular: true },
    ],
  },
  {
    categoryId: "sandwiches",
    products: [
      { nameHe: "קוראסון חלומי", nameEn: "Halloumi Croissant", popular: true },
      { nameHe: "קוראסון סלמון", nameEn: "Salmon Croissant" },
      { nameHe: "קוראסון רוסטביף", nameEn: "Roast Beef Croissant" },
      { nameHe: "קוראסון טונה", nameEn: "Tuna Croissant" },
      { nameHe: "קוראסון גבינה צהובה", nameEn: "Yellow Cheese Croissant" },
      { nameHe: "טארט ממולא אבוקדו", nameEn: "Avocado Stuffed Tart" },
    ],
  },
  {
    categoryId: "salads",
    products: [
      { nameHe: "תבולה עם לאבנה", nameEn: "Tabbouleh with Labneh" },
      { nameHe: "סלט פתוש", nameEn: "Fatoush Salad" },
      { nameHe: "סלט חלומי", nameEn: "Halloumi Salad", popular: true },
      { nameHe: "סלט קיסר", nameEn: "Caesar Salad", popular: true },
      { nameHe: "סלט שרימפס", nameEn: "Shrimp Salad" },
      { nameHe: "סלט יווני / בולגרית", nameEn: "Greek / Bulgarian Salad" },
      { nameHe: "סלט אגסים", nameEn: "Pear Salad" },
      { nameHe: "פרנץ' טוסט", nameEn: "French Toast" },
    ],
  },
  {
    categoryId: "mains-pasta",
    products: [
      { nameHe: "לאפה חזה עוף", nameEn: "Chicken Breast Laffa", popular: true },
      { nameHe: "לאפה פילה", nameEn: "Fillet Laffa" },
      { nameHe: "רביולי", nameEn: "Ravioli" },
      { nameHe: "פטוצ'יני", nameEn: "Fettuccine" },
      { nameHe: "לזניה בשר טחון", nameEn: "Ground Beef Lasagna" },
      { nameHe: "פטריות ממולאות", nameEn: "Stuffed Mushrooms" },
      { nameHe: "פסטה שמנת פטריות", nameEn: "Cream Mushroom Pasta", popular: true },
      { nameHe: "פסטה פסטו", nameEn: "Pesto Pasta" },
      { nameHe: "פסטה 27", nameEn: "Pasta 27", popular: true },
      { nameHe: "פוקאצ'ה", nameEn: "Focaccia" },
    ],
  },
  {
    categoryId: "bakery",
    products: [
      { nameHe: "קוראסון חמאה", nameEn: "Butter Croissant" },
      { nameHe: "קוראסון שקדים", nameEn: "Almond Croissant" },
      { nameHe: "קוראסון שוקולד", nameEn: "Chocolate Croissant", popular: true },
      { nameHe: "קוראסון גבינה", nameEn: "Cheese Croissant" },
      { nameHe: "בורקס גבינה / תפוח", nameEn: "Cheese / Apple Boreka" },
      { nameHe: "מאפה קובייה", nameEn: "Cube Pastry" },
      { nameHe: "מאפה פטל", nameEn: "Raspberry Pastry" },
      { nameHe: "מאפה מרובע עם קרם", nameEn: "Square Cream Pastry" },
      { nameHe: "מאפה מעוין + פירות", nameEn: "Diamond Fruit Pastry" },
      { nameHe: "סינבון", nameEn: "Cinnamon Roll", popular: true },
      { nameHe: "מאפה שטרודל", nameEn: "Strudel Pastry" },
      { nameHe: "פאן וייס / פיסטוק", nameEn: "Funnel Cake / Pistachio" },
      { nameHe: "טארט פירות", nameEn: "Fruit Tart", popular: true },
    ],
  },
  {
    categoryId: "desserts",
    products: [
      { nameHe: "רד וולווט", nameEn: "Red Velvet", popular: true },
      { nameHe: "מוס קינדר", nameEn: "Kinder Mousse" },
      { nameHe: "מוס אוראו", nameEn: "Oreo Mousse", popular: true },
      { nameHe: "עוגת גבינה אפויה", nameEn: "Baked Cheesecake" },
      { nameHe: "סאן סבסטיאן", nameEn: "San Sebastian Cheesecake", popular: true },
      { nameHe: "חלאוות אלג'בן", nameEn: "Al-Jabin Halawat" },
      { nameHe: "ליאלי ביירות", nameEn: "Layali Beirut" },
      { nameHe: "טירמיסו", nameEn: "Tiramisu", popular: true },
      { nameHe: "קערת וואפל / קרפ", nameEn: "Waffle / Crepe Bowl" },
      { nameHe: "בראוניז", nameEn: "Brownies" },
      { nameHe: "טרס לצ'ס", nameEn: "Tres Leches" },
      { nameHe: "כוסות קינוח אישיות", nameEn: "Personal Dessert Cups" },
    ],
  },
  {
    categoryId: "ice-cream-yogurt",
    products: [
      { nameHe: "גלידה אמריקאית", nameEn: "American Ice Cream", popular: true },
      { nameHe: "גלידה (ג'לאטו)", nameEn: "Gelato Ice Cream" },
      { nameHe: "יוגורט טבעי", nameEn: "Natural Yogurt" },
      { nameHe: "תוספות ליוגורט", nameEn: "Yogurt Toppings" },
    ],
  },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

function buildPrice(base: number, index: number, offset = 0): number {
  const step = index % 3 === 0 ? 0 : index % 3 === 1 ? 2 : 4;
  return base + step + offset;
}

function buildCost(price: number): number {
  return Math.round(price * 0.38 * 100) / 100;
}

function buildProducts(): MasterMenuProduct[] {
  const products: MasterMenuProduct[] = [];

  for (const group of RAW_MENU) {
    const meta = CATEGORY_META.find((c) => c.id === group.categoryId);
    if (!meta) continue;

    group.products.forEach((raw, index) => {
      const price = buildPrice(meta.basePrice, index, raw.priceOffset ?? 0);
      const cost = buildCost(price);
      const id = `${group.categoryId}-${slugify(raw.nameEn || raw.nameHe)}`;

      products.push({
        id,
        categoryId: group.categoryId,
        nameHe: raw.nameHe,
        nameEn: raw.nameEn,
        description:
          raw.description ??
          `${raw.nameHe} — ${meta.nameHe} · MISHKAT CAFÉ`,
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
