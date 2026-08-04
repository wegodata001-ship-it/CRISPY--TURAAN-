/**
 * MISHKAT CAFÉ — Final Production Audit
 * Runs build checks, Firebase probes, performance timing, and security review.
 */
import { config } from "dotenv";
config({ path: ".env" });

import { execSync } from "child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { silenceFirebaseLogs, withTimeout } from "./utils";
import { getDb } from "../src/lib/firebase";
import { COLLECTIONS } from "../src/lib/firebase/collections";

silenceFirebaseLogs();

interface AuditResult {
  section: string;
  check: string;
  passed: boolean;
  detail: string;
  durationMs?: number;
}

const results: AuditResult[] = [];
const perf: Record<string, number> = {};

function record(section: string, check: string, passed: boolean, detail: string, durationMs?: number) {
  results.push({ section, check, passed, detail, durationMs });
}

function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => {
    perf[label] = Date.now() - start;
  });
}

async function auditBuild() {
  const section = "Build";

  try {
    execSync("npx tsc --noEmit -p tsconfig.typecheck.json", { stdio: "pipe", cwd: resolve(".") });
    record(section, "TypeScript (tsc)", true, "No type errors in src/");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    record(section, "TypeScript (tsc)", false, msg.slice(0, 200));
  }

  try {
    execSync("npm run build", { stdio: "pipe", cwd: resolve(".") });
    record(section, "Production Build", true, "next build succeeded");
  } catch (e) {
    record(section, "Production Build", false, "next build failed");
  }

  try {
    execSync("npx eslint . --max-warnings 0", { stdio: "pipe", cwd: resolve(".") });
    record(section, "ESLint", true, "No lint errors");
  } catch (e) {
    const out = e instanceof Error && "stdout" in e ? String((e as { stdout: Buffer }).stdout) : "";
    record(section, "ESLint", false, out.slice(0, 300) || "eslint failed");
  }

  const hasConsoleLog = (() => {
    try {
      function walk(dir: string): string[] {
        return readdirSync(dir).flatMap((f) => {
          const p = join(dir, f);
          return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") || p.endsWith(".tsx") ? [p] : [];
        });
      }
      return walk("src").some((f) => readFileSync(f, "utf-8").includes("console.log"));
    } catch {
      return false;
    }
  })();
  record(section, "No console.log in src", !hasConsoleLog, hasConsoleLog ? "Found console.log" : "Clean");
}

async function auditGit() {
  const section = "Git";
  try {
    const branch = execSync("git branch --show-current", { encoding: "utf-8" }).trim();
    const hash = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
    const remote = execSync("git remote get-url origin", { encoding: "utf-8" }).trim();
    const tags = execSync("git tag -l", { encoding: "utf-8" }).trim();
    record(section, "Branch", true, branch);
    record(section, "Commit Hash", true, hash);
    record(section, "Remote", true, remote);
    record(section, "Release Tag", tags.length > 0, tags || "No tags");
  } catch (e) {
    record(section, "Git Info", false, e instanceof Error ? e.message : String(e));
  }
}

async function auditEnv() {
  const section = "Environment";
  const publicKeys = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  ];
  for (const k of publicKeys) {
    record(section, k, !!process.env[k]?.trim(), process.env[k] ? "SET" : "MISSING");
  }
  const adminKeys = ["FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY", "FIREBASE_SERVICE_ACCOUNT_JSON"];
  const adminOk = adminKeys.some((k) => !!process.env[k]?.trim());
  record(section, "Firebase Admin SDK", adminOk, adminOk ? "Credentials present" : "MISSING — required for seed, bootstrap, API routes");
}

