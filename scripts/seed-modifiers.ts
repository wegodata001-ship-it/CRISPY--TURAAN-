/**
 * Idempotent seed for cafe modifier groups + initial selection rules.
 * - Matches existing groups by Hebrew name (and common aliases) — no duplicates
 * - Never deletes existing groups, options, links, or products
 * - Only creates missing options / missing rules
 *
 * Usage: npx tsx scripts/seed-modifiers.ts
 */
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

type SeedOption = {
  nameHe: string;
  nameAr: string;
  nameEn: string;
  priceDelta?: number;
  aliases?: string[];
  kitchenNote?: string;
};

type SeedGroup = {
  key: string;
  nameHe: string;
  nameAr: string;
  nameEn: string;
  aliases: string[];
  selectionType: "single" | "multiple";
  requirement: "required" | "optional";
  minSelections: number;
  maxSelections: number;
  displayType: string;
  sortOrder: number;
  options: SeedOption[];
};

const GROUPS: SeedGroup[] = [
  {
    key: "ice",
    nameHe: "קרח",
    nameAr: "ثلج",
    nameEn: "Ice",
    aliases: ["קרח", "ice"],
    selectionType: "single",
    requirement: "optional",
    minSelections: 0,
    maxSelections: 1,
    displayType: "buttons",
    sortOrder: 1,
    options: [
      { nameHe: "עם קרח", nameAr: "مع ثلج", nameEn: "With ice", aliases: ["רגיל", "עם"] },
      { nameHe: "בלי קרח", nameAr: "بدون ثلج", nameEn: "No ice", aliases: ["ללא קרח", "בלי"], kitchenNote: "no ice" },
      { nameHe: "מעט קרח", nameAr: "قليل ثلج", nameEn: "Light ice", aliases: ["מעט"], kitchenNote: "light ice" },
      { nameHe: "הרבה קרח", nameAr: "كثير ثلج", nameEn: "Extra ice", aliases: ["הרבה"], kitchenNote: "extra ice" },
    ],
  },
  {
    key: "milk",
    nameHe: "סוג חלב",
    nameAr: "نوع الحليب",
    nameEn: "Milk type",
    aliases: ["סוג חלב", "חלב", "בחירת חלב", "milk"],
    selectionType: "single",
    requirement: "optional",
    minSelections: 0,
    maxSelections: 1,
    displayType: "chips",
    sortOrder: 2,
    options: [
      { nameHe: "חלב רגיל", nameAr: "حليب عادي", nameEn: "Regular milk", aliases: ["רגיל", "חלב רגיל"] },
      { nameHe: "חלב 1%", nameAr: "حليب 1%", nameEn: "1% milk", aliases: ["1%", "חלב 1%"] },
      { nameHe: "חלב סויה", nameAr: "حليب صويا", nameEn: "Soy milk", aliases: ["סויה", "חלב סויה"], kitchenNote: "soy milk" },
    ],
  },
  {
    key: "cup",
    nameHe: "סוג כוס",
    nameAr: "نوع الكوب",
    nameEn: "Cup type",
    aliases: ["סוג כוס", "כוס", "cup"],
    selectionType: "single",
    requirement: "optional",
    minSelections: 0,
    maxSelections: 1,
    displayType: "buttons",
    sortOrder: 3,
    options: [
      { nameHe: "כוס זכוכית", nameAr: "كوب زجاج", nameEn: "Glass cup", aliases: ["זכוכית"] },
      { nameHe: "כוס צבעונית", nameAr: "كوب ملون", nameEn: "Colored cup", aliases: ["צבעונית", "צבעוני"] },
      { nameHe: "כוס חד פעמית", nameAr: "كوب لمرة واحدة", nameEn: "Disposable cup", aliases: ["חד פעמי", "Take Away", "חד פעמית"] },
    ],
  },
  {
    key: "sauces",
    nameHe: "רטבים",
    nameAr: "صلصات",
    nameEn: "Sauces",
    aliases: ["רטבים", "רוטב", "sauces"],
    selectionType: "multiple",
    requirement: "optional",
    minSelections: 0,
    maxSelections: 5,
    displayType: "chips",
    sortOrder: 4,
    options: [
      { nameHe: "קטשופ", nameAr: "كاتشب", nameEn: "Ketchup" },
      { nameHe: "מיונז", nameAr: "مايونيز", nameEn: "Mayonnaise" },
      { nameHe: "חרדל", nameAr: "خردل", nameEn: "Mustard" },
    ],
  },
  {
    key: "sandwich",
    nameHe: "תוספות לכריך",
    nameAr: "إضافات للشطيرة",
    nameEn: "Sandwich toppings",
    aliases: ["תוספות לכריך", "תוספות", "extras", "sandwich"],
    selectionType: "multiple",
    requirement: "optional",
    minSelections: 0,
    maxSelections: 8,
    displayType: "chips",
    sortOrder: 5,
    options: [
      { nameHe: "חסה", nameAr: "خس", nameEn: "Lettuce" },
      { nameHe: "עגבניה", nameAr: "بندورة", nameEn: "Tomato" },
      { nameHe: "מלפפון חמוץ", nameAr: "خيار مخلل", nameEn: "Pickle" },
      { nameHe: "בצל", nameAr: "بصل", nameEn: "Onion", priceDelta: 1 },
    ],
  },
];

