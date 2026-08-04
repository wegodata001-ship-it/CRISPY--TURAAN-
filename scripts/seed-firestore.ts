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

import { Timestamp } from "firebase/firestore";
import {
  masterMenuCategories,
  masterMenuProducts,
  MASTER_MENU_STATS,
} from "../src/data/master-menu";
import { getDb } from "../src/lib/firebase";
import { COLLECTIONS } from "../src/lib/firebase/collections";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

const forceImport = process.argv.includes("--force");

async function verifyFirestoreAccess() {
  const db = getDb();
  try {
    await withTimeout(
      getDocs(collection(db, COLLECTIONS.categories)),
      15000,
      "Firestore read check"
    );
    const testRef = doc(
      db,
      COLLECTIONS.connectionTest,
      `seed-check-${Date.now()}`
    );
    await withTimeout(
      setDoc(testRef, { ok: true, at: new Date().toISOString() }),
      15000,
      "Firestore write check"
    );
    await withTimeout(deleteDoc(testRef), 15000, "Firestore delete check");
  } catch (error) {
    if (
      isFirestoreDisabledError(error) ||
      (error instanceof Error && error.message.includes("timed out"))
    ) {
      process.stderr.write(
        `\nCannot write to Firestore for project 'mshkah'.\n\n` +
          `Steps:\n` +
          `1. Enable API: ${FIRESTORE_ENABLE_URL}\n` +
          `2. Create Firestore database: ${FIREBASE_CONSOLE_URL}\n` +
          `3. Deploy rules: npx firebase deploy --only firestore:rules,storage\n` +
          `4. Re-run: npm run seed\n\n`
      );
      process.exit(1);
    }
    throw error;
  }
}

async function clearCollection(name: string) {
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
  await verifyFirestoreAccess();
  const db = getDb();
  const now = Timestamp.now();

  const existing = await getDocs(collection(db, COLLECTIONS.categories));
  if (!existing.empty && !forceImport) {
    process.stdout.write(
      "Firestore already has data. Run with --force to replace with master menu.\n"
    );
    return;
  }

  if (forceImport) {
    process.stdout.write("Clearing existing catalog data...\n");
    await clearCollection(COLLECTIONS.products);
    await clearCollection(COLLECTIONS.categories);
    await clearCollection(COLLECTIONS.banners);
  }

  process.stdout.write(
    `Importing ${MASTER_MENU_STATS.categories} categories...\n`
  );
  for (const cat of masterMenuCategories) {
    await setDoc(doc(db, COLLECTIONS.categories, cat.id), {
      nameAr: cat.nameHe,
      nameEn: cat.nameEn,
      icon: cat.icon,
      imageUrl: cat.image,
      sortOrder: cat.sortOrder,
      active: cat.active,
    });
  }

  process.stdout.write(
    `Importing ${MASTER_MENU_STATS.products} products...\n`
  );
  let batch = writeBatch(db);
  let count = 0;

  for (const product of masterMenuProducts) {
    const ref = doc(db, COLLECTIONS.products, product.id);
    batch.set(ref, {
      nameAr: product.nameHe,
      nameEn: product.nameEn,
      description: product.description,
      categoryId: product.categoryId,
      price: product.price,
      cost: product.cost,
      profit: product.profit,
      businessType: product.businessType,
      imageUrl: product.image,
      available: product.available,
      popular: product.popular,
      newProduct: false,
      active: product.active,
      sortOrder: product.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  await batch.commit();

  process.stdout.write("Creating default banners...\n");
  const banners = [
    {
      id: "promo-shakshuka",
      title: "ארוחת בוקר מיוחדת",
      subtitle: "שקשוקה טרייה מהמטבח — מומלץ!",
      imageUrl:
        "https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?w=1200&q=80",
      cta: "Order Now",
      sortOrder: 1,
    },
    {
      id: "promo-shakes",
      title: "שייקים ביתיים",
      subtitle: "קינדר · אוראו · פיסטוק — הפופולריים ביותר",
      imageUrl:
        "https://images.unsplash.com/photo-1505252587541-4a1d2f5f656e?w=1200&q=80",
      cta: "Try Now",
      sortOrder: 2,
    },
    {
      id: "promo-coffee",
      title: "קפה איכותי",
      subtitle: "אייס ספאניש לאטה · קפוצ'ינו · אמריקאנו",
      imageUrl:
        "https://images.unsplash.com/photo-1461023058943-f07a80b96202?w=1200&q=80",
      cta: "Explore Menu",
      sortOrder: 3,
    },
  ];

  for (const banner of banners) {
    await setDoc(doc(db, COLLECTIONS.banners, banner.id), {
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.imageUrl,
      cta: banner.cta,
      active: true,
      sortOrder: banner.sortOrder,
    });
  }

  await setDoc(doc(db, COLLECTIONS.settings, "app"), {
    storeName: "MISHKAT CAFÉ",
    currency: "ILS",
    menuVersion: "master-menu-v1",
    categoriesCount: MASTER_MENU_STATS.categories,
    productsCount: MASTER_MENU_STATS.products,
    updatedAt: now,
  });

  process.stdout.write("\n✔ Master menu import completed\n");
  process.stdout.write(`  Categories: ${MASTER_MENU_STATS.categories}\n`);
  process.stdout.write(`  Products:   ${MASTER_MENU_STATS.products}\n`);
  process.stdout.write(`  Popular:    ${MASTER_MENU_STATS.popular}\n`);
}

importMasterMenu().catch((err) => {
  process.stderr.write(
    `Import failed: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exit(1);
});
