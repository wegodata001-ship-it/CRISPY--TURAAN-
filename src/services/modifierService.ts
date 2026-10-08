import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteField,
  type Unsubscribe,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { sanitizeFirestoreData } from "@/lib/firebase/sanitize-firestore-data";
import { ServiceError, type ServiceResult, success, failure } from "@/lib/errors";
import {
  mapModifierGroup,
  mapModifierOption,
  mapProductModifierGroup,
  mapProductModifierOption,
  mapBusinessRule,
  mapProductSuggestion,
  mapInventoryLink,
} from "@/lib/mappers/modifier-mappers";
import { buildProductBuilderConfig } from "@/lib/product-builder/engine";
import {
  modifierGroupSchema,
  modifierOptionSchema,
  productModifierGroupSchema,
  productModifierOptionSchema,
  businessRuleSchema,
  productSuggestionSchema,
  inventoryLinkSchema,
  type ModifierGroupInput,
  type ModifierOptionInput,
  type ProductModifierGroupInput,
  type ProductModifierOptionInput,
  type BusinessRuleInput,
  type ProductSuggestionInput,
  type InventoryLinkInput,
} from "@/lib/validation/modifier-schemas";
import {
  normalizeModifierGroupInput,
  normalizeModifierOptionInput,
} from "@/lib/validation/modifier-normalize";
import { nowTimestamp } from "@/types/firestore";
import type { FirestoreDoc } from "@/types/firestore";
import type {
  FirestoreModifierGroup,
  FirestoreModifierOption,
  FirestoreProductModifierGroup,
  FirestoreProductModifierOption,
  FirestoreBusinessRule,
  FirestoreProductSuggestion,
  FirestoreInventoryLink,
} from "@/types/modifier-firestore";
import type {
  ModifierGroup,
  ModifierOption,
  ProductModifierGroup,
  ProductModifierOption,
  BusinessRule,
  ProductSuggestion,
  InventoryLink,
  ProductBuilderConfig,
} from "@/types/modifiers";

function docTo<T>(id: string, data: DocumentData): FirestoreDoc<T> {
  return { id, ...(data as T) };
}

// ─── Modifier Groups ───────────────────────────────────────────────

export async function getModifierGroups(includeArchived = false): Promise<ModifierGroup[]> {
  const db = getDb();
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.modifierGroups), orderBy("sortOrder", "asc"))
  );
  return snapshot.docs
    .map((d) => mapModifierGroup(docTo<FirestoreModifierGroup>(d.id, d.data())))
    .filter((g) => includeArchived || !g.archived);
}

export function subscribeToModifierGroups(
  onData: (groups: ModifierGroup[]) => void,
  onError: (msg: string) => void,
  includeArchived = false
): Unsubscribe {
  const db = getDb();
  return onSnapshot(
    query(collection(db, COLLECTIONS.modifierGroups), orderBy("sortOrder", "asc")),
    (snap) => {
      const groups = snap.docs
        .map((d) => mapModifierGroup(docTo<FirestoreModifierGroup>(d.id, d.data())))
        .filter((g) => includeArchived || !g.archived);
      onData(groups);
    },
    (err) => onError(err.message)
  );
}

export async function createModifierGroup(input: ModifierGroupInput): Promise<ServiceResult<ModifierGroup>> {
  try {
    const parsed = modifierGroupSchema.parse(normalizeModifierGroupInput(input));
    const db = getDb();
    const now = nowTimestamp();
    const data: FirestoreModifierGroup = { ...parsed, createdAt: now, updatedAt: now };
    const ref = await addDoc(collection(db, COLLECTIONS.modifierGroups), sanitizeFirestoreData(data));
    return success(mapModifierGroup({ id: ref.id, ...data }));
  } catch (error) {
    return failure(error, "Failed to create modifier group");
  }
}