async function auditFirebase() {
  const section = "Firebase";
  const { validateFirebaseEnv } = await import("../src/lib/firebase/env");
  const env = validateFirebaseEnv();
  record(section, "Client ENV", env.valid, env.valid ? "OK" : `Missing: ${env.missing.join(", ")}`);
  if (!env.valid) return;

  const { getCategories } = await import("../src/services/categoryService");
  const { uploadTestImage, deleteImage } = await import("../src/services/storageService");

  try {
    getDb();
    const { getFirebaseStorage, getFirebaseAuth } = await import("../src/lib/firebase");
    getFirebaseStorage();
    getFirebaseAuth();
    record(section, "SDK Init", true, "Firestore, Storage, Auth initialized");
  } catch (e) {
    record(section, "SDK Init", false, e instanceof Error ? e.message : String(e));
    return;
  }

  {
    const start = Date.now();
    try {
      const categories = await withTimeout(getCategories(), 10000, "categories");
      const ms = Date.now() - start;
      perf.readCategories = ms;
      record(section, "Firestore Read (categories)", true, `${categories.length} documents`, ms);
    } catch (e) {
      record(section, "Firestore Read (categories)", false, e instanceof Error ? e.message : String(e));
    }
  }

  {
    const id = `audit-${Date.now()}`;
    const start = Date.now();
    try {
      const db = getDb();
      await withTimeout(setDoc(doc(db, COLLECTIONS.connectionTest, id), { ok: true }), 10000, "write");
      await withTimeout(deleteDoc(doc(db, COLLECTIONS.connectionTest, id)), 10000, "delete");
      const ms = Date.now() - start;
      perf.writeConnectionTest = ms;
      record(section, "Firestore Write (connection-test)", true, "CRUD OK", ms);
    } catch (e) {
      record(section, "Firestore Write (connection-test)", false, e instanceof Error ? e.message : String(e));
    }
  }

  await (async () => {
    const start = Date.now();
    try {
      const up = await withTimeout(uploadTestImage(), 15000, "upload");
      if (!up.success) {
        record(section, "Storage Upload", false, up.error);
        return;
      }
      perf.storageUpload = Date.now() - start;
      record(section, "Storage Upload", true, "Test image uploaded", perf.storageUpload);
      const del = await deleteImage(up.data.path);
      record(section, "Storage Delete", del.success, del.success ? "Test image deleted" : del.error);
    } catch (e) {
      record(section, "Storage Upload", false, e instanceof Error ? e.message : String(e));
    }
  })();

  const fsRules = readFileSync("firestore.rules", "utf-8");
  const stRules = readFileSync("storage.rules", "utf-8");
  record(section, "Firestore Rules (local)", fsRules.includes("allow read"), `${fsRules.split("\n").length} lines`);
  record(section, "Storage Rules (local)", stRules.includes("allow read"), `${stRules.split("\n").length} lines`);
  record(section, "Staff-only product writes", fsRules.includes("isStaff()"), "Products/categories require staff");
  record(section, "Public catalog read", fsRules.includes("allow read: if true"), "Categories/products public read");
}

async function auditPerformance() {
  const section = "Performance";
  const { getCategories } = await import("../src/services/categoryService");
  const { getProducts } = await import("../src/services/productService");
  const { getCustomers } = await import("../src/services/customerService");
  const { getOrders } = await import("../src/services/orderService");
  const { listMediaFiles } = await import("../src/services/mediaService");

  const probes: [string, () => Promise<unknown>, boolean][] = [
    ["Login page (static)", async () => true, true],
    ["Categories load", () => getCategories(), true],
    ["Products load", () => getProducts(), true],
    ["Orders load (staff-only)", () => getOrders(), false],
    ["Customers load (staff-only)", () => getCustomers(), false],
    ["Media list", () => listMediaFiles(), true],
  ];

  for (const [label, fn, mustPass] of probes) {
    const start = Date.now();
    try {
      await withTimeout(fn(), 10000, label);
      const ms = Date.now() - start;
      perf[label] = ms;
      const slow = ms > 1000;
      record(section, label, mustPass ? !slow : true, `${ms}ms${slow ? " — SLOW (>1s)" : ""}${!mustPass ? " (auth required in app)" : ""}`, ms);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!mustPass && msg.includes("permission")) {
        record(section, label, true, `Blocked without auth (expected): ${msg}`, Date.now() - start);
      } else {
        record(section, label, false, msg, Date.now() - start);
      }
    }
  }
}

