import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { ServiceError, type ServiceResult, success, failure } from "@/lib/errors";
import { mapCategory } from "@/lib/mappers";
import { categorySchema, type CategoryInput } from "@/lib/validation/schemas";
import { sanitizeFirestoreData } from "@/lib/firebase/sanitize-firestore-data";
import type { Category } from "@/types";
import type { FirestoreCategory, FirestoreDoc } from "@/types/firestore";

function docToCategory(id: string, data: DocumentData): FirestoreDoc<FirestoreCategory> {
  return { id, ...(data as FirestoreCategory) };
}

export async function getCategories(options?: { includeInactive?: boolean }): Promise<Category[]> {
  try {
    const db = getDb();
    const q = query(
      collection(db, COLLECTIONS.categories),
      orderBy("sortOrder", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .filter((d) => options?.includeInactive || (d.data() as FirestoreCategory).active !== false)
      .map((d) => mapCategory(docToCategory(d.id, d.data())));
  } catch (error) {
    throw new ServiceError(
      error instanceof Error ? error.message : "Failed to fetch categories",
      "CATEGORIES_READ_FAILED"
    );
  }
}

export async function getCategoryById(id: string): Promise<Category | undefined> {
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, COLLECTIONS.categories, id));
    if (!snap.exists()) return undefined;
    return mapCategory(docToCategory(snap.id, snap.data()));
  } catch (error) {
    throw new ServiceError(
      error instanceof Error ? error.message : "Failed to fetch category",
      "CATEGORY_READ_FAILED"
    );
  }
}

export function subscribeToCategories(
  onData: (categories: Category[]) => void,
  onError: (error: string) => void,
  options?: { includeInactive?: boolean }
): Unsubscribe {
  try {
    const db = getDb();
    const q = query(
      collection(db, COLLECTIONS.categories),
      orderBy("sortOrder", "asc")
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const categories = snapshot.docs
          .filter((d) => options?.includeInactive || (d.data() as FirestoreCategory).active !== false)
          .map((d) => mapCategory(docToCategory(d.id, d.data())));
        onData(categories);
      },
      (error) => onError(error.message)
    );
  } catch (error) {
    onError(error instanceof Error ? error.message : "Failed to subscribe to categories");
    return () => {};
  }
}

export async function createCategory(input: CategoryInput): Promise<ServiceResult<Category>> {
  try {
    const parsed = categorySchema.parse(input);
    const data = sanitizeFirestoreData({
      ...parsed,
      parentId: parsed.parentId || null,
    });
    const db = getDb();
    const ref = await addDoc(collection(db, COLLECTIONS.categories), data);
    const snap = await getDoc(ref);
    return success(mapCategory(docToCategory(snap.id, snap.data()!)));
  } catch (error) {
    return failure(error, "Failed to create category");
  }
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryInput>
): Promise<ServiceResult<Category>> {
  try {
    const db = getDb();
    const ref = doc(db, COLLECTIONS.categories, id);
    await updateDoc(ref, sanitizeFirestoreData({
      ...input,
      ...(input.parentId === "" ? { parentId: null } : {}),
    }));
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return failure(new ServiceError("Category not found", "NOT_FOUND"));
    }
    return success(mapCategory(docToCategory(snap.id, snap.data())));
  } catch (error) {
    return failure(error, "Failed to update category");
  }
}

export async function deleteCategory(id: string): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    await deleteDoc(doc(db, COLLECTIONS.categories, id));
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to delete category");
  }
}

export async function reorderCategories(
  orderedIds: string[]
): Promise<ServiceResult<void>> {
  try {
    const db = getDb();
    await Promise.all(
      orderedIds.map((id, index) =>
        updateDoc(doc(db, COLLECTIONS.categories, id), { sortOrder: index + 1 })
      )
    );
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to reorder categories");
  }
}

export async function readOneCategoryForTest(): Promise<ServiceResult<Category | null>> {
  try {
    const categories = await getCategories();
    return success(categories[0] ?? null);
  } catch (error) {
    return failure(error, "Category read test failed");
  }
}