export async function updateModifierGroup(
  id: string,
  input: Partial<ModifierGroupInput>
): Promise<ServiceResult<ModifierGroup>> {
  try {
    const db = getDb();
    const ref = doc(db, COLLECTIONS.modifierGroups, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return failure(new ServiceError("Not found", "NOT_FOUND"));

    const existing = snap.data() as FirestoreModifierGroup;
    const parsed = modifierGroupSchema.parse(
      normalizeModifierGroupInput({
        nameHe: input.nameHe ?? existing.nameHe,
        nameAr: input.nameAr ?? existing.nameAr,
        nameEn: input.nameEn ?? existing.nameEn,
        selectionType: input.selectionType ?? existing.selectionType,
        requirement: input.requirement ?? existing.requirement,
        minSelections: input.minSelections ?? existing.minSelections,
        maxSelections: input.maxSelections ?? existing.maxSelections,
        displayType: input.displayType ?? existing.displayType,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        color: input.color ?? existing.color,
        icon: input.icon ?? existing.icon,
        active: input.active ?? existing.active,
        archived: input.archived ?? existing.archived,
      })
    );

    await updateDoc(ref, sanitizeFirestoreData({ ...parsed, updatedAt: nowTimestamp() }));
    const updated = await getDoc(ref);
    return success(mapModifierGroup(docTo<FirestoreModifierGroup>(updated.id, updated.data()!)));
  } catch (error) {
    return failure(error, "Failed to update modifier group");
  }
}

export async function deleteModifierGroup(id: string): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    await updateDoc(doc(db, COLLECTIONS.modifierGroups, id), {
      archived: true,
      active: false,
      updatedAt: nowTimestamp(),
    });
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to archive modifier group");
  }
}

export async function duplicateModifierGroup(id: string): Promise<ServiceResult<ModifierGroup>> {
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, COLLECTIONS.modifierGroups, id));
    if (!snap.exists()) return failure(new ServiceError("Not found", "NOT_FOUND"));
    const source = snap.data() as FirestoreModifierGroup;
    const now = nowTimestamp();
    const { createdAt: _c, updatedAt: _u, ...rest } = source;
    const groupData: FirestoreModifierGroup = {
      ...rest,
      nameHe: `${rest.nameHe} (copy)`,
      nameEn: `${rest.nameEn} (copy)`,
      sortOrder: rest.sortOrder + 1,
      createdAt: now,
      updatedAt: now,
    };
    const groupRef = await addDoc(collection(db, COLLECTIONS.modifierGroups), sanitizeFirestoreData(groupData));

    const optionsSnap = await getDocs(
      query(collection(db, COLLECTIONS.modifierOptions), where("groupId", "==", id))
    );
    for (const optDoc of optionsSnap.docs) {
      const opt = optDoc.data() as FirestoreModifierOption;
      const { createdAt: _oc, updatedAt: _ou, ...optRest } = opt;
      await addDoc(
        collection(db, COLLECTIONS.modifierOptions),
        sanitizeFirestoreData({
          ...optRest,
          groupId: groupRef.id,
          createdAt: now,
          updatedAt: now,
        })
      );
    }

    return success(mapModifierGroup({ id: groupRef.id, ...groupData }));
  } catch (error) {
    return failure(error, "Failed to duplicate modifier group");
  }
}

export async function reorderModifierGroups(ids: string[]): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    await Promise.all(
      ids.map((id, index) =>
        updateDoc(doc(db, COLLECTIONS.modifierGroups, id), {
          sortOrder: index + 1,
          updatedAt: nowTimestamp(),
        })
      )
    );
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to reorder modifier groups");
  }
}

// ─── Modifier Options ──────────────────────────────────────────────

function sortModifierOptions(options: ModifierOption[]): ModifierOption[] {
  return [...options].sort((a, b) => a.sortOrder - b.sortOrder || a.name_he.localeCompare(b.name_he));
}

export async function getModifierOptions(groupId?: string): Promise<ModifierOption[]> {
  const db = getDb();
  const q = groupId
    ? query(collection(db, COLLECTIONS.modifierOptions), where("groupId", "==", groupId))
    : collection(db, COLLECTIONS.modifierOptions);
  const snapshot = await getDocs(q);
  return sortModifierOptions(
    snapshot.docs.map((d) => mapModifierOption(docTo<FirestoreModifierOption>(d.id, d.data())))
  );
}

export function subscribeToModifierOptions(
  groupId: string | undefined,
  onData: (options: ModifierOption[]) => void,
  onError: (msg: string) => void
): Unsubscribe {
  const db = getDb();
  const q = groupId
    ? query(collection(db, COLLECTIONS.modifierOptions), where("groupId", "==", groupId))
    : collection(db, COLLECTIONS.modifierOptions);
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortModifierOptions(
          snap.docs.map((d) => mapModifierOption(docTo<FirestoreModifierOption>(d.id, d.data())))
        )
      );
    },
    (err) => onError(err.message)
  );
}

export async function createModifierOption(input: ModifierOptionInput): Promise<ServiceResult<ModifierOption>> {
  try {
    const parsed = modifierOptionSchema.parse(normalizeModifierOptionInput(input));
    const db = getDb();
    const now = nowTimestamp();
    const data: FirestoreModifierOption = { ...parsed, createdAt: now, updatedAt: now };
    const ref = await addDoc(collection(db, COLLECTIONS.modifierOptions), sanitizeFirestoreData(data));
    return success(mapModifierOption({ id: ref.id, ...data }));
  } catch (error) {
    return failure(error, "Failed to create modifier option");
  }
}

