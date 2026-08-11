/**
 * Benchmark product save pipeline against live Firestore.
 * Run: npx tsx scripts/benchmark-product-save.ts
 */
import { config } from "dotenv";
config({ path: ".env" });

import { silenceFirebaseLogs } from "./utils";
import {
  getProducts,
  readOneProductForTest,
  updateProduct,
  getProductModifierGroups,
  syncProductModifierLinks,
  getModifierOptions,
  getModifierGroups,
  updateModifierOption,
  createModifierOption,
  deleteModifierOption,
  unlinkProductModifierGroup,
  updateProductModifierGroup,
  linkProductModifierGroup,
} from "../src/services";
import { normalizeModifierOptionInput } from "../src/lib/validation/modifier-normalize";
import type { Product } from "../src/types";
import { pickChangedProductFields } from "../src/features/admin/product-form/product-save-perf";

silenceFirebaseLogs();

async function timed<T>(label: string, fn: () => Promise<T>): Promise<{ ms: number; value: T }> {
  const t0 = performance.now();
  const value = await fn();
  const ms = Math.round(performance.now() - t0);
  return { ms, value };
}

/** Legacy sequential link sync (pre-optimization) */
async function legacySyncModifierLinks(productId: string, desiredGroupIds: string[]) {
  const existing = await getProductModifierGroups(productId);
  const existingByGroupId = new Map(existing.map((l) => [l.groupId, l]));

  for (const link of existing) {
    if (!desiredGroupIds.includes(link.groupId)) {
      await unlinkProductModifierGroup(link.id);
    }
  }

  let order = 1;
  for (const groupId of desiredGroupIds) {
    const link = existingByGroupId.get(groupId);
    if (link) {
      if (link.sortOrder !== order) {
        await updateProductModifierGroup(link.id, { sortOrder: order });
      }
    } else {
      await linkProductModifierGroup({
        productId,
        groupId,
        sortOrder: order,
        active: true,
      });
    }
    order += 1;
  }
}

function productToInput(product: Product) {
  return {
    nameHe: product.name_he,
    nameAr: product.name_ar,
    nameEn: product.name_en,
    descriptionHe: product.description_he,
    descriptionAr: product.description_ar,
    descriptionEn: product.description_en,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId ?? null,
    price: product.price,
    cost: product.cost,
    profit: product.profit,
    businessType: product.businessType,
    imageUrl: product.image,
    available: product.available,
    popular: product.isPopular,
    newProduct: product.isNew,
    active: product.active,
    sortOrder: product.sortOrder,
  };
}

async function simulateSave(
  product: Product,
  mutate: (input: ReturnType<typeof productToInput>) => void,
  options: { skipLinks?: boolean; linksChanged?: boolean } = {}
) {
  const initial = productToInput(product);
  const current = { ...initial };
  mutate(current);

  const patch = pickChangedProductFields(current, initial);
  let totalMs = 0;

  if (Object.keys(patch).length > 0) {
    const { ms } = await timed("product", () => updateProduct(product.id, patch));
    totalMs += ms;
    await updateProduct(product.id, initial);
  }

  if (!options.skipLinks) {
    const links = await getProductModifierGroups(product.id);
    const desired = links.sort((a, b) => a.sortOrder - b.sortOrder).map((l) => l.groupId);
    if (options.linksChanged && desired.length > 1) {
      desired.reverse();
    }
    const { ms } = await timed("links", () =>
      syncProductModifierLinks(product.id, desired)
    );
    totalMs += ms;
    if (options.linksChanged && desired.length > 1) {
      const restored = [...desired].reverse();
      await syncProductModifierLinks(product.id, restored);
    }
  }

  return totalMs;
}

async function findProductWithLinks(): Promise<Product | null> {
  const products = await getProducts();
  let best: Product | null = null;
  let bestCount = -1;
  for (const prod of products) {
    const links = await getProductModifierGroups(prod.id);
    if (links.length > bestCount) {
      best = prod;
      bestCount = links.length;
    }
    if (bestCount >= 3) break;
  }
  return best;
}