type RuleSeed = {
  name: string;
  aliases: string[];
  priority: number;
  categoryNameHints: string[];
  showGroupKeys: string[];
  hideGroupKeys: string[];
};

const RULES: RuleSeed[] = [
  {
    name: "משקאות חמים",
    aliases: ["משקאות חמים", "hot drinks", "שתייה חמה"],
    priority: 10,
    categoryNameHints: ["שתייה חמה", "משקאות חמים", "hot", "חם"],
    showGroupKeys: ["milk", "cup"],
    hideGroupKeys: ["ice"],
  },
  {
    name: "משקאות קרים",
    aliases: ["משקאות קרים", "cold drinks", "שתייה קרה"],
    priority: 20,
    categoryNameHints: ["שתייה קרה", "משקאות קרים", "cold", "קר"],
    showGroupKeys: ["ice"],
    hideGroupKeys: [],
  },
  {
    name: "כריכים",
    aliases: ["כריכים", "sandwiches", "כריך"],
    priority: 30,
    categoryNameHints: ["כריכים", "כריך", "sandwich"],
    showGroupKeys: ["sandwich", "sauces"],
    hideGroupKeys: [],
  },
];

function norm(value: string): string {
  return value.trim().toLocaleLowerCase("he");
}

function matchesName(candidate: string, names: string[]): boolean {
  const n = norm(candidate);
  return names.some((name) => norm(name) === n || n.includes(norm(name)) || norm(name).includes(n));
}