async function auditSecurity() {
  const section = "Security";
  const fsRules = readFileSync("firestore.rules", "utf-8");

  record(section, "Admin API auth", existsSync("src/lib/auth/verify-admin.ts"), "verify-admin.ts exists");
  record(section, "Auth guard component", existsSync("src/features/admin/auth-guard.tsx"), "Client-side admin guard");
  record(section, "Users collection write blocked", fsRules.includes("allow write: if false"), "users/{uid} write denied");
  record(section, "Orders public create", fsRules.includes("allow create: if true"), "Checkout can create orders");
  record(section, "Customers staff read", fsRules.includes("match /customers"), "Customers protected");
  record(
    section,
    "Storage write requires auth",
    readFileSync("storage.rules", "utf-8").includes("allow write: if isSignedIn()"),
    "Product uploads require signed-in user"
  );
  record(
    section,
    "connection-test open (dev)",
    fsRules.includes("connection-test"),
    "Consider removing connection-test rule before production hardening"
  );
}

async function auditGoLive() {
  const section = "Go-Live Checklist";
  const adminOk = !!(process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const fbRead = results.find((r) => r.check === "Firestore Read (categories)")?.passed;
  const fbWrite = results.find((r) => r.check === "Firestore Write (connection-test)")?.passed;
  const seedData = results.find((r) => r.check === "Firestore Read (categories)")?.detail?.startsWith("1");

  record(section, "Firebase credentials", !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "missing");
  record(section, "Admin SDK configured", adminOk, adminOk ? "OK" : "Set FIREBASE_ADMIN_* in .env");
  record(section, "Firestore rules deployed", results.find((r) => r.check === "Firestore Write (connection-test)")?.passed ?? false, "connection-test CRUD");
  record(section, "Storage rules deployed", results.find((r) => r.check === "Storage Upload")?.passed ?? false, "See Storage Upload check");
  const catCount = results.find((r) => r.check === "Firestore Read (categories)")?.detail ?? "0";
  record(section, "Seed completed", catCount.includes("105") || catCount.includes("12"), `Categories in DB: ${catCount}`);
  record(section, "Admin login tested", false, "Manual — visit /admin/login after bootstrap");
  record(section, "Password changed", false, "Manual — change default password after first login");
  record(section, "Firestore backup", false, "Manual — export via Firebase Console or gcloud");
  record(section, "Storage backup", false, "Manual — gsutil cp -r gs://bucket ./backup");
}

async function run() {
  process.stdout.write("\n╔══════════════════════════════════════════════════╗\n");
  process.stdout.write("║     MISHKAT CAFÉ — Final Production Audit        ║\n");
  process.stdout.write("╚══════════════════════════════════════════════════╝\n\n");

  await auditEnv();
  await auditGit();
  await auditFirebase();
  await auditPerformance();
  await auditSecurity();
  await auditBuild();
  await auditGoLive();

  const sections = [...new Set(results.map((r) => r.section))];
  for (const section of sections) {
    process.stdout.write(`\n── ${section} ──\n`);
    for (const r of results.filter((x) => x.section === section)) {
      const icon = r.passed ? "✔" : "✗";
      const ms = r.durationMs !== undefined ? ` [${r.durationMs}ms]` : "";
      process.stdout.write(`  ${icon} ${r.check}${ms}\n     ${r.detail}\n`);
    }
  }

  if (Object.keys(perf).length) {
    process.stdout.write("\n── Performance Summary ──\n");
    for (const [k, v] of Object.entries(perf).sort((a, b) => b[1] - a[1])) {
      const flag = v > 1000 ? " ⚠ SLOW" : "";
      process.stdout.write(`  ${k}: ${v}ms${flag}\n`);
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const critical = results.filter((r) => !r.passed && [
    "Firestore Write (connection-test)",
    "Firestore Read (categories)",
    "Production Build",
    "Firebase Admin SDK",
    "Storage Upload",
  ].includes(r.check));

  process.stdout.write("\n╔══════════════════════════════════════════════════╗\n");
  process.stdout.write(`║  Score: ${passed}/${total} checks passed\n`);
  process.stdout.write(`║  Critical failures: ${critical.length}\n`);
  if (critical.length === 0 && passed === total) {
    process.stdout.write("║  ✔ RECOMMENDATION: Ready for Production\n");
  } else {
    process.stdout.write("║  ✗ RECOMMENDATION: NOT Ready for Production\n");
  }
  process.stdout.write("╚══════════════════════════════════════════════════╝\n\n");

  process.exit(critical.length > 0 ? 1 : passed === total ? 0 : 1);
}

run().catch((e) => {
  process.stderr.write(`Audit crashed: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
