import { config } from "dotenv";
config({ path: ".env" });

import {
  silenceFirebaseLogs,
  withTimeout,
  isFirestoreDisabledError,
  FIRESTORE_ENABLE_URL,
  FIREBASE_CONSOLE_URL,
} from "./utils";
silenceFirebaseLogs();

import { Timestamp as ClientTimestamp } from "firebase/firestore";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "../src/lib/firebase";
import { COLLECTIONS } from "../src/lib/firebase/collections";
import {
  masterMenuCategories,
  masterMenuProducts,
  MASTER_MENU_STATS,
} from "../src/data/master-menu";

const forceImport = process.argv.includes("--force");

function hasAdminCredentials(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) return true;
  const email = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return !!(email && key?.includes("BEGIN PRIVATE KEY"));
}

async function getAdminDb() {
  const { getAdminDb } = await import("../src/lib/firebase/admin");
  return getAdminDb();
}

async function getClientDb() {
  return getDb();
}

async function verifyFirestoreAccess(useAdmin: boolean) {
  if (useAdmin) {
    const db = await getAdminDb();
    await withTimeout(db.collection(COLLECTIONS.categories).limit(1).get(), 15000, "Admin read");
    const testRef = db.collection(COLLECTIONS.connectionTest).doc(`seed-check-${Date.now()}`);
    await withTimeout(testRef.set({ ok: true }), 15000, "Admin write");
    await withTimeout(testRef.delete(), 15000, "Admin delete");
    return;
  }

  const db = await getClientDb();
  try {
    await withTimeout(getDocs(collection(db, COLLECTIONS.categories)), 15000, "Firestore read check");
    const testRef = doc(db, COLLECTIONS.connectionTest, `seed-check-${Date.now()}`);
    await withTimeout(setDoc(testRef, { ok: true, at: new Date().toISOString() }), 15000, "Firestore write check");
    await withTimeout(deleteDoc(testRef), 15000, "Firestore delete check");
  } catch (error) {
    if (
      isFirestoreDisabledError(error) ||
      (error instanceof Error &&
        (error.message.includes("timed out") || error.message.includes("permission")))
    ) {
      process.stderr.write(
        `\nCannot write to Firestore for project 'mshkah'.\n\n` +
          `Option A — Admin SDK (recommended for seed):\n` +
          `  Set FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY in .env\n\n` +
          `Option B — Client SDK:\n` +
          `  1. Enable API: ${FIRESTORE_ENABLE_URL}\n` +
          `  2. Create Firestore database: ${FIREBASE_CONSOLE_URL}\n` +
          `  3. Deploy rules: npx firebase deploy --only firestore:rules,storage\n` +
          `  4. Re-run: npm run seed\n\n`
      );
      process.exit(1);
    }
    throw error;
  }
}

