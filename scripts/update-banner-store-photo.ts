import { config } from "dotenv";
config({ path: ".env" });

import { getAdminDb } from "../src/lib/firebase/admin";
import { COLLECTIONS } from "../src/lib/firebase/collections";
import { BRAND } from "../src/lib/brand";
import { FieldValue } from "firebase-admin/firestore";

async function main() {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTIONS.banners).get();

  if (snap.empty) {
    process.stdout.write("No banners found — run seed first.\n");
    process.exit(1);
  }

  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      imageUrl: BRAND.store,
      mobileImageUrl: BRAND.store,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  process.stdout.write(`✔ Updated ${snap.size} banner(s) to ${BRAND.store}\n`);
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