export async function updateModifierOption(
  id: string,
  input: Partial<ModifierOptionInput>
): Promise<ServiceResult<ModifierOption>> {
  try {
    const db = getDb();
    const ref = doc(db, COLLECTIONS.modifierOptions, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return failure(new ServiceError("Not found", "NOT_FOUND"));

    const existing = snap.data() as FirestoreModifierOption;
    const parsed = modifierOptionSchema.parse(
      normalizeModifierOptionInput({
        groupId: input.groupId ?? existing.groupId,
        nameHe: input.nameHe ?? existing.nameHe,
        nameAr: input.nameAr ?? existing.nameAr,
        nameEn: input.nameEn ?? existing.nameEn,
        priceDelta: input.priceDelta ?? existing.priceDelta,
        cost: input.cost ?? existing.cost,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        color: input.color ?? existing.color,
        icon: input.icon ?? existing.icon,
        imageUrl: input.imageUrl ?? existing.imageUrl,
        kitchenNote: input.kitchenNote ?? existing.kitchenNote,
        active: input.active ?? existing.active,
        archived: input.archived ?? existing.archived,
      })
    );

    await updateDoc(ref, sanitizeFirestoreData({ ...parsed, updatedAt: nowTimestamp() }));
    const updated = await getDoc(ref);
    return success(mapModifierOption(docTo<FirestoreModifierOption>(updated.id, updated.data()!)));
  } catch (error) {
    return failure(error, "Failed to update modifier option");
  }
}

export async function deleteModifierOption(id: string): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    await updateDoc(doc(db, COLLECTIONS.modifierOptions, id), {
      archived: true,
      active: false,
      updatedAt: nowTimestamp(),
    });
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to archive modifier option");
  }
}

export type ModifierOptionDraftInput = {
  id?: string;
  nameHe: string;
  nameAr?: string;
  nameEn?: string;
  priceDelta: number;
  sortOrder: number;
  active?: boolean;
};

/** Create or update a group and all of its options in one write. Archives removed options. */
export async function saveModifierGroupWithOptions(
  groupId: string | null,
  groupInput: ModifierGroupInput,
  optionDrafts: ModifierOptionDraftInput[],
  archiveOptionIds: string[] = []
): Promise<ServiceResult<ModifierGroup>> {
  try {
    const parsedGroup = modifierGroupSchema.parse(normalizeModifierGroupInput(groupInput));
    const named = optionDrafts.filter((option) => option.nameHe.trim());
    if (named.length === 0) {
      return failure(new ServiceError("At least one named option is required", "VALIDATION"));
    }
    if (parsedGroup.maxSelections < 1) {
      return failure(new ServiceError("maxSelections must be at least 1", "VALIDATION"));
    }
    if (parsedGroup.minSelections > parsedGroup.maxSelections) {
      return failure(new ServiceError("minSelections cannot exceed maxSelections", "VALIDATION"));
    }
    if (parsedGroup.requirement === "required" && parsedGroup.minSelections < 1) {
      return failure(new ServiceError("Required groups need minSelections ≥ 1", "VALIDATION"));
    }

    const db = getDb();
    const now = nowTimestamp();
    let resolvedId = groupId;
    let createdAt = now;

    if (resolvedId) {
      const ref = doc(db, COLLECTIONS.modifierGroups, resolvedId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return failure(new ServiceError("Not found", "NOT_FOUND"));
      createdAt = (snap.data() as FirestoreModifierGroup).createdAt;
      await updateDoc(ref, sanitizeFirestoreData({ ...parsedGroup, updatedAt: now }));
    } else {
      const data: FirestoreModifierGroup = { ...parsedGroup, createdAt: now, updatedAt: now };
      const ref = await addDoc(collection(db, COLLECTIONS.modifierGroups), sanitizeFirestoreData(data));
      resolvedId = ref.id;
    }

    const batch = writeBatch(db);
    named.forEach((option, index) => {
      const parsed = modifierOptionSchema.parse(
        normalizeModifierOptionInput({
          groupId: resolvedId!,
          nameHe: option.nameHe,
          nameAr: option.nameAr,
          nameEn: option.nameEn,
          priceDelta: option.priceDelta,
          sortOrder: option.sortOrder ?? index,
          active: option.active ?? true,
          archived: false,
        })
      );
      if (option.id) {
        batch.update(
          doc(db, COLLECTIONS.modifierOptions, option.id),
          sanitizeFirestoreData({ ...parsed, updatedAt: now })
        );
      } else {
        const optionRef = doc(collection(db, COLLECTIONS.modifierOptions));
        batch.set(
          optionRef,
          sanitizeFirestoreData({ ...parsed, createdAt: now, updatedAt: now })
        );
      }
    });

    for (const optionId of archiveOptionIds) {
      batch.update(doc(db, COLLECTIONS.modifierOptions, optionId), {
        archived: true,
        active: false,
        updatedAt: now,
      });
    }

    await batch.commit();
    return success(
      mapModifierGroup({
        id: resolvedId,
        ...parsedGroup,
        createdAt,
        updatedAt: now,
      })
    );
  } catch (error) {
    return failure(error, "Failed to save modifier group with options");
  }
}

export async function reorderModifierOptions(ids: string[]): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    await Promise.all(
      ids.map((id, index) =>
        updateDoc(doc(db, COLLECTIONS.modifierOptions, id), {
          sortOrder: index + 1,
          updatedAt: nowTimestamp(),
        })
      )
    );
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to reorder modifier options");
  }
}

