import { config } from "dotenv";
config({ path: ".env" });

import { silenceFirebaseLogs, withTimeout, isFirestoreDisabledError, FIRESTORE_ENABLE_URL, FIREBASE_CONSOLE_URL } from "./utils";
silenceFirebaseLogs();

import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { getDb, isFirebaseInitialized, getFirebaseAuth, getFirebaseStorage } from "../src/lib/firebase";
import { validateFirebaseEnv } from "../src/lib/firebase/env";
import { COLLECTIONS } from "../src/lib/firebase/collections";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../src/services/categoryService";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../src/services/productService";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../src/services/customerService";
import {
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
} from "../src/services/orderService";
import { uploadTestImage, deleteImage } from "../src/services/storageService";

interface AuditCheck {
  name: string;
  passed: boolean;
  message: string;
  durationMs?: number;
}

const checks: AuditCheck[] = [];
const perf: Record<string, number> = {};

function record(name: string, passed: boolean, message: string, durationMs?: number) {
  checks.push({ name, passed, message, durationMs });
}

function time(label: string, start: number) {
  perf[label] = Date.now() - start;
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testInitialization() {
  const env = validateFirebaseEnv();
  record(
    "ENV Variables",
    env.valid,
    env.valid ? "All required env variables present" : `Missing: ${env.missing.join(", ")}`
  );
  if (!env.valid) return false;

  const start = Date.now();
  try {
    isFirebaseInitialized();
    getDb();
    getFirebaseStorage();
    getFirebaseAuth();
    time("firebaseInit", start);
    record("Firebase Initialization", true, "App, Firestore, Storage, Auth initialized", perf.firebaseInit);
    return true;
  } catch (error) {
    record(
      "Firebase Initialization",
      false,
      error instanceof Error ? error.message : "Initialization failed"
    );
    return false;
  }
}

async function testFirestoreRead() {
  const catStart = Date.now();
  try {
    const categories = await withTimeout(getCategories(), 10000, "getCategories");
    time("loadCategories", catStart);
    record(
      "Firestore Read - Categories",
      categories.length > 0,
      categories.length > 0 ? `Read ${categories.length} categories` : "No categories found — run npm run seed",
      perf.loadCategories
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Read failed";
    record("Firestore Read - Categories", false, isFirestoreDisabledError(error) ? `Firestore API disabled — enable at ${FIRESTORE_ENABLE_URL}` : msg);
  }

  const prodStart = Date.now();
  try {
    const products = await withTimeout(getProducts(), 10000, "getProducts");
    time("loadProducts", prodStart);
    record(
      "Firestore Read - Products",
      products.length > 0,
      products.length > 0 ? `Read ${products.length} products` : "No products found — run npm run seed",
      perf.loadProducts
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Read failed";
    record("Firestore Read - Products", false, isFirestoreDisabledError(error) ? `Firestore API disabled — enable at ${FIRESTORE_ENABLE_URL}` : msg);
  }
}

async function testFirestoreWrite() {
  const db = getDb();
  const testId = `audit-${Date.now()}`;
  const testRef = doc(db, COLLECTIONS.connectionTest, testId);

  try {
    await withTimeout(
      setDoc(testRef, { message: "audit test", createdAt: new Date().toISOString() }),
      10000,
      "setDoc"
    );
    const readSnap = await withTimeout(getDoc(testRef), 10000, "getDoc");
    if (!readSnap.exists()) {
      record("Firestore Write Test", false, "Document not found after create");
      return;
    }
    await withTimeout(updateDoc(testRef, { message: "audit updated" }), 10000, "updateDoc");
    const updatedSnap = await withTimeout(getDoc(testRef), 10000, "getDoc updated");
    if (updatedSnap.data()?.message !== "audit updated") {
      record("Firestore Write Test", false, "Update verification failed");
      return;
    }
    await withTimeout(deleteDoc(testRef), 10000, "deleteDoc");
    record("Firestore Write Test", true, "Create, read, update, delete succeeded");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Write test failed";
    record(
      "Firestore Write Test",
      false,
      isFirestoreDisabledError(error)
        ? `Enable Firestore: ${FIREBASE_CONSOLE_URL}`
        : msg
    );
  }
}

async function testStorage() {
  try {
    const upload = await uploadTestImage();
    if (!upload.success) {
      record("Storage Upload", false, upload.error);
      return;
    }
    record("Storage Upload", true, `Uploaded test image: ${upload.data.url.slice(0, 60)}...`);

    const del = await deleteImage(upload.data.path);
    record("Storage Delete", del.success, del.success ? "Test image deleted" : del.error);
  } catch (error) {
    record("Storage Upload", false, error instanceof Error ? error.message : "Storage test failed");
    record("Storage Delete", false, "Skipped due to upload failure");
  }
}

async function testRealtimeListener() {
  return new Promise<void>((resolve) => {
    const db = getDb();
    const timeout = setTimeout(() => {
      record("Realtime Listener", false, "Listener timeout");
      resolve();
    }, 5000);

    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.categories), (snap) => {
      clearTimeout(timeout);
      unsubscribe();
      record(
        "Realtime Listener",
        true,
        `Received snapshot with ${snap.size} categories`
      );
      resolve();
    }, (error) => {
      clearTimeout(timeout);
      record("Realtime Listener", false, error.message);
      resolve();
    });
  });
}

async function testCategoriesCrud() {
  const created = await createCategory({
    nameAr: "اختبار",
    nameEn: "Audit Test",
    icon: "coffee",
    color: "#8B6914",
    sortOrder: 999,
    active: true,
  });
  if (!created.success) {
    record("Categories CRUD", false, created.error);
    return;
  }

  const updated = await updateCategory(created.data.id, { nameEn: "Audit Updated" });
  const deleted = await deleteCategory(created.data.id);
  record(
    "Categories CRUD",
    updated.success && deleted.success,
    updated.success && deleted.success ? "Create, update, delete succeeded" : "CRUD failed"
  );
}

async function testProductsCrud() {
  const categories = await getCategories();
  if (categories.length === 0) {
    record("Products CRUD", false, "No categories for product test");
    return;
  }

  const created = await createProduct({
    nameAr: "منتج اختبار",
    nameEn: "Audit Product",
    description: "Test product for audit",
    categoryId: categories[0]!.id,
    price: 10,
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80",
    available: true,
    popular: false,
    newProduct: true,
    sortOrder: 999,
  });
  if (!created.success) {
    record("Products CRUD", false, created.error);
    return;
  }

  const updated = await updateProduct(created.data.id, { price: 15 });
  const deleted = await deleteProduct(created.data.id);
  record(
    "Products CRUD",
    updated.success && deleted.success && updated.data.price === 15,
    updated.success && deleted.success ? "Create, update, delete succeeded" : "CRUD failed"
  );
}

async function testCustomersCrud() {
  const created = await createCustomer({
    name: "Audit Customer",
    phone: `audit-${Date.now()}`,
    email: "audit@mishkat.local",
    address: "Test Address",
    favoriteProducts: [],
    notes: "",
  });
  if (!created.success) {
    record("Customers CRUD", false, created.error);
    return;
  }

  const updated = await updateCustomer(created.data.id, { name: "Audit Updated" });
  const deleted = await deleteCustomer(created.data.id);
  record(
    "Customers CRUD",
    updated.success && deleted.success,
    updated.success && deleted.success ? "Create, update, delete succeeded" : "CRUD failed"
  );
}

async function testOrdersCrud() {
  let customers: Awaited<ReturnType<typeof getCustomers>> = [];
  try {
    customers = await getCustomers();
  } catch {
    record("Orders CRUD", false, "Customers read requires staff auth — test in admin UI after login");
    return;
  }
  const products = await getProducts();
  if (customers.length === 0 || products.length === 0) {
    record("Orders CRUD", false, "Missing customers or products");
    return;
  }

  const customer = customers[0]!;
  const product = products[0]!;
  const orderStart = Date.now();

  const created = await createOrder({
    customerId: customer.id,
    customerName: customer.name,
    items: [{
      productId: product.id,
      productName: product.name_en,
      quantity: 1,
      price: product.price,
    }],
    status: "received",
    subtotal: product.price,
    discount: 0,
    delivery: 0,
    total: product.price,
    paymentMethod: "cash",
    notes: "Audit test order",
  });
  time("createOrder", orderStart);

  if (!created.success) {
    record("Orders CRUD", false, created.error);
    return;
  }

  const updated = await updateOrder(created.data.id, { status: "preparing" });
  const deleted = await deleteOrder(created.data.id);
  record(
    "Orders CRUD",
    updated.success && deleted.success,
    updated.success && deleted.success
      ? `Create, update, delete succeeded (${perf.createOrder}ms)`
      : "CRUD failed",
    perf.createOrder
  );
}

async function testDataIntegrity() {
  const categories = await getCategories();
  const products = await getProducts();
  const categoryIds = new Set(categories.map((c) => c.id));
  const productIds = new Set(products.map((p) => p.id));

  const duplicateProductIds = products.length !== productIds.size;
  const invalidCategoryRefs = products.filter((p) => !categoryIds.has(p.categoryId));
  const invalidPrices = products.filter((p) => p.price <= 0);
  const missingFields = products.filter(
    (p) => !p.name_en || !p.name_ar || !p.description || !p.image
  );
  const invalidImages = products.filter((p) => !p.image.startsWith("http"));

  const passed =
    !duplicateProductIds &&
    invalidCategoryRefs.length === 0 &&
    invalidPrices.length === 0 &&
    missingFields.length === 0 &&
    invalidImages.length === 0;

  record(
    "Data Integrity",
    passed,
    passed
      ? "All integrity checks passed"
      : `Issues: duplicates=${duplicateProductIds}, badCategory=${invalidCategoryRefs.length}, badPrice=${invalidPrices.length}, missingFields=${missingFields.length}, badImages=${invalidImages.length}`
  );
}

async function runAudit() {
  process.stdout.write("\n=== MISHKAT CAFÉ — Firebase Audit ===\n\n");

  const initOk = await testInitialization();
  if (!initOk) {
    printReport();
    process.exit(1);
  }

  await testFirestoreRead();
  await testFirestoreWrite();

  const firestoreOk = checks.some(
    (c) => c.passed && (c.name.includes("Firestore Read") || c.name === "Firestore Write Test")
  );
  if (!firestoreOk) {
    record("Setup Required", false, `Create Firestore DB: ${FIREBASE_CONSOLE_URL}`);
    printReport();
    process.exit(1);
  }

  await testStorage();
  await testRealtimeListener();
  await testCategoriesCrud();
  await testProductsCrud();
  await testCustomersCrud();
  await testOrdersCrud();
  await testDataIntegrity();

  printReport();
  const allPassed = checks.every((c) => c.passed);
  process.exit(allPassed ? 0 : 1);
}

function printReport() {
  process.stdout.write("\n--- Check Results ---\n");
  for (const check of checks) {
    const icon = check.passed ? "✔" : "✗";
    const timing = check.durationMs !== undefined ? ` (${check.durationMs}ms)` : "";
    process.stdout.write(`${icon} ${check.name}: ${check.message}${timing}\n`);
  }

  process.stdout.write("\n--- Performance ---\n");
  for (const [key, ms] of Object.entries(perf)) {
    process.stdout.write(`  ${key}: ${ms}ms\n`);
  }

  const allPassed = checks.every((c) => c.passed);
  process.stdout.write("\n=== Final Report ===\n");
  const reportItems = [
    ["Firebase Connected", checks.find((c) => c.name === "Firebase Initialization")?.passed],
    ["Firestore Read", checks.some((c) => c.name.includes("Firestore Read") && c.passed)],
    ["Firestore Write", checks.find((c) => c.name === "Firestore Write Test")?.passed],
    ["Storage Upload", checks.find((c) => c.name === "Storage Upload")?.passed],
    ["Storage Delete", checks.find((c) => c.name === "Storage Delete")?.passed],
    ["Products CRUD", checks.find((c) => c.name === "Products CRUD")?.passed],
    ["Categories CRUD", checks.find((c) => c.name === "Categories CRUD")?.passed],
    ["Customers CRUD", checks.find((c) => c.name === "Customers CRUD")?.passed],
    ["Orders CRUD", checks.find((c) => c.name === "Orders CRUD")?.passed],
    ["Realtime Listener", checks.find((c) => c.name === "Realtime Listener")?.passed],
    ["Images Working", checks.find((c) => c.name === "Storage Upload")?.passed],
    ["Performance OK", (perf.loadProducts ?? 0) < 5000 && (perf.loadCategories ?? 0) < 5000],
    ["No Errors", allPassed],
    ["Ready for Production", allPassed],
  ];

  for (const [label, passed] of reportItems) {
    process.stdout.write(`${passed ? "✔" : "✗"} ${label}\n`);
  }

  process.stdout.write(`\n${allPassed ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"}\n\n`);
}

runAudit().catch((err) => {
  process.stderr.write(`Audit crashed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
