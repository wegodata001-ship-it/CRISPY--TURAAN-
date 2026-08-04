import { config } from "dotenv";
config({ path: ".env" });

import { getAdminDb } from "../src/lib/firebase/admin";
import { COLLECTIONS } from "../src/lib/firebase/collections";
import { UI_TRANSLATIONS_SEED } from "../src/data/ui-translations-seed";
import { LOCALES } from "../src/lib/i18n/types";
import { FieldValue } from "firebase-admin/firestore";

async function main() {
  const db = getAdminDb();
  for (const locale of LOCALES) {
    await db.collection(COLLECTIONS.uiTranslations).doc(locale).set({
      locale,
      strings: UI_TRANSLATIONS_SEED[locale],
      version: 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    process.stdout.write(`✔ ui_translations/${locale} (${Object.keys(UI_TRANSLATIONS_SEED[locale]).length} keys)\n`);
  }
  process.stdout.write("\n✔ UI translations seeded.\n");
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