// ─── Product Modifier Groups ───────────────────────────────────────

export async function getProductModifierGroups(productId?: string): Promise<ProductModifierGroup[]> {
  const db = getDb();
  const q = productId
    ? query(
        collection(db, COLLECTIONS.productModifierGroups),
        where("productId", "==", productId)
      )
    : query(collection(db, COLLECTIONS.productModifierGroups), orderBy("sortOrder", "asc"));
  const snapshot = await getDocs(q);
  const items = snapshot.docs.map((d) =>
    mapProductModifierGroup(docTo<FirestoreProductModifierGroup>(d.id, d.data()))
  );
  if (productId) {
    return items.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return items;
}

export function subscribeToProductModifierGroups(
  productId: string,
  onData: (links: ProductModifierGroup[]) => void,
  onError: (msg: string) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.productModifierGroups),
      where("productId", "==", productId)
    ),
    (snap) => {
      onData(
        snap.docs
          .map((d) =>
            mapProductModifierGroup(
              docTo<FirestoreProductModifierGroup>(d.id, d.data())
            )
          )
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
    },
    (err) => onError(err.message)
  );
}

export function subscribeToAllProductModifierGroups(
  onData: (links: ProductModifierGroup[]) => void,
  onError: (msg: string) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(
    collection(db, COLLECTIONS.productModifierGroups),
    (snap) =>
      onData(
        snap.docs.map((document) =>
          mapProductModifierGroup(
            docTo<FirestoreProductModifierGroup>(document.id, document.data())
          )
        )
      ),
    (error) => onError(error.message)
  );
}

export async function linkProductModifierGroup(
  input: ProductModifierGroupInput
): Promise<ServiceResult<ProductModifierGroup>> {
  try {
    const parsed = productModifierGroupSchema.parse(input);
    const db = getDb();
    const existing = await getDocs(
      query(
        collection(db, COLLECTIONS.productModifierGroups),
        where("productId", "==", parsed.productId),
        where("groupId", "==", parsed.groupId)
      )
    );
    if (!existing.empty) {
      return failure(new ServiceError("Group already linked", "DUPLICATE"));
    }
    const ref = await addDoc(collection(db, COLLECTIONS.productModifierGroups), parsed);
    return success(mapProductModifierGroup({ id: ref.id, ...parsed }));
  } catch (error) {
    return failure(error, "Failed to link modifier group");
  }
}

export async function updateProductModifierGroup(
  id: string,
  input: Partial<ProductModifierGroupInput>
): Promise<ServiceResult<ProductModifierGroup>> {
  try {
    const db = getDb();
    const ref = doc(db, COLLECTIONS.productModifierGroups, id);
    await updateDoc(ref, input);
    const snap = await getDoc(ref);
    if (!snap.exists()) return failure(new ServiceError("Not found", "NOT_FOUND"));
    return success(mapProductModifierGroup(docTo<FirestoreProductModifierGroup>(snap.id, snap.data())));
  } catch (error) {
    return failure(error, "Failed to update product modifier group");
  }
}

export async function unlinkProductModifierGroup(id: string): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    await deleteDoc(doc(db, COLLECTIONS.productModifierGroups, id));
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to unlink modifier group");
  }
}

