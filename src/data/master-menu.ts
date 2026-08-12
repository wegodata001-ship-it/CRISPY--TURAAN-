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
  hidden: boolean;
  image: string;
  sortOrder: number;
  active: boolean;
  menuCode?: string;
  productType?: string;
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
  id: string;
  nameHe: string;
  nameAr: string;
  nameEn: string;
  descriptionHe: string;
  descriptionAr: string;
  descriptionEn: string;
  price: number;
  hidden: boolean;
  menuCode?: string;
  productType?: string;
  sortOrder: number;
};

type RawCategory = {
  categoryId: string;
  products: RawProduct[];
};

/**
 * MISHKAT CAFÉ — Master Menu (Owner import 2026-08-12)
 * Source: scripts/data/mishkat-products-2026-08.json
 * Numbers in original names are menuCode references, not prices.
 * Prices set to 0 where not provided — to be updated via Admin.
 */
const RAW_MENU: RawCategory[] = [
  {
    categoryId: "breakfast",
    products: [
      { id: "breakfast-personal-breakfast", nameAr: "وجبة فطور شخصية", nameHe: "", nameEn: "", descriptionAr: "تشمل 8 صلصات + بيض عيون/ عجه/ بيض مخلط (مربئ التيلبن, طبات لبنه, لبنه, زبده و عسل, شوكلاته, جبنه فيتا, تونه, زيتون, سلطه عرببه, سلطه عليم לחם", descriptionHe: "", descriptionEn: "", price: 0, hidden: true, menuCode: "8.9.10", productType: "Meal", sortOrder: 1 },
      { id: "breakfast-classic-pancake", nameAr: "بانكيك كلاسي", nameHe: "", nameEn: "", descriptionAr: "اختيار اضافات", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Meal", sortOrder: 2 },
      { id: "breakfast-mini-pancake", nameAr: "ميني بانكيك", nameHe: "", nameEn: "", descriptionAr: "اختيار اضافات", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Meal", sortOrder: 3 },
      { id: "breakfast-belgian-waffle", nameAr: "وافل بلجيكي", nameHe: "", nameEn: "", descriptionAr: "اختيار اضافات", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Meal", sortOrder: 4 },
      { id: "breakfast-french-crepe", nameAr: "كريب فرنسي", nameHe: "", nameEn: "", descriptionAr: "اختيار اضافات", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Meal", sortOrder: 5 },
      { id: "breakfast-shakshuka", nameAr: "", nameHe: "שקשוקה", nameEn: "", descriptionAr: "اضافات (زيتون, לחם)", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "7", sortOrder: 6 },
    ],
  },
  {
    categoryId: "sandwiches",
    products: [
      { id: "sandwiches-omelette-sandwich", nameAr: "ساندويش عجة", nameHe: "", nameEn: "", descriptionAr: "جيبيتا (ابيض /اسود) اضافات سلطه عربي", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "15.16", productType: "Meal", sortOrder: 1 },
      { id: "sandwiches-corned-beef", nameAr: "ساندويش كورنبيف", nameHe: "", nameEn: "", descriptionAr: "صلصة ألفاييم، خس، خيار مخلل وبندورة", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Meal", sortOrder: 2 },
      { id: "sandwiches-smoked-salmon", nameAr: "ساندويش سلمون مدخن", nameHe: "", nameEn: "", descriptionAr: "تشمل شرائح افوكادو وبصل احمر (جيبيتا(ابيض / اسود) كوراسون) سلطه عليم صلصه ايولي شمير ليمون", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "17.18.19", productType: "Meal", sortOrder: 3 },
      { id: "sandwiches-bulgarian-cheese", nameAr: "ساندويش جبنة بلغارية", nameHe: "", nameEn: "", descriptionAr: "صلصة بيستو، بندورة، ريحان وصلصة بلسمي", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Meal", sortOrder: 4 },
      { id: "sandwiches-tuna", nameAr: "ساندويش تونه", nameHe: "", nameEn: "", descriptionAr: "تشمل خيار مكبوس, خسة ليلاك, سلطه عربيه / سلطه عليم جيبيتا (ابيض/ اسود)", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "20.21.22", sortOrder: 5 },
      { id: "sandwiches-halloumi-sandwich", nameAr: "كريخ حلومي", nameHe: "", nameEn: "", descriptionAr: "حلومي, بندورة, جرجير, بيستو, جبنة, شمينت, דبس רימון (جبيتا ابيض/اسود)", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "24.25", sortOrder: 6 },
      { id: "sandwiches-halloumi-croissant", nameAr: "كوراسون حلومي", nameHe: "", nameEn: "", descriptionAr: "حلومي, بندורة, جرجير, بيستو, جبنة, شمينת, דבס רימון", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "26", sortOrder: 7 },
      { id: "sandwiches-classic-toast", nameAr: "توست كلاسي", nameHe: "", nameEn: "", descriptionAr: "صلصة بندورة, جبنة صفراء, زيتون, اضافة مقابل دفع(طونة, فقع, ذرة, فلفل ملون - 4 ش)", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "27", sortOrder: 8 },
      { id: "sandwiches-chicken-tortilla", nameAr: "تورتيا صدر دجاج", nameHe: "", nameEn: "", descriptionAr: "صدر دجاج, طماطم, خس تقدم مع سلطة حسب الاختيار مفرومة/ اوراق, مع طحينة وعمبة", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "36", sortOrder: 9 },
    ],
  },
  {
    categoryId: "salads",
    products: [
      { id: "salads-tabbouleh", nameAr: "تبوله", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "11", sortOrder: 1 },
      { id: "salads-fatoush", nameAr: "فتوش", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "23", sortOrder: 2 },
      { id: "salads-halloumi", nameAr: "سلطة حلومي", nameHe: "", nameEn: "", descriptionAr: "اوراق خضراء, خيار, بندورة شيري, بصل ليلكي, فقع مشوح بصوص ترياكي", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "29", sortOrder: 3 },
      { id: "salads-caesar", nameAr: "سلطة قيصر", nameHe: "", nameEn: "", descriptionAr: "اوراق خس, خبز محمص, جرجير, بارميزان ولوز", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "30", sortOrder: 4 },
      { id: "salads-shrimp", nameAr: "سلطة شريمس", nameHe: "", nameEn: "", descriptionAr: "لبنة, شيري, بصل احمر, واوراق خضراء, مع صوص فينغريت بالثوم والليمون", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "32", sortOrder: 5 },
    ],
  },
  {
    categoryId: "mains-pasta",
    products: [
      { id: "mains-pasta-stuffed-mushrooms", nameAr: "فقع محشو", nameHe: "", nameEn: "", descriptionAr: "محشو بالجبن و البيستو, ويقدم مع صوص كريمي", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "31", sortOrder: 1 },
      { id: "mains-pasta-cheese-ravioli", nameAr: "رافيولي بالجبنة", nameHe: "", nameEn: "", descriptionAr: "يقدم مع صوص شمينت", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "33", sortOrder: 2 },
      { id: "mains-pasta-cheese-ravioli-mushroom", nameAr: "رافيولي بالجبنة مع الفقع", nameHe: "", nameEn: "", descriptionAr: "يقدم مع صوص شمينت وفقع", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "34", sortOrder: 3 },
      { id: "mains-pasta-rose-cheese-ravioli", nameAr: "رافيولي روزيه بالجبنة", nameHe: "", nameEn: "", descriptionAr: "يقدم مع صوص روزيه", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "35", sortOrder: 4 },
      { id: "mains-pasta-fettuccine", nameAr: "فيتوشيني", nameHe: "", nameEn: "", descriptionAr: "تقدم مع صوص كريمة بالفطر (اضافات: بيستو)", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "37", sortOrder: 5 },
      { id: "mains-pasta-fettuccine-rose", nameAr: "فيتوشيني روزيه", nameHe: "", nameEn: "", descriptionAr: "يقدم مع صوص روزيه (اضافات: بيستو)", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "38", sortOrder: 6 },
    ],
  },
  {
    categoryId: "bakery",
    products: [
      { id: "bakery-potato-boreka", nameAr: "بوريكس بطاطا", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 1 },
      { id: "bakery-cheese-boreka", nameAr: "بوريكس جبنة", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 2 },
      { id: "bakery-butter-croissant", nameAr: "كرواسون زبدة", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 3 },
      { id: "bakery-chocolate-croissant", nameAr: "كرواسون شوكولاتة", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 4 },
      { id: "bakery-almond-croissant", nameAr: "كرواسون لوز", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 5 },
      { id: "bakery-pain-suisse-chocolate", nameAr: "بان سويس شوكولاتة", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 6 },
      { id: "bakery-pain-suisse-vanilla", nameAr: "بان سويس فانيل", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 7 },
      { id: "bakery-cinnamon-roll", nameAr: "سينابون قرفة", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 8 },
      { id: "bakery-cheese-pastry", nameAr: "كيس جبنة", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 9 },
      { id: "bakery-square-salad-pastry", nameAr: "", nameHe: "מאפה מרובע במילוי סלט", nameEn: "", descriptionAr: "محشو بندورة شيري وجبنة بלגarية", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "28", sortOrder: 10 },
      { id: "bakery-square-cream-pastry", nameAr: "", nameHe: "מאפה מרובע במילוי קרם פסטיר", nameEn: "", descriptionAr: "محشو كريم باستيير", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "39", sortOrder: 11 },
      { id: "bakery-diamond-pastry", nameAr: "", nameHe: "מאפה מועיין ממולא", nameEn: "", descriptionAr: "", descriptionHe: "מילוי לבחירה", descriptionEn: "", price: 0, hidden: false, menuCode: "40", sortOrder: 12 },
      { id: "bakery-filled-butter-croissant", nameAr: "", nameHe: "קרואסון חמאה במילוי", nameEn: "", descriptionAr: "", descriptionHe: "קרם שקדים", descriptionEn: "", price: 0, hidden: false, menuCode: "41", sortOrder: 13 },
      { id: "bakery-gluten-free-brownies", nameAr: "", nameHe: "בראוניז ללא גלוטין", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "43", sortOrder: 14 },
      { id: "bakery-chocolate-croissant-he", nameAr: "", nameHe: "קרואסון שוקולד", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "42", sortOrder: 15 },
      { id: "bakery-cookies", nameAr: "", nameHe: "עוגיות בראיות", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "44", sortOrder: 16 },
      { id: "bakery-sugar-free-brownies", nameAr: "", nameHe: "בראוניז ללא סוכר", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "43", sortOrder: 17 },
      { id: "bakery-brownies", nameAr: "", nameHe: "ברוניז", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "43", sortOrder: 18 },
    ],
  },
  {
    categoryId: "desserts",
    products: [
      { id: "desserts-crunchy-chocolate-cake", nameAr: "كعكة كرانشي شوكولاتة", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 1 },
      { id: "desserts-english-cake", nameAr: "انجلش كيك", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 2 },
      { id: "desserts-san-sebastian", nameAr: "سان سيباستيان", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 3 },
      { id: "desserts-cheese-crumble-cake", nameAr: "كعكة فتات جبنة", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 4 },
      { id: "desserts-blueberry-cheesecake", nameAr: "كعكة جبنة توت ازرق", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 5 },
      { id: "desserts-sacher-cake", nameAr: "كعكة زاخر", nameHe: "", nameEn: "", descriptionAr: "كعكة شوكولاتة، مع طبقات من المربى، مغطاه بطبقة من الشوكولاتة.", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 6 },
      { id: "desserts-apple-cake", nameAr: "كعكة تفاح", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 7 },
      { id: "desserts-house-cake", nameAr: "كعكة البيت", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 8 },
      { id: "desserts-layali-beirut", nameAr: "ليالي بيروت", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 9 },
      { id: "desserts-tres-leches", nameAr: "تريليتشي", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 10 },
      { id: "desserts-tiramisu", nameAr: "تيراميسو", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 11 },
      { id: "desserts-creme-brulee-classic", nameAr: "كريم بروليه كلاسي", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 12 },
      { id: "desserts-creme-brulee-pistachio", nameAr: "كريم بروليه فستق", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 13 },
      { id: "desserts-creme-brulee-pannacotta", nameAr: "كريم بروليه باناكوتا", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 14 },
      { id: "desserts-red-velvet", nameAr: "ريد فيلفيت", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 15 },
      { id: "desserts-ferrero-rocher-cake", nameAr: "كعكة فيريرو روشيه", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 16 },
      { id: "desserts-souffle", nameAr: "سوفليه", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 17 },
      { id: "desserts-chocolate-earthquake", nameAr: "", nameHe: "רעידת שוקולד", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "45", sortOrder: 18 },
      { id: "desserts-alfajores", nameAr: "", nameHe: "אלפאחורס", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "46", sortOrder: 19 },
      { id: "desserts-cedar-cake", nameAr: "", nameHe: "עוגת קידר", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "47", sortOrder: 20 },
      { id: "desserts-lotus-cake", nameAr: "", nameHe: "עוגת לוטוס", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "48", sortOrder: 21 },
      { id: "desserts-salty-bagel-cake", nameAr: "", nameHe: "עוגת ביגל מלוח", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "48", sortOrder: 22 },
      { id: "desserts-tricolor-cake", nameAr: "", nameHe: "עוגת טריקולד", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "49", sortOrder: 23 },
      { id: "desserts-red-pipette", nameAr: "", nameHe: "רד פיפית", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "50", sortOrder: 24 },
      { id: "desserts-ferrero-cake-he", nameAr: "", nameHe: "עוגת פירירו", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "51", sortOrder: 25 },
      { id: "desserts-raffaello-cake", nameAr: "", nameHe: "עוגת רפאילו", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "52", sortOrder: 26 },
    ],
  },
  {
    categoryId: "hot-drinks",
    products: [
      { id: "hot-drinks-nes-cafe", nameAr: "", nameHe: "נס קפה", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "2", sortOrder: 1 },
      { id: "hot-drinks-hafuch", nameAr: "", nameHe: "הפוך", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "1", sortOrder: 2 },
      { id: "hot-drinks-ilan", nameAr: "", nameHe: "אילן", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "3", sortOrder: 3 },
      { id: "hot-drinks-macchiato", nameAr: "", nameHe: "מקיאטו", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "4", sortOrder: 4 },
      { id: "hot-drinks-hot-chocolate", nameAr: "", nameHe: "שוקו חם", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "6", sortOrder: 5 },
    ],
  },
  {
    categoryId: "ice-drinks",
    products: [
      { id: "ice-drinks-mojito", nameAr: "موهيتو", nameHe: "", nameEn: "", descriptionAr: "اختيار اساس", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Meal", sortOrder: 1 },
      { id: "ice-drinks-iced-coffee", nameAr: "", nameHe: "קפה קר", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "5", sortOrder: 2 },
      { id: "ice-drinks-cold-chocolate", nameAr: "شوكو بارد", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "14", sortOrder: 3 },
      { id: "ice-drinks-mojito-watermelon", nameAr: "", nameHe: "מוחיטו אבטיח", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "53", sortOrder: 4 },
      { id: "ice-drinks-mojito-blue-curacao", nameAr: "", nameHe: "מוחיטו בלו קראסאן", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "54", sortOrder: 5 },
      { id: "ice-drinks-mojito-blueberry", nameAr: "", nameHe: "מוחיטו בלו בירי", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "55", sortOrder: 6 },
      { id: "ice-drinks-mojito-strawberry", nameAr: "", nameHe: "מוחיטו תות", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "56", sortOrder: 7 },
      { id: "ice-drinks-mojito-classic", nameAr: "", nameHe: "מוחיטו", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "57", sortOrder: 8 },
    ],
  },
  {
    categoryId: "fresh-juices",
    products: [
      { id: "fresh-juices-mix-juice", nameAr: "عصير ميكس", nameHe: "", nameEn: "", descriptionAr: "اختيار الميكس", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Meal", sortOrder: 1 },
      { id: "fresh-juices-lemonade", nameAr: "ليمونادة", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "12", productType: "Item", sortOrder: 2 },
      { id: "fresh-juices-ice-lemon-mint", nameAr: "ايس ليمون نعنع", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 3 },
      { id: "fresh-juices-orange", nameAr: "عصير برتقال", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, menuCode: "13", productType: "Item", sortOrder: 4 },
      { id: "fresh-juices-carrot", nameAr: "عصير جزر", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 5 },
      { id: "fresh-juices-apple", nameAr: "عصير تفاح", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 6 },
      { id: "fresh-juices-apple-carrot", nameAr: "عصير تفاح وجزر", nameHe: "", nameEn: "", descriptionAr: "", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Item", sortOrder: 7 },
    ],
  },
  {
    categoryId: "shakes",
    products: [
      { id: "shakes-milkshake", nameAr: "ميلك شيك", nameHe: "", nameEn: "", descriptionAr: "اختيار طعم", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Meal", sortOrder: 1 },
    ],
  },
  {
    categoryId: "ice-cream-yogurt",
    products: [
      { id: "ice-cream-2-scoops", nameAr: "2 كرات بوظة", nameHe: "", nameEn: "", descriptionAr: "اختيار طعم", descriptionHe: "", descriptionEn: "", price: 0, hidden: false, productType: "Meal", sortOrder: 1 },
    ],
  },
];

function buildProducts(): MasterMenuProduct[] {
  const products: MasterMenuProduct[] = [];

  for (const group of RAW_MENU) {
    const meta = CATEGORY_META.find((c) => c.id === group.categoryId);
    if (!meta) continue;

    for (const raw of group.products) {
      products.push({
        id: raw.id,
        categoryId: group.categoryId,
        nameHe: raw.nameHe,
        nameAr: raw.nameAr,
        nameEn: raw.nameEn,
        descriptionHe: raw.descriptionHe,
        descriptionAr: raw.descriptionAr,
        descriptionEn: raw.descriptionEn,
        price: raw.price,
        cost: 0,
        profit: 0,
        businessType: meta.businessType,
        popular: false,
        available: true,
        hidden: raw.hidden,
        image: "",
        sortOrder: raw.sortOrder,
        active: !raw.hidden,
        menuCode: raw.menuCode,
        productType: raw.productType,
      });
    }
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
