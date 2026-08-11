/**
 * Controlled live Firestore integration test for product-editor atomic saves.
 * Creates uniquely named test data and removes every test document in finally.
 */
import { config } from "dotenv";
config({ path: ".env" });

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getDb, getFirebaseAuth } from "../src/lib/firebase";
import { COLLECTIONS } from "../src/lib/firebase/collections";
import { getProducts } from "../src/services/productService";
import { saveProductEditorChanges } from "../src/services/productEditorSaveService";
import { loadProductBuilderConfig } from "../src/services/modifierService";
import {
  normalizeModifierGroupInput,
  normalizeModifierOptionInput,
} from "../src/lib/validation/modifier-normalize";
import type { ProductInput } from "../src/lib/validation/schemas";
import type { PendingModifierChanges } from "../src/features/admin/product-form/product-modifier-pending";

const emptyModifiers = (): PendingModifierChanges => ({
  groupUpdates: [],
  optionUpdates: [],
  optionCreates: [],
  groupCreates: [],
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function timed<T>(operation: () => Promise<T>) {
  const started = performance.now();
  const value = await operation();
  return { value, ms: Math.round(performance.now() - started) };
}

async function main() {
  const db = getDb();
  const auth = getFirebaseAuth();
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  assert(email && password, "Admin test credentials are not configured");
  await signInWithEmailAndPassword(auth, email, password);
  const runId = `__product_save_test_${Date.now()}`;
  const products = await getProducts();
  const source = products[0];
  assert(source, "A source product is required for valid category/image data");

  const productValues: ProductInput = {
    nameHe: runId,
    nameAr: runId,
    nameEn: runId,
    descriptionHe: "controlled test",
    descriptionAr: "controlled test",
    descriptionEn: "controlled test",
    categoryId: source.categoryId,
    subcategoryId: null,
    price: 10,
    cost: 2,
    profit: 8,
    businessType: source.businessType,
    imageUrl: source.image,
    available: false,
    popular: false,
    newProduct: false,
    active: false,
    sortOrder: 999999,
  };

  let productId: string | null = null;
  let groupId: string | null = null;
  let links: Awaited<
    ReturnType<typeof saveProductEditorChanges>
  > extends { success: true; data: infer T }
    ? T extends { links: infer L }
      ? L
      : never
    : never = [];

  const report: Record<string, { ms: number; writes: number }> = {};

  try {
    const setup = await saveProductEditorChanges({
      productId: null,
      productValues,
      productPatch: {},
      existingLinks: [],
      desiredGroupIds: [],
      modifiers: {
        ...emptyModifiers(),
        groupCreates: [
          {
            key: `${runId}:group`,
            data: normalizeModifierGroupInput({
              nameHe: runId,
              selectionType: "multiple",
              requirement: "optional",
              minSelections: 0,
              maxSelections: 3,
              sortOrder: 999999,
              active: true,
              archived: false,
              displayType: "buttons",
            }),
            options: [1, 2, 3].map((index) =>
              normalizeModifierOptionInput({
                groupId: "__pending_group__",
                nameHe: `${runId}:option:${index}`,
                priceDelta: index,
                sortOrder: index,
                active: true,
                archived: false,
              })
            ),
          },
        ],
      },
    });
    assert(setup.success, setup.success ? "" : setup.error);
    productId = setup.data.productId;
    groupId = setup.data.createdGroupIds[0] ?? null;
    links = setup.data.links;
    assert(groupId, "Controlled modifier group was not created");

    const builder = await loadProductBuilderConfig(productId);
    assert(builder.groups.length === 1, "Storefront builder did not load the linked group");
    assert(builder.groups[0]?.options.length === 3, "Storefront builder did not load group options");

    const optionSnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.modifierOptions),
        where("groupId", "==", groupId)
      )
    );
    const optionDocs = optionSnapshot.docs.sort(
      (a, b) => Number(a.data().sortOrder) - Number(b.data().sortOrder)
    );
    assert(optionDocs.length === 3, "Setup should create three options");

    const option1 = optionDocs[0]!;
    const option2 = optionDocs[1]!;
    const option3 = optionDocs[2]!;

    // TEST A — price currently in input is included without blur.
    const addonPrice = await timed(() =>
      saveProductEditorChanges({
        productId,
        productValues,
        productPatch: {},
        existingLinks: links,
        desiredGroupIds: [groupId!],
        modifiers: {
          ...emptyModifiers(),
          optionUpdates: [
            {
              id: option1.id,
              data: normalizeModifierOptionInput({
                ...option1.data(),
                groupId: groupId!,
                nameHe: String(option1.data().nameHe),
                priceDelta: 7,
              }),
            },
          ],
        },
      })
    );
    assert(addonPrice.value.success, "Addon price save failed");
    assert((await getDoc(option1.ref)).data()?.priceDelta === 7, "Addon price was not saved");
    report.addonPrice = { ms: addonPrice.ms, writes: 1 };

    // TEST B — option name currently in input is included without blur.
    const addonName = await timed(() =>
      saveProductEditorChanges({
        productId,
        productValues,
        productPatch: {},
        existingLinks: links,
        desiredGroupIds: [groupId!],
        modifiers: {
          ...emptyModifiers(),
          optionUpdates: [
            {
              id: option1.id,
              data: normalizeModifierOptionInput({
                ...option1.data(),
                groupId: groupId!,
                nameHe: `${runId}:renamed`,
                priceDelta: 7,
              }),
            },
          ],
        },
      })
    );
    assert(addonName.value.success, "Addon name save failed");
    assert(
      (await getDoc(option1.ref)).data()?.nameHe === `${runId}:renamed`,
      "Addon name was not saved"
    );
    report.addonName = { ms: addonName.ms, writes: 1 };

    // TEST C — current new-option draft is treated exactly like an Enter-staged option.
    const newAddon = await timed(() =>
      saveProductEditorChanges({
        productId,
        productValues,
        productPatch: {},
        existingLinks: links,
        desiredGroupIds: [groupId!],
        modifiers: {
          ...emptyModifiers(),
          optionCreates: [
            {
              key: `draft:${groupId}`,
              data: normalizeModifierOptionInput({
                groupId: groupId!,
                nameHe: `${runId}:without-enter`,
                priceDelta: 4,
                sortOrder: 4,
                active: true,
                archived: false,
              }),
            },
          ],
        },
      })
    );
    assert(newAddon.value.success, "New addon without Enter failed");
    const createdDraft = await getDocs(
      query(
        collection(db, COLLECTIONS.modifierOptions),
        where("groupId", "==", groupId)
      )
    );
    assert(
      createdDraft.docs.some(
        (snapshot) => snapshot.data().nameHe === `${runId}:without-enter`
      ),
      "New addon draft was not saved"
    );
    report.newAddon = { ms: newAddon.ms, writes: 1 };

    // TEST D — three changed docs are one batch commit, not sequential awaits.
    const threeAddons = await timed(() =>
      saveProductEditorChanges({
        productId,
        productValues,
        productPatch: {},
        existingLinks: links,
        desiredGroupIds: [groupId!],
        modifiers: {
          ...emptyModifiers(),
          optionUpdates: [option1, option2, option3].map(
            (snapshot, index) => ({
              id: snapshot.id,
              data: normalizeModifierOptionInput({
                ...snapshot.data(),
                groupId: groupId!,
                nameHe:
                  index === 0
                    ? `${runId}:renamed`
                    : String(snapshot.data().nameHe),
                priceDelta: 20 + index,
              }),
            })
          ),
        },
      })
    );
    assert(threeAddons.value.success, "Three-addon save failed");
    assert(threeAddons.value.data.writes === 3, "Three-addon diff should contain three writes");
    report.threeAddons = { ms: threeAddons.ms, writes: 3 };

    // TEST E — product and option are committed together.
    const productAndAddon = await timed(() =>
      saveProductEditorChanges({
        productId,
        productValues: { ...productValues, price: 11, profit: 9 },
        productPatch: { price: 11, profit: 9 },
        existingLinks: links,
        desiredGroupIds: [groupId!],
        modifiers: {
          ...emptyModifiers(),
          optionUpdates: [
            {
              id: option2.id,
              data: normalizeModifierOptionInput({
                ...option2.data(),
                groupId: groupId!,
                nameHe: String(option2.data().nameHe),
                priceDelta: 30,
              }),
            },
          ],
        },
      })
    );
    assert(productAndAddon.value.success, "Combined save failed");
    assert(productAndAddon.value.data.writes === 2, "Combined diff should contain two writes");
    report.productAndAddon = { ms: productAndAddon.ms, writes: 2 };

    // TEST F — invalid pending state fails before commit and the caller object remains intact.
    const invalidChanges: PendingModifierChanges = {
      ...emptyModifiers(),
      optionUpdates: [
        {
          id: option3.id,
          data: {
            ...normalizeModifierOptionInput({
              ...option3.data(),
              groupId: groupId!,
              nameHe: String(option3.data().nameHe),
            }),
            nameHe: "",
          },
        },
      ],
    };
    const beforeFailure = (await getDoc(option3.ref)).data()?.nameHe;
    const failed = await saveProductEditorChanges({
      productId,
      productValues,
      productPatch: {},
      existingLinks: links,
      desiredGroupIds: [groupId!],
      modifiers: invalidChanges,
    });
    assert(!failed.success, "Invalid save should fail");
    assert(invalidChanges.optionUpdates[0]?.data.nameHe === "", "Pending input was mutated");
    assert(
      (await getDoc(option3.ref)).data()?.nameHe === beforeFailure,
      "Failed batch changed Firestore"
    );

    // TEST H — exact no-op produces zero Firestore writes and no commit.
    const noChanges = await timed(() =>
      saveProductEditorChanges({
        productId,
        productValues,
        productPatch: {},
        existingLinks: links,
        desiredGroupIds: [groupId!],
        modifiers: emptyModifiers(),
      })
    );
    assert(noChanges.value.success, "No-op save failed");
    assert(noChanges.value.data.writes === 0, "No-op save should have zero writes");
    report.noChanges = { ms: noChanges.ms, writes: 0 };

    console.log(JSON.stringify({ runId, report, failedSavePreserved: true }, null, 2));
  } finally {
    const cleanup = writeBatch(db);

    if (productId) {
      const productLinks = await getDocs(
        query(
          collection(db, COLLECTIONS.productModifierGroups),
          where("productId", "==", productId)
        )
      );
      productLinks.docs.forEach((snapshot) => cleanup.delete(snapshot.ref));
      cleanup.delete(doc(db, COLLECTIONS.products, productId));
    }

    if (groupId) {
      const groupOptions = await getDocs(
        query(
          collection(db, COLLECTIONS.modifierOptions),
          where("groupId", "==", groupId)
        )
      );
      groupOptions.docs.forEach((snapshot) => cleanup.delete(snapshot.ref));
      cleanup.delete(doc(db, COLLECTIONS.modifierGroups, groupId));
    }

    await cleanup.commit();
    await signOut(auth);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