/** Batch-sync product ↔ modifier group links (1 read + 1 batch commit max) */
export async function syncProductModifierLinks(
  productId: string,
  desiredLinks: Array<
    Pick<
      ProductModifierGroup,
      "groupId" | "requirement" | "selectionType" | "displayType" | "active"
    >
  >
): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    const existingSnap = await getDocs(
      query(
        collection(db, COLLECTIONS.productModifierGroups),
        where("productId", "==", productId)
      )
    );

    const existing = existingSnap.docs.map((d) =>
      mapProductModifierGroup(docTo<FirestoreProductModifierGroup>(d.id, d.data()))
    );
    const existingByGroupId = new Map(existing.map((l) => [l.groupId, l]));
    const desiredSet = new Set(desiredLinks.map((link) => link.groupId));

    const batch = writeBatch(db);
    let writes = 0;

    for (const link of existing) {
      if (!desiredSet.has(link.groupId)) {
        batch.delete(doc(db, COLLECTIONS.productModifierGroups, link.id));
        writes += 1;
      }
    }

    desiredLinks.forEach((desired, index) => {
      const groupId = desired.groupId;
      const sortOrder = index + 1;
      const link = existingByGroupId.get(groupId);
      if (link) {
        const patch: Record<string, unknown> = {};
        if (link.sortOrder !== sortOrder) patch.sortOrder = sortOrder;
        if (link.active !== desired.active) patch.active = desired.active;
        for (const key of ["requirement", "selectionType", "displayType"] as const) {
          if (link[key] !== desired[key]) {
            patch[key] = desired[key] ?? deleteField();
          }
        }
        if (Object.keys(patch).length > 0) {
          batch.update(doc(db, COLLECTIONS.productModifierGroups, link.id), patch);
          writes += 1;
        }
      } else {
        const ref = doc(collection(db, COLLECTIONS.productModifierGroups));
        batch.set(
          ref,
          sanitizeFirestoreData({
            productId,
            groupId,
            sortOrder,
            active: desired.active !== false,
            requirement: desired.requirement,
            selectionType: desired.selectionType,
            displayType: desired.displayType,
          })
        );
        writes += 1;
      }
    });

    if (writes > 0) {
      await batch.commit();
    }

    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to sync product modifier links");
  }
}

const CATEGORY_ADDON_SETTINGS_ID = "category_addon_assignments";
const PRODUCT_EXCLUSION_SETTINGS_ID = "product_addon_exclusions";

function parseCategoryAddonLinks(
  raw: unknown
): import("@/lib/product-builder/category-addons").CategoryAddonLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? `${row.categoryId ?? ""}__${row.groupId ?? ""}`),
        categoryId: String(row.categoryId ?? ""),
        groupId: String(row.groupId ?? ""),
        sortOrder: Number(row.sortOrder ?? 0),
        active: row.active !== false,
      };
    })
    .filter((link) => link.categoryId && link.groupId);
}

function parseProductExclusions(
  raw: unknown
): import("@/lib/product-builder/category-addons").ProductAddonExclusion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? `${row.productId ?? ""}__${row.groupId ?? ""}`),
        productId: String(row.productId ?? ""),
        groupId: String(row.groupId ?? ""),
      };
    })
    .filter((item) => item.productId && item.groupId);
}

export function subscribeToCategoryModifierGroups(
  onData: (links: import("@/lib/product-builder/category-addons").CategoryAddonLink[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(
    doc(db, COLLECTIONS.settings, CATEGORY_ADDON_SETTINGS_ID),
    (snap) => onData(parseCategoryAddonLinks(snap.data()?.links)),
    (error) => {
      onData([]);
      onError(error.message);
    }
  );
}

export async function syncCategoryModifierLinks(
  categoryId: string,
  groupIds: string[]
): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    const ref = doc(db, COLLECTIONS.settings, CATEGORY_ADDON_SETTINGS_ID);
    const snap = await getDoc(ref);
    const existing = parseCategoryAddonLinks(snap.data()?.links);
    const desired = [...new Set(groupIds.filter(Boolean))];
    const next = [
      ...existing.filter((link) => link.categoryId !== categoryId),
      ...desired.map((groupId, index) => ({
        id: `${categoryId}__${groupId}`,
        categoryId,
        groupId,
        sortOrder: index,
        active: true,
      })),
    ];
    await setDoc(ref, sanitizeFirestoreData({ links: next }), { merge: true });
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to save category add-on assignment");
  }
}