async function clearCollectionAdmin(name: string) {
  const db = await getAdminDb();
  const snapshot = await db.collection(name).get();
  if (snapshot.empty) return;

  let batch = db.batch();
  let count = 0;
  for (const d of snapshot.docs) {
    batch.delete(d.ref);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
}

async function clearCollectionClient(name: string) {
  const db = getDb();
  const snapshot = await getDocs(collection(db, name));
  if (snapshot.empty) return;

  let batch = writeBatch(db);
  let count = 0;
  for (const d of snapshot.docs) {
    batch.delete(d.ref);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  await batch.commit();
}

async function importMasterMenu() {
  const useAdmin = hasAdminCredentials();
  process.stdout.write(useAdmin ? "Using Firebase Admin SDK for seed...\n" : "Using client SDK for seed...\n");

  await verifyFirestoreAccess(useAdmin);
  const now = useAdmin
    ? (await import("firebase-admin/firestore")).Timestamp.now()
    : ClientTimestamp.now();

  let hasExisting = false;
  if (useAdmin) {
    const db = await getAdminDb();
    const existing = await db.collection(COLLECTIONS.categories).limit(1).get();
    hasExisting = !existing.empty;
  } else {
    const db = await getClientDb();
    const existing = await getDocs(collection(db, COLLECTIONS.categories));
    hasExisting = !existing.empty;
  }

  if (hasExisting && !forceImport) {
    process.stdout.write("Firestore already has data. Run with --force to replace with master menu.\n");
    return;
  }

  if (forceImport) {
    process.stdout.write("Clearing existing product catalog data (preserving banners, orders, customers)...\n");
    if (useAdmin) {
      await clearCollectionAdmin(COLLECTIONS.products);
      await clearCollectionAdmin(COLLECTIONS.categories);
    } else {
      await clearCollectionClient(COLLECTIONS.products);
      await clearCollectionClient(COLLECTIONS.categories);
    }
  }

  process.stdout.write(`Importing ${MASTER_MENU_STATS.categories} categories...\n`);

  if (useAdmin) {
    const db = await getAdminDb();
    for (const cat of masterMenuCategories) {
      await db.collection(COLLECTIONS.categories).doc(cat.id).set({
        nameHe: cat.nameHe,
        nameAr: cat.nameAr,
        nameEn: cat.nameEn,
        icon: cat.icon,
        imageUrl: cat.image,
        color: "#8B6914",
        sortOrder: cat.sortOrder,
        active: cat.active,
      });
    }

    process.stdout.write(`Importing ${MASTER_MENU_STATS.products} products...\n`);
    let batch = db.batch();
    let count = 0;
    for (const product of masterMenuProducts) {
      const ref = db.collection(COLLECTIONS.products).doc(product.id);
      const doc: Record<string, unknown> = {
        nameHe: product.nameHe,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        descriptionHe: product.descriptionHe,
        descriptionAr: product.descriptionAr,
        descriptionEn: product.descriptionEn,
        categoryId: product.categoryId,
        price: product.price,
        cost: product.cost,
        profit: product.profit,
        businessType: product.businessType,
        imageUrl: product.image,
        available: product.available,
        hidden: product.hidden,
        popular: product.popular,
        newProduct: false,
        active: product.active,
        sortOrder: product.sortOrder,
        createdAt: now,
        updatedAt: now,
      };
      if (product.menuCode) doc.menuCode = product.menuCode;
      if (product.productType) doc.productType = product.productType;
      batch.set(ref, doc);
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    await batch.commit();

    await db.collection(COLLECTIONS.settings).doc("app").set({
      storeName: "MISHKAT CAFÉ",
      currency: "ILS",
      menuVersion: "catalog-reset-2026-08",
      categoriesCount: MASTER_MENU_STATS.categories,
      productsCount: MASTER_MENU_STATS.products,
      updatedAt: now,
    }, { merge: true });
  } else {
    const db = await getClientDb();

    for (const cat of masterMenuCategories) {
      await setDoc(doc(db, COLLECTIONS.categories, cat.id), {
        nameHe: cat.nameHe,
        nameAr: cat.nameAr,
        nameEn: cat.nameEn,
        icon: cat.icon,
        imageUrl: cat.image,
        color: "#8B6914",
        sortOrder: cat.sortOrder,
        active: cat.active,
      });
    }

    process.stdout.write(`Importing ${MASTER_MENU_STATS.products} products...\n`);
    let batch = writeBatch(db);
    let count = 0;
    for (const product of masterMenuProducts) {
      const ref = doc(db, COLLECTIONS.products, product.id);
      const data: Record<string, unknown> = {
        nameHe: product.nameHe,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        descriptionHe: product.descriptionHe,
        descriptionAr: product.descriptionAr,
        descriptionEn: product.descriptionEn,
        categoryId: product.categoryId,
        price: product.price,
        cost: product.cost,
        profit: product.profit,
        businessType: product.businessType,
        imageUrl: product.image,
        available: product.available,
        hidden: product.hidden,
        popular: product.popular,
        newProduct: false,
        active: product.active,
        sortOrder: product.sortOrder,
        createdAt: now,
        updatedAt: now,
      };
      if (product.menuCode) data.menuCode = product.menuCode;
      if (product.productType) data.productType = product.productType;
      batch.set(ref, data);
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    }
    await batch.commit();

    await setDoc(doc(db, COLLECTIONS.settings, "app"), {
      storeName: "MISHKAT CAFÉ",
      currency: "ILS",
      menuVersion: "catalog-reset-2026-08",
      categoriesCount: MASTER_MENU_STATS.categories,
      productsCount: MASTER_MENU_STATS.products,
      updatedAt: now,
    });
  }

  process.stdout.write("\n✔ Master menu import completed\n");
  process.stdout.write(`  Categories: ${MASTER_MENU_STATS.categories}\n`);
  process.stdout.write(`  Products:   ${MASTER_MENU_STATS.products}\n`);
  process.stdout.write(`  Popular:    ${MASTER_MENU_STATS.popular}\n`);
}


importMasterMenu().catch((err) => {
  process.stderr.write(`Import failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
