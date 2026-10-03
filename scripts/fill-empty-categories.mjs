import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  Timestamp,
} from "firebase/firestore";

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

const CRISPY_CATEGORIES = [
  { idHint: "crispy-chicken", nameAr: "دجاج كريسبي", nameHe: "עוף קריספי", nameEn: "Crispy Chicken", icon: "drumstick", sortOrder: 1 },
  { idHint: "schnitzel", nameAr: "شنيتسل", nameHe: "שניצל", nameEn: "Schnitzel", icon: "utensils", sortOrder: 2 },
  { idHint: "burgers", nameAr: "برغر", nameHe: "ברגרים", nameEn: "Burgers", icon: "sandwich", sortOrder: 3 },
  { idHint: "meals", nameAr: "وجبات", nameHe: "ארוחות", nameEn: "Meals", icon: "package", sortOrder: 4 },
  { idHint: "sides", nameAr: "إضافات", nameHe: "תוספות", nameEn: "Sides", icon: "fries", sortOrder: 5 },
  { idHint: "drinks", nameAr: "مشروبات", nameHe: "שתייה", nameEn: "Drinks", icon: "cup-soda", sortOrder: 6 },
  { idHint: "sauces", nameAr: "صلصات", nameHe: "רטבים", nameEn: "Sauces", icon: "droplet", sortOrder: 7 },
  { idHint: "kids", nameAr: "وجبات أطفال", nameHe: "ארוחות ילדים", nameEn: "Kids Meals", icon: "baby", sortOrder: 8 },
];

function blob(cat) {
  return `${cat.nameAr ?? ""} ${cat.nameHe ?? ""} ${cat.nameEn ?? ""} ${cat.id ?? ""}`.toLowerCase();
}

function sampleForCategory(cat) {
  const text = blob(cat);
  if (/برغر|burger|ברגר/.test(text)) {
    return {
      nameAr: "كريسبي تشيكن برغر",
      nameHe: "ברגר עוף קריספי",
      nameEn: "Crispy Chicken Burger",
      descriptionAr: "برغر دجاج مقرمش مع خس وخس وصلصة خاصة.",
      descriptionHe: "ברגר עוף קריספי עם חסה, עגבנייה ורוטב הבית.",
      descriptionEn: "Crispy chicken burger with lettuce, tomato, and house sauce.",
      price: 45,
      businessType: "food",
    };
  }
  if (/شنيتسل|schnitzel|שניצל/.test(text)) {
    return {
      nameAr: "شنيتسل دجاج",
      nameHe: "שניצל עוף",
      nameEn: "Chicken Schnitzel",
      descriptionAr: "شنيتسل دجاج مقرمش مع ليمون.",
      descriptionHe: "שניצל עוף זהוב ופריך, מוגש עם לימון.",
      descriptionEn: "Golden crispy chicken schnitzel served with lemon.",
      price: 48,
      businessType: "food",
    };
  }
  if (/كريسبي|קריספי|crispy|دجاج|עוף|chicken/.test(text) && !/برغر|burger|ברגר/.test(text)) {
    return {
      nameAr: "قطع دجاج كريسبي",
      nameHe: "רצועות עוף קריספי",
      nameEn: "Crispy Chicken Strips",
      descriptionAr: "قطع دجاج طازجة مقلية حتى تصبح ذهبية ومقرمشة.",
      descriptionHe: "רצועות עוף טריות מטוגנות לזהוב ופריך.",
      descriptionEn: "Fresh chicken strips fried until golden and crispy.",
      price: 42,
      businessType: "food",
    };
  }
  if (/طفل|kids|ילד|أطفال/.test(text)) {
    return {
      nameAr: "وجبة أطفال كريسبي",
      nameHe: "ארוחת ילדים קריספי",
      nameEn: "Kids Crispy Meal",
      descriptionAr: "قطع دجاج صغيرة مع بطاطا وصلصة.",
      descriptionHe: "נתחי עוף קטנים עם צ'יפס ורוטב.",
      descriptionEn: "Small crispy chicken pieces with fries and sauce.",
      price: 32,
      businessType: "food",
    };
  }
  if (/وجبه|وجبات|meal|ארוח|קומבו|combo/.test(text)) {
    return {
      nameAr: "وجبة كريسبي",
      nameHe: "ארוחת קריספי",
      nameEn: "Crispy Meal",
      descriptionAr: "دجاج كريسبي مع بطاطا ومشروب.",
      descriptionHe: "עוף קריספי עם צ'יפס ושתייה.",
      descriptionEn: "Crispy chicken with fries and a drink.",
      price: 59,
      businessType: "food",
    };
  }
  if (/بطاطا|chips|צ'יפס|fries|إضاف|תוספ|side/.test(text)) {
    return {
      nameAr: "بطاطا مقلية",
      nameHe: "צ'יפס",
      nameEn: "French Fries",
      descriptionAr: "بطاطا ذهبية مقرمشة.",
      descriptionHe: "צ'יפס זהוב ופריך.",
      descriptionEn: "Golden crispy french fries.",
      price: 14,
      businessType: "food",
    };
  }
  if (/كوكا|cola|קולה|مشروب|שתייה|drink|غاز|מוגז/.test(text)) {
    return {
      nameAr: "كوكا كولا",
      nameHe: "קוקה קולה",
      nameEn: "Coca-Cola",
      descriptionAr: "مشروب غازي بارد.",
      descriptionHe: "שתייה קלה קרה.",
      descriptionEn: "Ice-cold soft drink.",
      price: 8,
      businessType: "beverage",
    };
  }
  if (/صوص|صلص|רוטב|sauce/.test(text)) {
    return {
      nameAr: "صوص ثوم",
      nameHe: "רוטב שום",
      nameEn: "Garlic Sauce",
      descriptionAr: "صوص ثوم كريمي.",
      descriptionHe: "רוטב שום קרמי.",
      descriptionEn: "Creamy garlic sauce.",
      price: 5,
      businessType: "food",
    };
  }
  if (/سلطة|סלט|salad/.test(text)) {
    return {
      nameAr: "سلطة كريسبي",
      nameHe: "סלט קריספי",
      nameEn: "Crispy Salad",
      descriptionAr: "خضار طازجة مع قطع دجاج كريسبي.",
      descriptionHe: "ירקות טריים עם רצועות עוף קריספי.",
      descriptionEn: "Fresh vegetables with crispy chicken strips.",
      price: 38,
      businessType: "food",
    };
  }
  const ar = cat.nameAr || cat.nameHe || "طبق اليوم";
  const he = cat.nameHe || cat.nameAr || "מנת היום";
  const en = cat.nameEn || "House Special";
  return {
    nameAr: `طبق ${ar}`,
    nameHe: `מנת ${he}`,
    nameEn: `${en} Plate`,
    descriptionAr: `طبق مميز من قسم ${ar}.`,
    descriptionHe: `מנה מומלצת ממחלקת ${he}.`,
    descriptionEn: `A house favorite from ${en}.`,
    price: 36,
    businessType: "food",
  };
}

