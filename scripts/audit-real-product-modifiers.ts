/** Read-only audit of the production modifier relationship model. */
import { config } from "dotenv";
config({ path: ".env" });

import { collection, getDocs } from "firebase/firestore";
import { getDb } from "../src/lib/firebase";
import { COLLECTIONS } from "../src/lib/firebase/collections";
import { loadProductBuilderConfig } from "../src/services/modifierService";

async function main() {
  const db = getDb();
  const [products, groups, options, links, overrides] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.products)),
    getDocs(collection(db, COLLECTIONS.modifierGroups)),
    getDocs(collection(db, COLLECTIONS.modifierOptions)),
    getDocs(collection(db, COLLECTIONS.productModifierGroups)),
    getDocs(collection(db, COLLECTIONS.productModifierOptions)),
  ]);

  const legacyFields = products.docs.flatMap((snapshot) => {
    const matchingKeys = Object.keys(snapshot.data()).filter((key) =>
      /modifier|addon|extra|option/i.test(key)
    );
    return matchingKeys.length
      ? [{ productId: snapshot.id, fields: matchingKeys }]
      : [];
  });

  const linkedProductIds = [...new Set(links.docs.map((link) => link.data().productId))];
  const verifiedBuilders = [];
  for (const productId of linkedProductIds) {
    const config = await loadProductBuilderConfig(productId);
    verifiedBuilders.push({
      productId,
      groups: config.groups.length,
      options: config.groups.reduce(
        (count, group) => count + group.options.length,
        0
      ),
    });
  }

  console.log(
    JSON.stringify(
      {
        products: products.size,
        modifierGroups: groups.size,
        modifierOptions: options.size,
        productModifierLinks: links.size,
        productOptionOverrides: overrides.size,
        legacyProductFields: legacyFields,
        verifiedBuilders,
        model:
          "product_modifier_groups.productId/groupId -> modifier_groups -> modifier_options.groupId",
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
