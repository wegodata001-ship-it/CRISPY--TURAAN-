import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
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

export async function getModifierOptions(groupId?: string): Promise<ModifierOption[]> {
  const db = getDb();
  const q = groupId
    ? query(
        collection(db, COLLECTIONS.modifierOptions),
        where("groupId", "==", groupId),
        orderBy("sortOrder", "asc")
      )
    : query(collection(db, COLLECTIONS.modifierOptions), orderBy("sortOrder", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) =>
    mapModifierOption(docTo<FirestoreModifierOption>(d.id, d.data()))
  );
}

export function subscribeToModifierOptions(
  groupId: string | undefined,
  onData: (options: ModifierOption[]) => void,
  onError: (msg: string) => void
): Unsubscribe {
  const db = getDb();
  const q = groupId
    ? query(
        collection(db, COLLECTIONS.modifierOptions),
        where("groupId", "==", groupId),
        orderBy("sortOrder", "asc")
      )
    : query(collection(db, COLLECTIONS.modifierOptions), orderBy("sortOrder", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => mapModifierOption(docTo<FirestoreModifierOption>(d.id, d.data()))));
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
        where("productId", "==", productId),
        orderBy("sortOrder", "asc")
      )
    : query(collection(db, COLLECTIONS.productModifierGroups), orderBy("sortOrder", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) =>
    mapProductModifierGroup(docTo<FirestoreProductModifierGroup>(d.id, d.data()))
  );
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
      where("productId", "==", productId),
      orderBy("sortOrder", "asc")
    ),
    (snap) => {
      onData(
        snap.docs.map((d) =>
          mapProductModifierGroup(docTo<FirestoreProductModifierGroup>(d.id, d.data()))
        )
      );
    },
    (err) => onError(err.message)
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
    const existing = await getDocs(
      query(
        collection(db, COLLECTIONS.productModifierOptions),
        where("productId", "==", parsed.productId),
        where("optionId", "==", parsed.optionId)
      )
    );
    if (!existing.empty) {
      const id = existing.docs[0]!.id;
      await updateDoc(doc(db, COLLECTIONS.productModifierOptions, id), parsed);
      return success(mapProductModifierOption({ id, ...parsed }));
    }
    const ref = await addDoc(collection(db, COLLECTIONS.productModifierOptions), parsed);
    return success(mapProductModifierOption({ id: ref.id, ...parsed }));
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
): Promise<ServiceResult<BusinessRule>> {
  try {
    const db = getDb();
    const ref = doc(db, COLLECTIONS.businessRules, id);
    await updateDoc(ref, { ...input, updatedAt: nowTimestamp() });
    const snap = await getDoc(ref);
    if (!snap.exists()) return failure(new ServiceError("Not found", "NOT_FOUND"));
    return success(mapBusinessRule(docTo<FirestoreBusinessRule>(snap.id, snap.data())));
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
        where("productId", "==", productId),
        orderBy("sortOrder", "asc")
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
    productGroups: productGroupsSnap.docs.map((d) =>
      mapProductModifierGroup(docTo<FirestoreProductModifierGroup>(d.id, d.data()))
    ),
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

  const emit = () => {
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
  const unsubs = [
    onSnapshot(query(collection(db, COLLECTIONS.modifierGroups), orderBy("sortOrder", "asc")), (s) => {
      cache.groups = s.docs.map((d) => mapModifierGroup(docTo<FirestoreModifierGroup>(d.id, d.data())));
      emit();
    }, (e) => onError(e.message)),
    onSnapshot(query(collection(db, COLLECTIONS.modifierOptions), orderBy("sortOrder", "asc")), (s) => {
      cache.options = s.docs.map((d) => mapModifierOption(docTo<FirestoreModifierOption>(d.id, d.data())));
      emit();
    }, (e) => onError(e.message)),
    onSnapshot(
      query(collection(db, COLLECTIONS.productModifierGroups), where("productId", "==", productId), orderBy("sortOrder", "asc")),
      (s) => {
        cache.productGroups = s.docs.map((d) => mapProductModifierGroup(docTo<FirestoreProductModifierGroup>(d.id, d.data())));
        emit();
      },
      (e) => onError(e.message)
    ),
    onSnapshot(
      query(collection(db, COLLECTIONS.productModifierOptions), where("productId", "==", productId)),
      (s) => {
        cache.productOptions = s.docs.map((d) => mapProductModifierOption(docTo<FirestoreProductModifierOption>(d.id, d.data())));
        emit();
      },
      (e) => onError(e.message)
    ),
    onSnapshot(query(collection(db, COLLECTIONS.businessRules), orderBy("priority", "asc")), (s) => {
      cache.rules = s.docs.map((d) => mapBusinessRule(docTo<FirestoreBusinessRule>(d.id, d.data())));
      emit();
    }, (e) => onError(e.message)),
    onSnapshot(
      query(collection(db, COLLECTIONS.suggestions), where("triggerProductId", "==", productId), orderBy("sortOrder", "asc")),
      (s) => {
        cache.suggestions = s.docs.map((d) => mapProductSuggestion(docTo<FirestoreProductSuggestion>(d.id, d.data())));
        emit();
      },
      (e) => onError(e.message)
    ),
    onSnapshot(collection(db, COLLECTIONS.inventoryLinks), (s) => {
      cache.inventory = s.docs.map((d) => mapInventoryLink(docTo<FirestoreInventoryLink>(d.id, d.data())));
      emit();
    }, (e) => onError(e.message)),
  ];

  return () => unsubs.forEach((u) => u());
}