function categoryHasItem(cat, products) {
  return products.some(
    (p) => p.categoryId === cat.id || p.subcategoryId === cat.id
  );
}

await signInWithEmailAndPassword(
  auth,
  process.env.ADMIN_BOOTSTRAP_EMAIL,
  process.env.ADMIN_BOOTSTRAP_PASSWORD
);

const categorySnap = await getDocs(collection(db, "categories"));
const productSnap = await getDocs(collection(db, "products"));

let categories = categorySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
let products = productSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

const createdCategories = [];
if (categories.length === 0) {
  for (const cat of CRISPY_CATEGORIES) {
    const ref = await addDoc(collection(db, "categories"), {
      nameHe: cat.nameHe,
      nameAr: cat.nameAr,
      nameEn: cat.nameEn,
      icon: cat.icon,
      imageUrl: "",
      color: "#D71920",
      sortOrder: cat.sortOrder,
      active: true,
      parentId: null,
    });
    createdCategories.push({ id: ref.id, ...cat });
  }
  categories = createdCategories.map((c) => ({
    id: c.id,
    nameHe: c.nameHe,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    parentId: null,
  }));
}

const createdItems = [];
for (const cat of categories) {
  if (categoryHasItem(cat, products)) continue;
  const sample = sampleForCategory(cat);
  const parentId = cat.parentId || null;
  const now = Timestamp.now();
  const payload = {
    nameHe: sample.nameHe,
    nameAr: sample.nameAr,
    nameEn: sample.nameEn,
    descriptionHe: sample.descriptionHe,
    descriptionAr: sample.descriptionAr,
    descriptionEn: sample.descriptionEn,
    categoryId: parentId || cat.id,
    subcategoryId: parentId ? cat.id : null,
    price: sample.price,
    cost: 0,
    profit: sample.price,
    businessType: sample.businessType,
    imageUrl: "",
    available: true,
    popular: false,
    newProduct: true,
    active: true,
    sortOrder: 1,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(collection(db, "products"), payload);
  createdItems.push({
    categoryId: cat.id,
    categoryAr: cat.nameAr,
    categoryHe: cat.nameHe,
    item: sample.nameAr,
    itemHe: sample.nameHe,
    price: sample.price,
    productId: ref.id,
  });
  products.push({ id: ref.id, ...payload });
}

const emptyAfter = categories.filter((c) => !categoryHasItem(c, products));
const withItems = categories.length - emptyAfter.length;

console.log(
  JSON.stringify(
    {
      seededCategoriesBecauseEmpty: createdCategories.length > 0,
      categoriesCreated: createdCategories.map((c) => c.nameAr),
      TOTAL_CATEGORIES: categories.length,
      CATEGORIES_WITH_ITEMS: withItems,
      EMPTY_CATEGORIES: emptyAfter.length,
      ITEMS_CREATED: createdItems,
    },
    null,
    2
  )
);
