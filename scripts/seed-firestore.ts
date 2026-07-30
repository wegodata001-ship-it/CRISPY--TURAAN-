import { config } from "dotenv";
config({ path: ".env" });

import { silenceFirebaseLogs, withTimeout, isFirestoreDisabledError, FIRESTORE_ENABLE_URL, FIREBASE_CONSOLE_URL } from "./utils";
silenceFirebaseLogs();

import { Timestamp } from "firebase/firestore";
import { categories, banners } from "../src/demo/categories";
import { products } from "../src/demo/products";
import { customers } from "../src/demo/customers";
import { orders } from "../src/demo/orders";
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

async function verifyFirestoreAccess() {
  const db = getDb();
  try {
    const readResult = await withTimeout(
      getDocs(collection(db, COLLECTIONS.categories)),
      15000,
      "Firestore read check"
    );
    const testRef = doc(db, COLLECTIONS.connectionTest, `seed-check-${Date.now()}`);
    await withTimeout(
      setDoc(testRef, { ok: true, at: new Date().toISOString() }),
      15000,
      "Firestore write check"
    );
    await withTimeout(deleteDoc(testRef), 15000, "Firestore delete check");

    if (readResult.empty) {
      process.stdout.write("Firestore connected (empty database — seeding...)\n");
    }
  } catch (error) {
    if (isFirestoreDisabledError(error) || (error instanceof Error && error.message.includes("timed out"))) {
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

async function seed() {
  await verifyFirestoreAccess();
  const db = getDb();
  const now = Timestamp.now();

  const existingCategories = await getDocs(collection(db, COLLECTIONS.categories));
  if (!existingCategories.empty) {
    process.stdout.write("Firestore already has data. Skipping seed.\n");
    return;
  }

  process.stdout.write("Seeding categories...\n");
  for (const cat of categories) {
    await setDoc(doc(db, COLLECTIONS.categories, cat.id), {
      nameAr: cat.name_ar,
      nameEn: cat.name_en,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
      active: true,
    });
  }

  process.stdout.write("Seeding products...\n");
  const productBatch = writeBatch(db);
  for (const product of products) {
    const ref = doc(db, COLLECTIONS.products, product.id);
    productBatch.set(ref, {
      nameAr: product.name_ar,
      nameEn: product.name_en,
      description: product.description,
      categoryId: product.categoryId,
      price: product.price,
      imageUrl: product.image,
      available: product.available,
      popular: product.isPopular,
      newProduct: product.isNew,
      sortOrder: product.sortOrder,
      createdAt: Timestamp.fromDate(new Date(product.createdAt)),
      updatedAt: now,
    });
  }
  await productBatch.commit();

  process.stdout.write("Seeding customers...\n");
  for (const customer of customers) {
    await setDoc(doc(db, COLLECTIONS.customers, customer.id), {
      name: customer.name,
      phone: customer.phone,
      email: `${customer.id}@mishkat.local`,
      address: customer.address,
      favoriteProducts: customer.favoriteItems,
      ordersCount: customer.ordersCount,
      lastOrder: Timestamp.fromDate(new Date(customer.lastOrder)),
      createdAt: now,
    });
  }

  process.stdout.write("Seeding orders...\n");
  for (const order of orders) {
    const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    await setDoc(doc(db, COLLECTIONS.orders, order.id), {
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      items: order.items,
      status: order.status,
      subtotal,
      discount: 0,
      delivery: 0,
      total: order.total,
      paymentMethod: "cash",
      notes: "",
      createdAt: Timestamp.fromDate(new Date(order.createdAt)),
    });
  }

  process.stdout.write("Seeding banners...\n");
  for (let i = 0; i < banners.length; i++) {
    const banner = banners[i]!;
    await setDoc(doc(db, COLLECTIONS.banners, banner.id), {
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.image,
      cta: banner.cta ?? "",
      active: true,
      sortOrder: i + 1,
    });
  }

  process.stdout.write("Seeding settings...\n");
  await setDoc(doc(db, COLLECTIONS.settings, "app"), {
    storeName: "Mishkat Café",
    currency: "ILS",
    updatedAt: now,
  });

  process.stdout.write("Seed completed successfully.\n");
}

seed().catch((err) => {
  process.stderr.write(`Seed failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
