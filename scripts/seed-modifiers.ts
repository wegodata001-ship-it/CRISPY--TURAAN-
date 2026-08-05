import { config } from "dotenv";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

config({ path: resolve(".env") });

function getAdminDb() {
  if (getApps().length === 0) {
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!clientEmail || !privateKey || !projectId) {
      throw new Error("Firebase Admin credentials missing in .env");
    }
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  return getFirestore();
}

async function main() {
  const db = getAdminDb();
  const now = FieldValue.serverTimestamp();

  const groups = [
    {
      key: "size",
      nameHe: "גודל",
      nameAr: "الحجم",
      nameEn: "Size",
      selectionType: "single",
      requirement: "required",
      minSelections: 1,
      maxSelections: 1,
      displayType: "buttons",
      sortOrder: 1,
      options: [
        { nameHe: "קטן", nameAr: "صغير", nameEn: "Small", priceDelta: 0 },
        { nameHe: "בינוני", nameAr: "وسط", nameEn: "Medium", priceDelta: 2 },
        { nameHe: "גדול", nameAr: "كبير", nameEn: "Large", priceDelta: 4 },
      ],
    },
    {
      key: "milk",
      nameHe: "סוג חלב",
      nameAr: "نوع الحليب",
      nameEn: "Milk",
      selectionType: "single",
      requirement: "optional",
      minSelections: 0,
      maxSelections: 1,
      displayType: "chips",
      sortOrder: 2,
      options: [
        { nameHe: "רגיל", nameAr: "عادي", nameEn: "Regular", priceDelta: 0 },
        { nameHe: "סויה", nameAr: "صويا", nameEn: "Soy", priceDelta: 3, kitchenNote: "soy milk" },
        { nameHe: "שקדים", nameAr: "لوز", nameEn: "Almond", priceDelta: 3 },
        { nameHe: "ללא לקטוז", nameAr: "خالي من اللاكتوز", nameEn: "Lactose-free", priceDelta: 2 },
      ],
    },
    {
      key: "ice",
      nameHe: "קרח",
      nameAr: "ثلج",
      nameEn: "Ice",
      selectionType: "single",
      requirement: "optional",
      minSelections: 0,
      maxSelections: 1,
      displayType: "buttons",
      sortOrder: 3,
      options: [
        { nameHe: "בלי קרח", nameAr: "بدون ثلج", nameEn: "No ice", priceDelta: 0, kitchenNote: "no ice" },
        { nameHe: "מעט", nameAr: "قليل", nameEn: "Light ice", priceDelta: 0, kitchenNote: "light ice" },
        { nameHe: "רגיל", nameAr: "عادي", nameEn: "Regular", priceDelta: 0 },
        { nameHe: "הרבה", nameAr: "كثير", nameEn: "Extra ice", priceDelta: 0, kitchenNote: "extra ice" },
      ],
    },
    {
      key: "cup",
      nameHe: "כוס",
      nameAr: "كوب",
      nameEn: "Cup",
      selectionType: "single",
      requirement: "optional",
      minSelections: 0,
      maxSelections: 1,
      displayType: "buttons",
      sortOrder: 4,
      options: [
        { nameHe: "זכוכית", nameAr: "زجاج", nameEn: "Glass", priceDelta: 0 },
        { nameHe: "Take Away", nameAr: "Take Away", nameEn: "Take Away", priceDelta: 0 },
        { nameHe: "חד פעמי", nameAr: "استخدام مرة", nameEn: "Disposable", priceDelta: 0 },
      ],
    },
    {
      key: "extras",
      nameHe: "תוספות",
      nameAr: "إضافات",
      nameEn: "Extras",
      selectionType: "multiple",
      requirement: "optional",
      minSelections: 0,
      maxSelections: 5,
      displayType: "chips",
      sortOrder: 5,
      options: [
        { nameHe: "קצפת", nameAr: "كريمة", nameEn: "Whipped cream", priceDelta: 5 },
        { nameHe: "שוקולד", nameAr: "شوكولاتة", nameEn: "Chocolate", priceDelta: 4 },
        { nameHe: "קרמל", nameAr: "كراميل", nameEn: "Caramel", priceDelta: 4 },
        { nameHe: "אבוקדו", nameAr: "أفوكado", nameEn: "Avocado", priceDelta: 8 },
      ],
    },
  ];

  const groupIds: Record<string, string> = {};
  const optionIds: Record<string, string> = {};

  for (const g of groups) {
    const groupRef = await db.collection("modifier_groups").add({
      nameHe: g.nameHe,
      nameAr: g.nameAr,
      nameEn: g.nameEn,
      selectionType: g.selectionType,
      requirement: g.requirement,
      minSelections: g.minSelections,
      maxSelections: g.maxSelections,
      displayType: g.displayType,
      sortOrder: g.sortOrder,
      active: true,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
    groupIds[g.key] = groupRef.id;
    console.log(`✔ modifier_groups/${groupRef.id} (${g.nameEn})`);

    for (let i = 0; i < g.options.length; i++) {
      const o = g.options[i]!;
      const optRef = await db.collection("modifier_options").add({
        groupId: groupRef.id,
        nameHe: o.nameHe,
        nameAr: o.nameAr,
        nameEn: o.nameEn,
        priceDelta: o.priceDelta,
        cost: 0,
        sortOrder: i + 1,
        kitchenNote: o.kitchenNote ?? "",
        active: true,
        archived: false,
        createdAt: now,
        updatedAt: now,
      });
      optionIds[`${g.key}:${o.nameEn}`] = optRef.id;
    }
  }

  console.log("\n✔ Modifier groups and options seeded.");
  console.log("  Link groups to products via Admin → Product Builder");
  console.log("  Create business rules via Admin → Business Rules");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