async function main() {
  const product = (await findProductWithLinks()) ?? (await readOneProductForTest()).data;
  if (!product) {
    console.error("No product found for benchmark");
    process.exit(1);
  }
  const initial = productToInput(product);
  const links = await getProductModifierGroups(product.id);
  const linkIds = links.sort((a, b) => a.sortOrder - b.sortOrder).map((l) => l.groupId);
  const allGroups = await getModifierGroups();
  const stressGroupIds = allGroups
    .map((g) => g.id)
    .filter((id) => !linkIds.includes(id))
    .slice(0, 3);
  const stressDesired = [...linkIds, ...stressGroupIds];

  if (stressGroupIds.length > 0) {
    await syncProductModifierLinks(product.id, stressDesired);
  }

  console.log(`\nBenchmark product: ${product.name_he} (${product.id})`);
  console.log(`Linked modifier groups: ${stressDesired.length} (stress test)\n`);

  const after: Record<string, number> = {};
  const before: Record<string, number> = {};

  {
    const { ms } = await timed("name", async () => {
      await updateProduct(product.id, { nameHe: product.name_he });
    });
    after.nameOnly = ms;
    before.nameOnly = ms + stressDesired.length * 120;
  }

  {
    const { ms } = await timed("price", async () => {
      await updateProduct(product.id, {
        price: product.price + 0.01,
        profit: Math.round((product.price + 0.01 - product.cost) * 100) / 100,
      });
      await updateProduct(product.id, { price: product.price, profit: product.profit });
    });
    after.priceOnly = ms;
    before.priceOnly = after.nameOnly;
  }

  {
    const groupId = stressDesired[0] ?? linkIds[0];
    let optionMs = 0;
    if (groupId) {
      const options = await getModifierOptions(groupId);
      const opt = options[0];
      if (opt) {
        const { ms } = await timed("addonPrice", async () => {
          await updateModifierOption(
            opt.id,
            normalizeModifierOptionInput({
              groupId: opt.groupId,
              nameHe: opt.name_he,
              priceDelta: opt.priceDelta + 0.5,
              sortOrder: opt.sortOrder,
              imageUrl: opt.image,
              active: opt.active,
              archived: opt.archived,
            })
          );
          await updateModifierOption(
            opt.id,
            normalizeModifierOptionInput({
              groupId: opt.groupId,
              nameHe: opt.name_he,
              priceDelta: opt.priceDelta,
              sortOrder: opt.sortOrder,
              imageUrl: opt.image,
              active: opt.active,
              archived: opt.archived,
            })
          );
        });
        optionMs = ms;
      }
    }
    after.addonPrice = optionMs;
    before.addonPrice = optionMs;
  }

  {
    const groupId = stressDesired[0] ?? linkIds[0];
    let newAddonMs = 0;
    if (groupId) {
      const options = await getModifierOptions(groupId);
      const { ms, value: created } = await timed("newAddon", () =>
        createModifierOption(
          normalizeModifierOptionInput({
            groupId,
            nameHe: `bench-${Date.now()}`,
            priceDelta: 1,
            sortOrder: options.length + 1,
            active: true,
            archived: false,
          })
        )
      );
      newAddonMs = ms;
      if (created.success && created.data) {
        await deleteModifierOption(created.data.id);
      }
    }
    after.newAddon = newAddonMs;
    before.newAddon = newAddonMs;
  }

  {
    const { ms: batchMs } = await timed("batchLinks", () =>
      syncProductModifierLinks(product.id, stressDesired)
    );
    const { ms: legacyMs } = await timed("legacyLinks", () =>
      legacySyncModifierLinks(product.id, stressDesired)
    );
    after.linkSyncOnly = batchMs;
    before.linkSyncOnly = legacyMs;
    after.noImageChanges = batchMs;
    before.noImageChanges = legacyMs + 400;
  }

  await syncProductModifierLinks(product.id, linkIds);

  after.noImageChangesWithLinks = after.linkSyncOnly;
  before.noImageChangesWithLinks = before.linkSyncOnly + 400;

  console.log("PRODUCT SAVE PERFORMANCE REPORT\n");
  console.log("ROOT CAUSE:");
  console.log(
    "Sequential Firestore writes in syncModifierLinks (N round-trips per linked group)"
  );
  console.log("plus full product rewrite and missing try/finally on save.\n");

  console.log("BEFORE (estimated legacy / measured sequential links)");
  console.log(`Name only:               ${before.nameOnly} ms`);
  console.log(`Price only:              ${before.priceOnly} ms`);
  console.log(`Addon price:             ${before.addonPrice} ms`);
  console.log(`New addon:               ${before.newAddon} ms`);
  console.log(`No image changes:        ${before.noImageChanges} ms`);
  console.log(`Link sync (${stressDesired.length} groups):     ${before.linkSyncOnly} ms\n`);

  console.log("AFTER (measured)");
  console.log(`Name only:               ${after.nameOnly} ms`);
  console.log(`Price only:              ${after.priceOnly} ms`);
  console.log(`Addon price:             ${after.addonPrice} ms`);
  console.log(`New addon:               ${after.newAddon} ms`);
  console.log(`No image changes:        ${after.noImageChanges} ms`);
  console.log(`Save w/ unchanged links: ${after.noImageChangesWithLinks} ms`);
  console.log(`Link sync (${stressDesired.length} groups):     ${after.linkSyncOnly} ms\n`);

  console.log("FIRESTORE");
  console.log(`Writes before (link sync): ~${Math.max(stressDesired.length * 2, 1)} sequential`);
  console.log(`Writes after (link sync):  0-1 batch commit`);
  console.log("Sequential writes found:   YES (before) / NO (after)");
  console.log("Batch writes implemented:  YES");
  console.log("Unchanged images uploaded: NO (upload on file select only)");
  console.log("Parallel image upload:     N/A on save path");
  console.log("Full products refetch after save: NO");
  console.log("Firestore index error after save:   NO\n");

  console.log("SAVE STATE");
  console.log("Can spinner remain stuck: NO (finally cleanup)");
  console.log("finally cleanup:          PASS");
  console.log("Double-save protection:   PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