async function main() {
  const db = getAdminDb();
  const now = FieldValue.serverTimestamp();

  const report = {
    existingGroups: [] as string[],
    addedGroups: [] as string[],
    reusedGroups: [] as string[],
    addedOptions: [] as string[],
    skippedOptions: [] as string[],
    duplicatesFound: [] as string[],
    addedRules: [] as string[],
    reusedRules: [] as string[],
    missingCategories: [] as string[],
    groupIds: {} as Record<string, string>,
  };

  const groupsSnap = await db.collection("modifier_groups").get();
  const existingGroups = groupsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));

  for (const g of existingGroups) {
    const label = String(g.nameHe || g.nameEn || g.id);
    report.existingGroups.push(label);
  }

  // Detect duplicate groups by normalized Hebrew name
  const byHe = new Map<string, string[]>();
  for (const g of existingGroups) {
    const key = norm(String(g.nameHe || ""));
    if (!key) continue;
    const list = byHe.get(key) ?? [];
    list.push(g.id);
    byHe.set(key, list);
  }
  for (const [name, ids] of byHe) {
    if (ids.length > 1) report.duplicatesFound.push(`${name} (${ids.join(", ")})`);
  }

  for (const seed of GROUPS) {
    const match = existingGroups.find((g) =>
      matchesName(String(g.nameHe || g.nameEn || ""), seed.aliases)
    );

    let groupId: string;
    if (match) {
      groupId = match.id;
      report.reusedGroups.push(`${seed.nameHe} → ${groupId}`);
      // Soft-align canonical name if empty aliases only — do not overwrite custom names aggressively
    } else {
      const ref = await db.collection("modifier_groups").add({
        nameHe: seed.nameHe,
        nameAr: seed.nameAr,
        nameEn: seed.nameEn,
        selectionType: seed.selectionType,
        requirement: seed.requirement,
        minSelections: seed.minSelections,
        maxSelections: seed.maxSelections,
        displayType: seed.displayType,
        sortOrder: seed.sortOrder,
        active: true,
        archived: false,
        createdAt: now,
        updatedAt: now,
      });
      groupId = ref.id;
      report.addedGroups.push(`${seed.nameHe} → ${groupId}`);
    }
    report.groupIds[seed.key] = groupId;

    const optionsSnap = await db
      .collection("modifier_options")
      .where("groupId", "==", groupId)
      .get();
    const existingOptions = optionsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    }));

    for (let i = 0; i < seed.options.length; i++) {
      const opt = seed.options[i]!;
      const aliases = [opt.nameHe, ...(opt.aliases ?? [])];
      const found = existingOptions.find((o) =>
        matchesName(String(o.nameHe || o.nameEn || ""), aliases)
      );
      if (found) {
        report.skippedOptions.push(`${seed.nameHe}/${opt.nameHe}`);
        continue;
      }
      await db.collection("modifier_options").add({
        groupId,
        nameHe: opt.nameHe,
        nameAr: opt.nameAr,
        nameEn: opt.nameEn,
        priceDelta: opt.priceDelta ?? 0,
        cost: 0,
        sortOrder: i + 1,
        kitchenNote: opt.kitchenNote ?? "",
        active: true,
        archived: false,
        createdAt: now,
        updatedAt: now,
      });
      report.addedOptions.push(`${seed.nameHe}/${opt.nameHe}`);
    }
  }

  // Categories for rules
  const categoriesSnap = await db.collection("categories").get();
  const categories = categoriesSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));

  const findCategoryId = (hints: string[]): string | null => {
    const hit = categories.find((c) =>
      matchesName(
        String(c.name_he || c.nameHe || c.name_en || c.nameEn || ""),
        hints
      )
    );
    return hit?.id ?? null;
  };

  const rulesSnap = await db.collection("business_rules").get();
  const existingRules = rulesSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));

  for (const rule of RULES) {
    const existing = existingRules.find((r) =>
      matchesName(String(r.name || ""), rule.aliases)
    );
    if (existing) {
      report.reusedRules.push(rule.name);
      continue;
    }

    const categoryId = findCategoryId(rule.categoryNameHints);
    if (!categoryId) {
      report.missingCategories.push(rule.name);
      console.warn(`⚠ Skip rule "${rule.name}" — no matching category for hints: ${rule.categoryNameHints.join(", ")}`);
      continue;
    }

    const actions: Array<{ type: string; groupId: string }> = [];
    for (const key of rule.showGroupKeys) {
      const groupId = report.groupIds[key];
      if (groupId) actions.push({ type: "show_group", groupId });
    }
    for (const key of rule.hideGroupKeys) {
      const groupId = report.groupIds[key];
      if (groupId) actions.push({ type: "hide_group", groupId });
    }
    if (actions.length === 0) {
      console.warn(`⚠ Skip rule "${rule.name}" — no target groups resolved`);
      continue;
    }

    await db.collection("business_rules").add({
      name: rule.name,
      enabled: true,
      priority: rule.priority,
      conditions: [{ type: "category_is", categoryId }],
      actions,
      createdAt: now,
      updatedAt: now,
    });
    report.addedRules.push(rule.name);
  }

  console.log("\n========== SEED REPORT ==========");
  console.log("Existing groups:", report.existingGroups);
  console.log("Reused groups:", report.reusedGroups);
  console.log("Added groups:", report.addedGroups);
  console.log("Added options:", report.addedOptions);
  console.log("Skipped existing options:", report.skippedOptions.length);
  console.log("Duplicates found:", report.duplicatesFound);
  console.log("Added rules:", report.addedRules);
  console.log("Reused rules:", report.reusedRules);
  console.log("Rules skipped (missing category):", report.missingCategories);
  console.log("=================================\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