export function subscribeToProductAddonExclusions(
  onData: (items: import("@/lib/product-builder/category-addons").ProductAddonExclusion[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(
    doc(db, COLLECTIONS.settings, PRODUCT_EXCLUSION_SETTINGS_ID),
    (snap) => onData(parseProductExclusions(snap.data()?.items)),
    (error) => {
      onData([]);
      onError(error.message);
    }
  );
}

export async function setProductAddonExclusion(
  productId: string,
  groupId: string,
  excluded: boolean
): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    const ref = doc(db, COLLECTIONS.settings, PRODUCT_EXCLUSION_SETTINGS_ID);
    const snap = await getDoc(ref);
    const existing = parseProductExclusions(snap.data()?.items);
    const id = `${productId}__${groupId}`;
    const next = excluded
      ? [...existing.filter((item) => item.id !== id), { id, productId, groupId }]
      : existing.filter((item) => item.id !== id);
    await setDoc(ref, sanitizeFirestoreData({ items: next }), { merge: true });
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to update product add-on exclusion");
  }
}

export async function reorderProductModifierGroups(
  productId: string,
  ids: string[]
): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    await Promise.all(
      ids.map((id, index) =>
        updateDoc(doc(db, COLLECTIONS.productModifierGroups, id), { sortOrder: index + 1 })
      )
    );
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to reorder product modifier groups");
  }
}

// ─── Product Modifier Options ──────────────────────────────────────

export async function getProductModifierOptions(productId: string): Promise<ProductModifierOption[]> {
  const db = getDb();
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.productModifierOptions),
      where("productId", "==", productId)
    )
  );
  return snapshot.docs.map((d) =>
    mapProductModifierOption(docTo<FirestoreProductModifierOption>(d.id, d.data()))
  );
}

export async function upsertProductModifierOption(
  input: ProductModifierOptionInput
): Promise<ServiceResult<ProductModifierOption>> {
  try {
    const parsed = productModifierOptionSchema.parse(input);
    const db = getDb();
    const id = `${parsed.productId}_${parsed.optionId}`;
    const ref = doc(db, COLLECTIONS.productModifierOptions, id);
    await setDoc(ref, sanitizeFirestoreData(parsed), { merge: true });
    return success(mapProductModifierOption({ id, ...parsed }));
  } catch (error) {
    return failure(error, "Failed to save product modifier option");
  }
}

// ─── Business Rules ────────────────────────────────────────────────

export async function getBusinessRules(): Promise<BusinessRule[]> {
  const db = getDb();
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.businessRules), orderBy("priority", "asc"))
  );
  return snapshot.docs.map((d) => mapBusinessRule(docTo<FirestoreBusinessRule>(d.id, d.data())));
}

export function subscribeToBusinessRules(
  onData: (rules: BusinessRule[]) => void,
  onError: (msg: string) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(
    query(collection(db, COLLECTIONS.businessRules), orderBy("priority", "asc")),
    (snap) => {
      onData(snap.docs.map((d) => mapBusinessRule(docTo<FirestoreBusinessRule>(d.id, d.data()))));
    },
    (err) => onError(err.message)
  );
}

export async function createBusinessRule(input: BusinessRuleInput): Promise<ServiceResult<BusinessRule>> {
  try {
    const parsed = businessRuleSchema.parse(input);
    const db = getDb();
    const now = nowTimestamp();
    const data: FirestoreBusinessRule = { ...parsed, createdAt: now, updatedAt: now };
    const ref = await addDoc(collection(db, COLLECTIONS.businessRules), data);
    return success(mapBusinessRule({ id: ref.id, ...data }));
  } catch (error) {
    return failure(error, "Failed to create business rule");
  }
}

export async function updateBusinessRule(
  id: string,
  input: Partial<BusinessRuleInput>
): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    const ref = doc(db, COLLECTIONS.businessRules, id);
    await updateDoc(ref, { ...input, updatedAt: nowTimestamp() });
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to update business rule");
  }
}

export async function deleteBusinessRule(id: string): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    await deleteDoc(doc(db, COLLECTIONS.businessRules, id));
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to delete business rule");
  }
}

// ─── Suggestions ───────────────────────────────────────────────────

export async function getProductSuggestions(triggerProductId?: string): Promise<ProductSuggestion[]> {
  const db = getDb();
  const q = triggerProductId
    ? query(
        collection(db, COLLECTIONS.suggestions),
        where("triggerProductId", "==", triggerProductId),
        orderBy("sortOrder", "asc")
      )
    : query(collection(db, COLLECTIONS.suggestions), orderBy("sortOrder", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) =>
    mapProductSuggestion(docTo<FirestoreProductSuggestion>(d.id, d.data()))
  );
}

export function subscribeToSuggestions(
  onData: (suggestions: ProductSuggestion[]) => void,
  onError: (msg: string) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(
    query(collection(db, COLLECTIONS.suggestions), orderBy("sortOrder", "asc")),
    (snap) => {
      onData(snap.docs.map((d) => mapProductSuggestion(docTo<FirestoreProductSuggestion>(d.id, d.data()))));
    },
    (err) => onError(err.message)
  );
}

