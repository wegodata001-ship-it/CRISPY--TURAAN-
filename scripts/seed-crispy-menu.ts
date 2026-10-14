/**
 * Idempotent CRISPY menu upsert.
 * Does not delete products, categories, modifiers, or orders.
 *
 *   npx tsx scripts/seed-crispy-menu.ts
 *   npx tsx scripts/seed-crispy-menu.ts --apply
 */
import { config } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type DocumentReference, type Firestore } from "firebase-admin/firestore";
import {
  crispyMenuCategories,
  crispyMenuProducts,
  crispyModifierGroups,
  crispyModifierOptions,
  crispyProductModifierLinks,
  CRISPY_MENU_STATS,
} from "../src/data/crispy-menu";

config({ path: resolve(".env") });

const APPLY = process.argv.includes("--apply");
const FALLBACK_KEY = "C:/Users/wegod/Downloads/crispy-d0bf7-firebase-adminsdk-fbsvc-2c2562593e.json";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (parsed.project_id !== "crispy-d0bf7") throw new Error("service account project is not crispy-d0bf7");
    return parsed;
  }
  const email = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (email && key?.includes("BEGIN PRIVATE KEY") && projectId === "crispy-d0bf7") {
    return { project_id: projectId, client_email: email, private_key: key };
  }
  if (existsSync(FALLBACK_KEY)) {
    const parsed = JSON.parse(readFileSync(FALLBACK_KEY, "utf8")) as ServiceAccount;
    if (parsed.project_id !== "crispy-d0bf7") throw new Error("fallback service account project is not crispy-d0bf7");
    return parsed;
  }
  throw new Error("Firebase Admin credentials for crispy-d0bf7 are missing");
}

function db(): Firestore {
  if (getApps().length === 0) {
    const account = loadServiceAccount();
    initializeApp({
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key,
      }),
    });
  }
  return getFirestore();
}

