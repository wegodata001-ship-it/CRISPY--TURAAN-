import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { setLogLevel } from "firebase/app";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, collection } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  getFirebaseApp,
  getDb,
  getFirebaseAuth,
  getFirebaseStorage,
  isFirebaseInitialized,
} from "../src/lib/firebase";
import { validateFirebaseEnv, getFirebaseConfig } from "../src/lib/firebase/env";
import { COLLECTIONS } from "../src/lib/firebase/collections";
import { uploadTestImage, deleteImage } from "../src/services/storageService";
import { withTimeout, isFirestoreDisabledError } from "./utils";

setLogLevel("silent");

interface StepResult {
  step: number;
  name: string;
  passed: boolean;
  detail: string;
  durationMs?: number;
}

const results: StepResult[] = [];

function step(n: number, name: string, passed: boolean, detail: string, durationMs?: number) {
  results.push({ step: n, name, passed, detail, durationMs });
}

async function run() {
  process.stdout.write("\n╔══════════════════════════════════════════╗\n");
  process.stdout.write("║   CRISPY — Full Firebase Audit           ║\n");
  process.stdout.write("╚══════════════════════════════════════════╝\n\n");

  // ── 1. Firebase App configuration ──
  const t1 = Date.now();
  try {
    const env = validateFirebaseEnv();
    if (!env.valid) {
      step(1, "Firebase App configuration", false, `Missing env: ${env.missing.join(", ")}`, Date.now() - t1);
    } else {
      const cfg = getFirebaseConfig();
      getFirebaseApp();
      step(
        1,
        "Firebase App configuration",
        true,
        `apiKey=***${cfg.apiKey.slice(-4)}, authDomain=${cfg.authDomain}, appId=${cfg.appId.slice(0, 20)}...`,
        Date.now() - t1
      );
    }
  } catch (e) {
    step(1, "Firebase App configuration", false, e instanceof Error ? e.message : String(e), Date.now() - t1);
  }

  // ── 2. projectId ──
  const t2 = Date.now();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  step(
    2,
    "Current projectId",
    projectId.length > 0 && !["mshkah", "mishkah", "mishkat"].includes(projectId),
    `projectId="${projectId}"`,
    Date.now() - t2
  );

  // ── 3. Firestore Database exists ──
  const t3 = Date.now();
  let firestoreExists = false;
  let firestoreRegion = "unknown";
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`;
    const res = await withTimeout(fetch(url), 10000, "Firestore metadata fetch");
    if (res.ok) {
      const data = (await res.json()) as { name?: string; locationId?: string; type?: string };
      firestoreExists = true;
      firestoreRegion = data.locationId ?? "unknown";
      step(3, "Firestore Database exists", true, `Database (default) found, type=${data.type ?? "FIRESTORE_NATIVE"}`, Date.now() - t3);
    } else if (res.status === 404) {
      step(3, "Firestore Database exists", false, "Database (default) not found — create at Firebase Console", Date.now() - t3);
    } else if (res.status === 403 || res.status === 401) {
      // REST metadata requires OAuth — fallback to client SDK probe
      try {
        await withTimeout(getDocs(collection(getDb(), COLLECTIONS.categories)), 10000, "Firestore client probe");
        firestoreExists = true;
        step(3, "Firestore Database exists", true, "Client SDK connected successfully", Date.now() - t3);
      } catch (e2) {
        step(3, "Firestore Database exists", false, e2 instanceof Error ? e2.message : String(e2), Date.now() - t3);
      }
    } else {
      const body = await res.text();
      step(3, "Firestore Database exists", false, `HTTP ${res.status}: ${body.slice(0, 120)}`, Date.now() - t3);
    }
  } catch (e) {
    if (isFirestoreDisabledError(e)) {
      step(3, "Firestore Database exists", false, "Firestore API disabled or DB not created", Date.now() - t3);
    } else {
      // Fallback: try client read
      try {
        await withTimeout(getDocs(collection(getDb(), COLLECTIONS.categories)), 10000, "Firestore client probe");
        firestoreExists = true;
        step(3, "Firestore Database exists", true, "Client SDK read succeeded", Date.now() - t3);
      } catch (e2) {
        step(3, "Firestore Database exists", false, e2 instanceof Error ? e2.message : String(e2), Date.now() - t3);
      }
    }
  }

  // ── 4. Firestore region ──
  const t4 = Date.now();
  if (firestoreRegion !== "unknown") {
    step(4, "Firestore region", true, `locationId=${firestoreRegion}`, Date.now() - t4);
  } else {
    step(4, "Firestore region", firestoreExists, firestoreExists ? "Region not exposed via client SDK (check Firebase Console)" : "Cannot determine — DB not accessible", Date.now() - t4);
  }

  // ── 5. Authentication state ──
  const t5 = Date.now();
  try {
    isFirebaseInitialized();
    const auth = getFirebaseAuth();
    const authState = await withTimeout(
      new Promise<{ uid: string | null; email: string | null }>((resolve) => {
        const unsub = onAuthStateChanged(auth, (user) => {
          unsub();
          resolve({ uid: user?.uid ?? null, email: user?.email ?? null });
        });
      }),
      5000,
      "Auth state check"
    );
    step(
      5,
      "Authentication state",
      true,
      authState.uid
        ? `Signed in: uid=${authState.uid}, email=${authState.email}`
        : "Auth initialized, no user signed in (expected for public catalog)",
      Date.now() - t5
    );
  } catch (e) {
    step(5, "Authentication state", false, e instanceof Error ? e.message : String(e), Date.now() - t5);
  }

  // ── 6. Firestore Rules (local file) ──
  const t6 = Date.now();
  const fsRulesPath = resolve("firestore.rules");
  if (existsSync(fsRulesPath)) {
    const content = readFileSync(fsRulesPath, "utf-8");
    const hasAllow = content.includes("allow read") || content.includes("allow write");
    step(6, "Firestore Rules", hasAllow, `Local rules file OK (${content.split("\n").length} lines) — deploy with: firebase deploy --only firestore:rules`, Date.now() - t6);
  } else {
    step(6, "Firestore Rules", false, "firestore.rules not found", Date.now() - t6);
  }

  // ── 7. Storage Rules (local file) ──
  const t7 = Date.now();
  const stRulesPath = resolve("storage.rules");
  if (existsSync(stRulesPath)) {
    const content = readFileSync(stRulesPath, "utf-8");
    const hasAllow = content.includes("allow read") || content.includes("allow write");
    step(7, "Storage Rules", hasAllow, `Local rules file OK (${content.split("\n").length} lines) — deploy with: firebase deploy --only storage`, Date.now() - t7);
  } else {
    step(7, "Storage Rules", false, "storage.rules not found", Date.now() - t7);
  }

  // ── 8. Network connectivity ──
  const t8 = Date.now();
  try {
    const pingGoogle = await withTimeout(fetch("https://www.google.com/generate_204"), 8000, "Google ping");
    const pingFirebase = await withTimeout(fetch(`https://${projectId}.firebaseio.com/.json`), 8000, "Firebase ping");
    step(
      8,
      "Network connectivity",
      pingGoogle.ok,
      `Internet=${pingGoogle.status}, Firebase host reachable=${pingFirebase.status !== 0}`,
      Date.now() - t8
    );
  } catch (e) {
    step(8, "Network connectivity", false, e instanceof Error ? e.message : String(e), Date.now() - t8);
  }

  // ── 9–12. CRUD on real document ──
  const db = getDb();
  const testId = `audit-${Date.now()}`;
  const testRef = doc(db, COLLECTIONS.connectionTest, testId);
  let crudOk = true;

  // 9. Write
  const t9 = Date.now();
  try {
    await withTimeout(
      setDoc(testRef, { message: "audit write", createdAt: new Date().toISOString(), step: 9 }),
      15000,
      "Document write"
    );
    step(9, "Execute real document write", true, `Written to connection-test/${testId}`, Date.now() - t9);
  } catch (e) {
    crudOk = false;
    step(9, "Execute real document write", false, e instanceof Error ? e.message : String(e), Date.now() - t9);
  }

  // 10. Read
  const t10 = Date.now();
  if (crudOk) {
    try {
      const snap = await withTimeout(getDoc(testRef), 15000, "Document read");
      const data = snap.data();
      step(
        10,
        "Read the same document",
        snap.exists() && data?.message === "audit write",
        snap.exists() ? `message="${data?.message}"` : "Document not found",
        Date.now() - t10
      );
      if (!snap.exists()) crudOk = false;
    } catch (e) {
      crudOk = false;
      step(10, "Read the same document", false, e instanceof Error ? e.message : String(e), Date.now() - t10);
    }
  } else {
    step(10, "Read the same document", false, "Skipped — write failed", Date.now() - t10);
  }

  // 11. Update
  const t11 = Date.now();
  if (crudOk) {
    try {
      await withTimeout(updateDoc(testRef, { message: "audit updated", step: 11 }), 15000, "Document update");
      const snap = await withTimeout(getDoc(testRef), 15000, "Document read after update");
      const ok = snap.data()?.message === "audit updated";
      step(11, "Update the same document", ok, ok ? 'message="audit updated"' : "Update verification failed", Date.now() - t11);
      if (!ok) crudOk = false;
    } catch (e) {
      crudOk = false;
      step(11, "Update the same document", false, e instanceof Error ? e.message : String(e), Date.now() - t11);
    }
  } else {
    step(11, "Update the same document", false, "Skipped — prior step failed", Date.now() - t11);
  }

  // 12. Delete
  const t12 = Date.now();
  if (crudOk) {
    try {
      await withTimeout(deleteDoc(testRef), 15000, "Document delete");
      const snap = await withTimeout(getDoc(testRef), 15000, "Document read after delete");
      step(12, "Delete the same document", !snap.exists(), !snap.exists() ? "Document deleted successfully" : "Document still exists", Date.now() - t12);
    } catch (e) {
      step(12, "Delete the same document", false, e instanceof Error ? e.message : String(e), Date.now() - t12);
    }
  } else {
    step(12, "Delete the same document", false, "Skipped — prior step failed", Date.now() - t12);
  }

  // ── 13. Upload test image ──
  const t13 = Date.now();
  let uploadedPath: string | null = null;
  try {
    getFirebaseStorage();
    const upload = await withTimeout(uploadTestImage(), 20000, "Storage upload");
    if (upload.success) {
      uploadedPath = upload.data.path;
      step(13, "Upload test image", true, `URL=${upload.data.url.slice(0, 70)}...`, Date.now() - t13);
    } else {
      step(13, "Upload test image", false, upload.error, Date.now() - t13);
    }
  } catch (e) {
    step(13, "Upload test image", false, e instanceof Error ? e.message : String(e), Date.now() - t13);
  }

  // ── 14. Delete test image ──
  const t14 = Date.now();
  if (uploadedPath) {
    try {
      const del = await withTimeout(deleteImage(uploadedPath), 15000, "Storage delete");
      step(14, "Delete test image", del.success, del.success ? `Deleted ${uploadedPath}` : del.error, Date.now() - t14);
    } catch (e) {
      step(14, "Delete test image", false, e instanceof Error ? e.message : String(e), Date.now() - t14);
    }
  } else {
    step(14, "Delete test image", false, "Skipped — upload failed", Date.now() - t14);
  }

  // ── 15. Final audit ──
  printFinalReport();
  const allPassed = results.every((r) => r.passed);
  process.exit(allPassed ? 0 : 1);
}

