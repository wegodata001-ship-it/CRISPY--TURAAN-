import {
  collection,
  doc,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { sanitizeFirestoreData } from "@/lib/firebase/sanitize-firestore-data";
import { failure, success, type ServiceResult } from "@/lib/errors";
import { productSchema, type ProductInput } from "@/lib/validation/schemas";
import {
  modifierGroupSchema,
  modifierOptionSchema,
} from "@/lib/validation/modifier-schemas";
import { nowTimestamp } from "@/types/firestore";
import type { ProductModifierGroup } from "@/types/modifiers";
import type { PendingModifierChanges } from "@/features/admin/product-form/product-modifier-pending";

export interface ProductEditorSaveInput {
  productId: string | null;
  productValues: ProductInput;
  productPatch: Partial<ProductInput>;
  existingLinks: ProductModifierGroup[];
  desiredGroupIds: string[];
  modifiers: PendingModifierChanges;
}

export interface ProductEditorSaveResult {
  productId: string;
  writes: number;
  createdGroupIds: string[];
  links: ProductModifierGroup[];
}

/**
 * Persists the complete product editor diff in one atomic Firestore commit.
 * No reads occur here: the editor supplies its initial link snapshot.
 */
export async function saveProductEditorChanges(
  input: ProductEditorSaveInput
): Promise<ServiceResult<ProductEditorSaveResult>> {
  try {
    const db = getDb();
    const batch = writeBatch(db);
    const now = nowTimestamp();
    const productRef = input.productId
      ? doc(db, COLLECTIONS.products, input.productId)
      : doc(collection(db, COLLECTIONS.products));
    let writes = 0;

    if (!input.productId) {
      const parsed = productSchema.parse(input.productValues);
      batch.set(
        productRef,
        sanitizeFirestoreData({
          ...parsed,
          subcategoryId: parsed.subcategoryId || null,
          createdAt: now,
          updatedAt: now,
        })
      );
      writes += 1;
    } else if (Object.keys(input.productPatch).length > 0) {
      batch.update(
        productRef,
        sanitizeFirestoreData({
          ...input.productPatch,
          ...(input.productPatch.subcategoryId === ""
            ? { subcategoryId: null }
            : {}),
          updatedAt: now,
        })
      );
      writes += 1;
    }

    for (const group of input.modifiers.groupUpdates) {
      const parsed = modifierGroupSchema.parse(group.data);
      batch.update(
        doc(db, COLLECTIONS.modifierGroups, group.id),
        sanitizeFirestoreData({ ...parsed, updatedAt: now })
      );
      writes += 1;
    }

    for (const option of input.modifiers.optionUpdates) {
      const parsed = modifierOptionSchema.parse(option.data);
      batch.update(
        doc(db, COLLECTIONS.modifierOptions, option.id),
        sanitizeFirestoreData({ ...parsed, updatedAt: now })
      );
      writes += 1;
    }

    for (const option of input.modifiers.optionCreates) {
      const parsed = modifierOptionSchema.parse(option.data);
      const optionRef = doc(collection(db, COLLECTIONS.modifierOptions));
      batch.set(
        optionRef,
        sanitizeFirestoreData({
          ...parsed,
          createdAt: now,
          updatedAt: now,
        })
      );
      writes += 1;
    }

    const createdGroupIds: string[] = [];
    for (const pendingGroup of input.modifiers.groupCreates) {
      const parsedGroup = modifierGroupSchema.parse(pendingGroup.data);
      const groupRef = doc(collection(db, COLLECTIONS.modifierGroups));
      createdGroupIds.push(groupRef.id);
      batch.set(
        groupRef,
        sanitizeFirestoreData({
          ...parsedGroup,
          createdAt: now,
          updatedAt: now,
        })
      );
      writes += 1;

      pendingGroup.options.forEach((option, index) => {
        const parsedOption = modifierOptionSchema.parse({
          ...option,
          groupId: groupRef.id,
          sortOrder: index + 1,
        });
        const optionRef = doc(collection(db, COLLECTIONS.modifierOptions));
        batch.set(
          optionRef,
          sanitizeFirestoreData({
            ...parsedOption,
            createdAt: now,
            updatedAt: now,
          })
        );
        writes += 1;
      });
    }

    const desiredGroupIds = [...input.desiredGroupIds, ...createdGroupIds];
    const desiredSet = new Set(desiredGroupIds);
    const existingByGroupId = new Map(
      input.existingLinks.map((link) => [link.groupId, link])
    );
    const resultingLinks: ProductModifierGroup[] = [];

    for (const link of input.existingLinks) {
      if (!desiredSet.has(link.groupId)) {
        batch.delete(doc(db, COLLECTIONS.productModifierGroups, link.id));
        writes += 1;
      }
    }

    desiredGroupIds.forEach((groupId, index) => {
      const sortOrder = index + 1;
      const existing = existingByGroupId.get(groupId);
      if (!existing) {
        const linkRef = doc(
          collection(db, COLLECTIONS.productModifierGroups)
        );
        batch.set(
          linkRef,
          sanitizeFirestoreData({
            productId: productRef.id,
            groupId,
            sortOrder,
            active: true,
          })
        );
        writes += 1;
        resultingLinks.push({
          id: linkRef.id,
          productId: productRef.id,
          groupId,
          sortOrder,
          active: true,
        });
      } else if (
        existing.sortOrder !== sortOrder ||
        existing.productId !== productRef.id
      ) {
        batch.update(
          doc(db, COLLECTIONS.productModifierGroups, existing.id),
          { productId: productRef.id, sortOrder }
        );
        writes += 1;
        resultingLinks.push({
          ...existing,
          productId: productRef.id,
          sortOrder,
        });
      } else {
        resultingLinks.push(existing);
      }
    });

    if (writes > 500) {
      throw new Error(`Product save exceeds Firestore batch limit (${writes})`);
    }

    if (writes > 0) {
      await batch.commit();
    }

    return success({
      productId: productRef.id,
      writes,
      createdGroupIds,
      links: resultingLinks,
    });
  } catch (error) {
    return failure(error, "Failed to save product changes");
  }
}
