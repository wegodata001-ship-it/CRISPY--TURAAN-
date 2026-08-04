/**
 * Automated seed: temporarily opens Firestore write rules, seeds master menu, restores rules.
 * Requires: firebase CLI logged in (firebase login:list)
 */
import { config } from "dotenv";
config({ path: ".env" });

import { execSync } from "child_process";
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(".");
const RULES = resolve(ROOT, "firestore.rules");
const RULES_BACKUP = resolve(ROOT, "firestore.rules.backup");
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "mshkah";

const SEED_RULES = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORARY — auto-seed only. Restored immediately after seed.
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

async function main() {
  process.stdout.write("\n=== MISHKAT CAFÉ — Auto Seed ===\n\n");

  try {
    execSync("npx firebase login:list", { cwd: ROOT, stdio: "pipe" });
  } catch {
    process.stderr.write("Firebase CLI not logged in. Run: npx firebase login\n");
    process.exit(1);
  }

  const original = readFileSync(RULES, "utf-8");
  writeFileSync(RULES_BACKUP, original, "utf-8");

  try {
    process.stdout.write("\n[1/4] Deploying temporary seed rules...\n");
    writeFileSync(RULES, SEED_RULES, "utf-8");
    run(`npx firebase deploy --only firestore:rules --project ${PROJECT}`);

    process.stdout.write("\n[2/4] Importing master menu (105 products)...\n");
    run("npm run seed:force");

    process.stdout.write("\n[3/4] Restoring production Firestore rules...\n");
    writeFileSync(RULES, original, "utf-8");
    run(`npx firebase deploy --only firestore:rules --project ${PROJECT}`);

    process.stdout.write("\n[4/4] Verifying...\n");
    run("npm run menu:audit");

    process.stdout.write("\n✔ Auto seed completed successfully!\n\n");
  } catch (error) {
    process.stderr.write("\n✗ Auto seed failed — restoring rules...\n");
    if (existsSync(RULES_BACKUP)) {
      writeFileSync(RULES, readFileSync(RULES_BACKUP, "utf-8"), "utf-8");
      try {
        run(`npx firebase deploy --only firestore:rules --project ${PROJECT}`);
      } catch {
        process.stderr.write("CRITICAL: Could not restore rules. Check firestore.rules manually.\n");
      }
    }
    throw error;
  }
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