function productPayload(product: (typeof crispyMenuProducts)[number], existing?: FirebaseFirestore.DocumentData) {
  const imageUrl = typeof existing?.imageUrl === "string" && existing.imageUrl.trim()
    ? existing.imageUrl
    : "";
  return {
    nameHe: product.nameAr,
    nameAr: product.nameAr,
    nameEn: product.nameAr,
    descriptionHe: product.descriptionAr,
    descriptionAr: product.descriptionAr,
    descriptionEn: product.descriptionAr,
    categoryId: product.categoryId,
    price: product.price,
    cost: typeof existing?.cost === "number" ? existing.cost : 0,
    profit: product.price - (typeof existing?.cost === "number" ? existing.cost : 0),
    businessType: product.businessType,
    imageUrl,
    currency: "ILS",
    available: product.active ? (typeof existing?.available === "boolean" ? existing.available : true) : false,
    visible: product.active,
    needsReview: product.needsReview,
    popular: existing?.popular === true,
    newProduct: existing?.newProduct === true,
    active: product.active,
    sortOrder: product.sortOrder,
    modifierGroupIds: product.modifierGroupIds,
    createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function backup(store: Firestore) {
  const names = [
    "categories",
    "products",
    "modifier_groups",
    "modifier_options",
    "product_modifier_groups",
  ];
  const snapshot: Record<string, unknown[]> = {};
  for (const name of names) {
    const docs = await store.collection(name).get();
    snapshot[name] = docs.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  mkdirSync("tmp", { recursive: true });
  const file = `tmp/crispy-menu-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(file, JSON.stringify(snapshot));
  return {
    file,
    products: snapshot.products?.length ?? 0,
  };
}

async function main() {
  const store = db();
  const [categories, products, groups, options, links, orderCount] = await Promise.all([
    store.collection("categories").get(),
    store.collection("products").get(),
    store.collection("modifier_groups").get(),
    store.collection("modifier_options").get(),
    store.collection("product_modifier_groups").get(),
    store.collection("orders").count().get(),
  ]);
  const ordersBefore = orderCount.data().count;

  const existingProducts = new Map(products.docs.map((doc) => [doc.id, doc.data()]));
  let createProducts = 0;
  let updateProducts = 0;
  for (const product of crispyMenuProducts) {
    if (existingProducts.has(product.id)) updateProducts += 1;
    else createProducts += 1;
  }

  const report = {
    mode: APPLY ? "apply" : "dry-run",
    project: "crispy-d0bf7",
    categories: CRISPY_MENU_STATS.categories,
    productsInSeed: CRISPY_MENU_STATS.products,
    productsToCreate: createProducts,
    productsToUpdate: updateProducts,
    existingProductsLeftUntouched: products.size - updateProducts,
    modifierGroups: CRISPY_MENU_STATS.modifierGroups,
    modifierOptions: CRISPY_MENU_STATS.modifierOptions,
    productLinks: CRISPY_MENU_STATS.productLinks,
    needsReview: CRISPY_MENU_STATS.needsReview,
    hidden: CRISPY_MENU_STATS.hidden,
    ordersBefore,
    existingCategories: categories.size,
    existingGroups: groups.size,
    existingOptions: options.size,
    existingLinks: links.size,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!APPLY) {
    console.log("Dry run only. Re-run with --apply to write.");
    return;
  }

  const saved = await backup(store);
  console.log(JSON.stringify({ backup: saved.file, backupProducts: saved.products }));

  let batch = store.batch();
  let writes = 0;
  const commit = async () => {
    if (writes === 0) return;
    await batch.commit();
    batch = store.batch();
    writes = 0;
  };
  const queue = async (ref: DocumentReference, data: FirebaseFirestore.DocumentData) => {
    batch.set(ref, data, { merge: true });
    writes += 1;
    if (writes >= 400) await commit();
  };

  for (const category of crispyMenuCategories) {
    const existing = categories.docs.find((doc) => doc.id === category.id)?.data();
    await queue(store.collection("categories").doc(category.id), {
      nameHe: category.nameAr,
      nameAr: category.nameAr,
      nameEn: category.nameAr,
      icon: category.icon,
      imageUrl: typeof existing?.imageUrl === "string" ? existing.imageUrl : "",
      color: "#8B6914",
      sortOrder: category.sortOrder,
      active: true,
      parentId: null,
    });
  }

  for (const product of crispyMenuProducts) {
    await queue(
      store.collection("products").doc(product.id),
      productPayload(product, existingProducts.get(product.id))
    );
  }

  const existingGroups = new Map(groups.docs.map((doc) => [doc.id, doc.data()]));
  for (const group of crispyModifierGroups) {
    const existing = existingGroups.get(group.id);
    await queue(store.collection("modifier_groups").doc(group.id), {
      nameHe: group.nameAr,
      nameAr: group.nameAr,
      nameEn: group.nameAr,
      selectionType: group.selectionType,
      requirement: group.requirement,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      displayType: group.displayType,
      sortOrder: group.sortOrder,
      active: true,
      archived: false,
      createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const existingOptions = new Map(options.docs.map((doc) => [doc.id, doc.data()]));
  for (const option of crispyModifierOptions) {
    const existing = existingOptions.get(option.id);
    await queue(store.collection("modifier_options").doc(option.id), {
      groupId: option.groupId,
      nameHe: option.nameAr,
      nameAr: option.nameAr,
      nameEn: option.nameAr,
      priceDelta: option.priceDelta,
      cost: 0,
      sortOrder: option.sortOrder,
      active: true,
      archived: false,
      createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  for (const link of crispyProductModifierLinks) {
    await queue(store.collection("product_modifier_groups").doc(link.id), {
      productId: link.productId,
      groupId: link.groupId,
      sortOrder: link.sortOrder,
      active: true,
    });
  }

  await commit();

  const verifyProducts = await store.collection("products").where("currency", "==", "ILS").get();
  const seeded = new Map(verifyProducts.docs.map((doc) => [doc.id, doc.data()]));
  const missing = crispyMenuProducts.filter((product) => !seeded.has(product.id));
  const priceMismatches = crispyMenuProducts.filter((product) => seeded.get(product.id)?.price !== product.price);
  const hidden = seeded.get("crispy-family-crispy-17-review");
  const cheese = (await store.collection("modifier_options").doc("opt-sandwich-cheese").get()).data();
  const ordersAfter = (await store.collection("orders").count().get()).data().count;
  const categoryHits = await Promise.all(
    crispyMenuCategories.map(async (category) => (await store.collection("categories").doc(category.id).get()).exists)
  );

  const verification = {
    firestoreReadback: true,
    missingProducts: missing.map((product) => product.id),
    priceMismatches: priceMismatches.map((product) => product.id),
    categoriesPresent: categoryHits.filter(Boolean).length,
    hidden235Active: hidden?.active === false && hidden?.needsReview === true && hidden?.price === 235,
    cheesePrice: cheese?.priceDelta ?? null,
    ordersBefore,
    ordersAfter,
    ordersUnchanged: ordersBefore === ordersAfter,
  };
  console.log(JSON.stringify(verification, null, 2));
  if (
    missing.length ||
    priceMismatches.length ||
    categoryHits.filter(Boolean).length !== 9 ||
    !verification.hidden235Active ||
    cheese?.priceDelta !== 5 ||
    !verification.ordersUnchanged
  ) {
    throw new Error("Firestore readback did not match the CRISPY menu");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "seed failed");
  process.exit(1);
});