export async function createProductSuggestion(
  input: ProductSuggestionInput
): Promise<ServiceResult<ProductSuggestion>> {
  try {
    const parsed = productSuggestionSchema.parse(input);
    const db = getDb();
    const ref = await addDoc(collection(db, COLLECTIONS.suggestions), parsed);
    return success(mapProductSuggestion({ id: ref.id, ...parsed }));
  } catch (error) {
    return failure(error, "Failed to create suggestion");
  }
}

export async function updateProductSuggestion(
  id: string,
  input: Partial<ProductSuggestionInput>
): Promise<ServiceResult<ProductSuggestion>> {
  try {
    const db = getDb();
    const ref = doc(db, COLLECTIONS.suggestions, id);
    await updateDoc(ref, input);
    const snap = await getDoc(ref);
    if (!snap.exists()) return failure(new ServiceError("Not found", "NOT_FOUND"));
    return success(mapProductSuggestion(docTo<FirestoreProductSuggestion>(snap.id, snap.data())));
  } catch (error) {
    return failure(error, "Failed to update suggestion");
  }
}

export async function deleteProductSuggestion(id: string): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    await deleteDoc(doc(db, COLLECTIONS.suggestions, id));
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to delete suggestion");
  }
}

// ─── Inventory Links ───────────────────────────────────────────────

export async function getInventoryLinks(): Promise<InventoryLink[]> {
  const db = getDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.inventoryLinks));
  return snapshot.docs.map((d) => mapInventoryLink(docTo<FirestoreInventoryLink>(d.id, d.data())));
}

export function subscribeToInventoryLinks(
  onData: (links: InventoryLink[]) => void,
  onError: (msg: string) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(collection(db, COLLECTIONS.inventoryLinks), (snap) => {
    onData(snap.docs.map((d) => mapInventoryLink(docTo<FirestoreInventoryLink>(d.id, d.data()))));
  }, (err) => onError(err.message));
}

export async function upsertInventoryLink(
  input: InventoryLinkInput,
  id?: string
): Promise<ServiceResult<InventoryLink>> {
  try {
    const parsed = inventoryLinkSchema.parse(input);
    const db = getDb();
    if (id) {
      await updateDoc(doc(db, COLLECTIONS.inventoryLinks, id), parsed);
      return success(mapInventoryLink({ id, ...parsed }));
    }
    const ref = await addDoc(collection(db, COLLECTIONS.inventoryLinks), parsed);
    return success(mapInventoryLink({ id: ref.id, ...parsed }));
  } catch (error) {
    return failure(error, "Failed to save inventory link");
  }
}

// ─── Product Builder Config ────────────────────────────────────────

export async function loadProductBuilderConfig(productId: string): Promise<ProductBuilderConfig> {
  const db = getDb();
  const [
    groupsSnap,
    optionsSnap,
    productGroupsSnap,
    productOptionsSnap,
    rulesSnap,
    suggestionsSnap,
    inventorySnap,
  ] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.modifierGroups), orderBy("sortOrder", "asc"))),
    getDocs(query(collection(db, COLLECTIONS.modifierOptions), orderBy("sortOrder", "asc"))),
    getDocs(
      query(
        collection(db, COLLECTIONS.productModifierGroups),
        where("productId", "==", productId)
      )
    ),
    getDocs(
      query(
        collection(db, COLLECTIONS.productModifierOptions),
        where("productId", "==", productId)
      )
    ),
    getDocs(query(collection(db, COLLECTIONS.businessRules), orderBy("priority", "asc"))),
    getDocs(
      query(
        collection(db, COLLECTIONS.suggestions),
        where("triggerProductId", "==", productId),
        orderBy("sortOrder", "asc")
      )
    ),
    getDocs(collection(db, COLLECTIONS.inventoryLinks)),
  ]);

  return buildProductBuilderConfig({
    productId,
    groups: groupsSnap.docs.map((d) =>
      mapModifierGroup(docTo<FirestoreModifierGroup>(d.id, d.data()))
    ),
    options: optionsSnap.docs.map((d) =>
      mapModifierOption(docTo<FirestoreModifierOption>(d.id, d.data()))
    ),
    productGroups: productGroupsSnap.docs
      .map((d) =>
        mapProductModifierGroup(
          docTo<FirestoreProductModifierGroup>(d.id, d.data())
        )
      )
      .sort((a, b) => a.sortOrder - b.sortOrder),
    productOptions: productOptionsSnap.docs.map((d) =>
      mapProductModifierOption(docTo<FirestoreProductModifierOption>(d.id, d.data()))
    ),
    rules: rulesSnap.docs.map((d) => mapBusinessRule(docTo<FirestoreBusinessRule>(d.id, d.data()))),
    suggestions: suggestionsSnap.docs.map((d) =>
      mapProductSuggestion(docTo<FirestoreProductSuggestion>(d.id, d.data()))
    ),
    inventory: inventorySnap.docs.map((d) =>
      mapInventoryLink(docTo<FirestoreInventoryLink>(d.id, d.data()))
    ),
  });
}

