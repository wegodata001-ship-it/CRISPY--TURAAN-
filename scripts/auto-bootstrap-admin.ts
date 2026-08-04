/**
 * Creates the first Admin user without Firebase Console or Admin SDK.
 * 1) Firebase Auth via REST API (signUp / signIn)
 * 2) Temporarily opens Firestore rules
 * 3) Writes users/{uid} with role Admin
 * 4) Restores production rules
 *
 * Requires: firebase CLI logged in (for rules deploy)
 */
import { config } from "dotenv";
config({ path: ".env" });

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const ROOT = resolve(".");
const RULES = resolve(ROOT, "firestore.rules");
const RULES_BACKUP = resolve(ROOT, "firestore.rules.backup");
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "mshkah";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@mishkat.cafe";
const PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "MishkatAdmin2026!";
const DISPLAY_NAME = process.env.ADMIN_BOOTSTRAP_NAME ?? "MISHKAT Admin";

const OPEN_RULES = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
`;

function run(cmd: string) {
  process.stdout.write(`> ${cmd}\n`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit", env: process.env });
}

async function authRest(path: string, body: Record<string, string>) {
  if (!API_KEY) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY missing in .env");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${path}?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = (await res.json()) as {
    localId?: string;
    email?: string;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Auth ${path} failed (${res.status})`);
  }
  if (!data.localId) throw new Error(`Auth ${path} missing localId`);
  return data;
}

async function ensureAuthUser(): Promise<string> {
  try {
    const created = await authRest("signUp", {
      email: EMAIL,
      password: PASSWORD,
      returnSecureToken: "true",
    });
    process.stdout.write(`✔ Auth user created: ${created.email}\n`);
    return created.localId!;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("EMAIL_EXISTS")) throw err;
    process.stdout.write("ℹ Auth user already exists — signing in…\n");
    const signedIn = await authRest("signInWithPassword", {
      email: EMAIL,
      password: PASSWORD,
      returnSecureToken: "true",
    });
    return signedIn.localId!;
  }
}

async function ensureFirestoreProfile(uid: string) {
  const app = initializeApp({
    apiKey: API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: PROJECT,
  });
  const db = getFirestore(app);
  const ref = doc(db, "users", uid);
  const existing = await getDoc(ref);

  if (existing.exists() && existing.data()?.role === "Admin" && existing.data()?.active === true) {
    process.stdout.write("✔ Admin Firestore profile already exists\n");
    return;
  }

  await setDoc(ref, {
    email: EMAIL,
    displayName: DISPLAY_NAME,
    role: "Admin",
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  process.stdout.write("✔ Admin Firestore profile written\n");
}

async function main() {
  process.stdout.write("\n=== MISHKAT CAFÉ — Auto Admin Bootstrap ===\n\n");

  try {
    execSync("npx firebase login:list", { cwd: ROOT, stdio: "pipe" });
  } catch {
    process.stderr.write("Firebase CLI not logged in. Run: npx firebase login\n");
    process.exit(1);
  }

  const uid = await ensureAuthUser();

  const original = readFileSync(RULES, "utf-8");
  writeFileSync(RULES_BACKUP, original, "utf-8");

  try {
    process.stdout.write("\n[1/2] Deploying temporary open rules…\n");
    writeFileSync(RULES, OPEN_RULES, "utf-8");
    run(`npx firebase deploy --only firestore:rules --project ${PROJECT}`);

    process.stdout.write("\n[2/2] Writing Admin profile to Firestore…\n");
    await ensureFirestoreProfile(uid);

    process.stdout.write("\nRestoring production Firestore rules…\n");
    writeFileSync(RULES, original, "utf-8");
    run(`npx firebase deploy --only firestore:rules --project ${PROJECT}`);

    process.stdout.write("\n✔ Admin bootstrap completed!\n\n");
    process.stdout.write(`  Login URL:  http://localhost:3001/admin/login\n`);
    process.stdout.write(`  Email:      ${EMAIL}\n`);
    process.stdout.write(`  Password:   ${PASSWORD}\n\n`);
  } catch (error) {
    process.stderr.write("\n✗ Bootstrap failed — restoring rules…\n");
    if (existsSync(RULES_BACKUP)) {
      writeFileSync(RULES, readFileSync(RULES_BACKUP, "utf-8"), "utf-8");
      try {
        run(`npx firebase deploy --only firestore:rules --project ${PROJECT}`);
      } catch {
        process.stderr.write("CRITICAL: Could not restore rules.\n");
      }
    }
    throw error;
  }
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