function printFinalReport() {
  process.stdout.write("\n── Step-by-Step Results ──\n\n");
  for (const r of results) {
    const icon = r.passed ? "✔" : "✗";
    const ms = r.durationMs !== undefined ? ` [${r.durationMs}ms]` : "";
    process.stdout.write(` ${icon}  ${String(r.step).padStart(2)}. ${r.name}${ms}\n`);
    process.stdout.write(`      ${r.detail}\n\n`);
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  process.stdout.write("╔══════════════════════════════════════════╗\n");
  process.stdout.write("║           FINAL AUDIT REPORT             ║\n");
  process.stdout.write("╠══════════════════════════════════════════╣\n");

  for (const r of results) {
    const icon = r.passed ? "✔" : "✗";
    const label = r.name.padEnd(34).slice(0, 34);
    process.stdout.write(`║ ${icon} ${label} ║\n`);
  }

  process.stdout.write("╠══════════════════════════════════════════╣\n");
  process.stdout.write(`║  Score: ${passed}/${total} passed${" ".repeat(27 - String(passed).length - String(total).length)}║\n`);

  if (passed === total) {
    process.stdout.write("║  ✔ Ready for Production               ║\n");
  } else {
    process.stdout.write("║  ✗ NOT Ready — fix failed steps above  ║\n");
  }
  process.stdout.write("╚══════════════════════════════════════════╝\n\n");
}

run().catch((e) => {
  process.stderr.write(`Audit crashed: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