export function subscribeToProductBuilderConfig(
  productId: string,
  onData: (config: ProductBuilderConfig) => void,
  onError: (msg: string) => void
): Unsubscribe {
  let cache: {
    groups: ModifierGroup[];
    options: ModifierOption[];
    productGroups: ProductModifierGroup[];
    productOptions: ProductModifierOption[];
    rules: BusinessRule[];
    suggestions: ProductSuggestion[];
    inventory: InventoryLink[];
  } = {
    groups: [],
    options: [],
    productGroups: [],
    productOptions: [],
    rules: [],
    suggestions: [],
    inventory: [],
  };
  const ready = {
    groups: false,
    options: false,
    productGroups: false,
    productOptions: false,
    rules: false,
    suggestions: false,
    inventory: false,
  };

  const emit = () => {
    if (!Object.values(ready).every(Boolean)) return;
    onData(
      buildProductBuilderConfig({
        productId,
        ...cache,
        productGroups: cache.productGroups.filter((pg) => pg.productId === productId),
        productOptions: cache.productOptions.filter((po) => po.productId === productId),
        suggestions: cache.suggestions.filter((s) => s.triggerProductId === productId),
      })
    );
  };

  const db = getDb();
  const markReady = (key: keyof typeof ready) => {
    ready[key] = true;
    emit();
  };
  const unsubs = [
    onSnapshot(
      collection(db, COLLECTIONS.modifierGroups),
      (s) => {
        cache.groups = s.docs
          .map((d) => mapModifierGroup(docTo<FirestoreModifierGroup>(d.id, d.data())))
          .sort((a, b) => a.sortOrder - b.sortOrder);
        markReady("groups");
      },
      (e) => {
        onError(e.message);
        markReady("groups");
      }
    ),
    onSnapshot(
      collection(db, COLLECTIONS.modifierOptions),
      (s) => {
        cache.options = sortModifierOptions(
          s.docs.map((d) => mapModifierOption(docTo<FirestoreModifierOption>(d.id, d.data())))
        );
        markReady("options");
      },
      (e) => {
        onError(e.message);
        markReady("options");
      }
    ),
    onSnapshot(
      query(collection(db, COLLECTIONS.productModifierGroups), where("productId", "==", productId)),
      (s) => {
        cache.productGroups = s.docs
          .map((d) => mapProductModifierGroup(docTo<FirestoreProductModifierGroup>(d.id, d.data())))
          .sort((a, b) => a.sortOrder - b.sortOrder);
        markReady("productGroups");
      },
      (e) => {
        onError(e.message);
        markReady("productGroups");
      }
    ),
    onSnapshot(
      query(collection(db, COLLECTIONS.productModifierOptions), where("productId", "==", productId)),
      (s) => {
        cache.productOptions = s.docs.map((d) =>
          mapProductModifierOption(docTo<FirestoreProductModifierOption>(d.id, d.data()))
        );
        markReady("productOptions");
      },
      () => markReady("productOptions")
    ),
    onSnapshot(
      collection(db, COLLECTIONS.businessRules),
      (s) => {
        cache.rules = s.docs
          .map((d) => mapBusinessRule(docTo<FirestoreBusinessRule>(d.id, d.data())))
          .sort((a, b) => a.priority - b.priority);
        markReady("rules");
      },
      () => markReady("rules")
    ),
    onSnapshot(
      query(collection(db, COLLECTIONS.suggestions), where("triggerProductId", "==", productId)),
      (s) => {
        cache.suggestions = s.docs
          .map((d) => mapProductSuggestion(docTo<FirestoreProductSuggestion>(d.id, d.data())))
          .sort((a, b) => a.sortOrder - b.sortOrder);
        markReady("suggestions");
      },
      () => markReady("suggestions")
    ),
    onSnapshot(
      collection(db, COLLECTIONS.inventoryLinks),
      (s) => {
        cache.inventory = s.docs.map((d) =>
          mapInventoryLink(docTo<FirestoreInventoryLink>(d.id, d.data()))
        );
        markReady("inventory");
      },
      () => markReady("inventory")
    ),
  ];

  return () => unsubs.forEach((u) => u());
}
