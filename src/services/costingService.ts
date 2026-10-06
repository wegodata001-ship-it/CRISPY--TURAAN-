import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { sanitizeFirestoreData } from "@/lib/firebase/sanitize-firestore-data";
import { nowTimestamp, timestampToIso } from "@/types/firestore";
import { failure, success, type ServiceResult } from "@/lib/errors";
import { computeCostPerBaseUnit } from "@/lib/costing/units";
import type {
  CostingSettings,
  CostingUnit,
  Ingredient,
  IngredientCategory,
  IngredientPriceHistory,
  ProductRecipe,
  RecipeIngredientLine,
} from "@/types/costing";
import { DEFAULT_COSTING_SETTINGS } from "@/types/costing";

export interface IngredientInput {
  name: string;
  category: IngredientCategory;
  purchaseQuantity: number;
  purchaseUnit: CostingUnit;
  purchasePrice: number;
  supplierId?: string;
  notes?: string;
  active?: boolean;
}

function mapIngredient(id: string, data: Record<string, unknown>): Ingredient {
  return {
    id,
    name: String(data.name ?? ""),
    category: (data.category as Ingredient["category"]) ?? "other",
    purchaseQuantity: Number(data.purchaseQuantity ?? 0),
    purchaseUnit: (data.purchaseUnit as Ingredient["purchaseUnit"]) ?? "g",
    baseQuantity: Number(data.baseQuantity ?? 0),
    baseUnit: (data.baseUnit as Ingredient["baseUnit"]) ?? "g",
    purchasePrice: Number(data.purchasePrice ?? 0),
    costPerBaseUnit: Number(data.costPerBaseUnit ?? 0),
    supplierId: data.supplierId ? String(data.supplierId) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
    active: data.active !== false,
    createdAt: timestampToIso(data.createdAt as never),
    updatedAt: timestampToIso(data.updatedAt as never),
  };
}

function mapRecipe(id: string, data: Record<string, unknown>): ProductRecipe {
  const raw = Array.isArray(data.ingredients) ? data.ingredients : [];
  return {
    id,
    productId: String(data.productId ?? id),
    ingredients: raw.map((line) => {
      const item = line as Record<string, unknown>;
      return {
        ingredientId: String(item.ingredientId ?? ""),
        quantity: Number(item.quantity ?? 0),
        unit: (item.unit as RecipeIngredientLine["unit"]) ?? "g",
      };
    }),
    updatedAt: timestampToIso(data.updatedAt as never),
  };
}

function mapHistory(id: string, data: Record<string, unknown>): IngredientPriceHistory {
  return {
    id,
    ingredientId: String(data.ingredientId ?? ""),
    date: typeof data.date === "string" ? data.date : timestampToIso(data.date as never),
    oldPrice: Number(data.oldPrice ?? 0),
    newPrice: Number(data.newPrice ?? 0),
    packageQuantity: Number(data.packageQuantity ?? 0),
    purchaseUnit: (data.purchaseUnit as IngredientPriceHistory["purchaseUnit"]) ?? "g",
    unitCost: Number(data.unitCost ?? 0),
    createdAt: timestampToIso(data.createdAt as never),
  };
}

export function subscribeToIngredients(
  onData: (items: Ingredient[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  const q = query(collection(getDb(), COLLECTIONS.ingredients), orderBy("name"));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((item) => mapIngredient(item.id, item.data())));
    },
    (error) => onError?.(error.message)
  );
}

export function subscribeToRecipes(
  onData: (items: ProductRecipe[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    collection(getDb(), COLLECTIONS.productRecipes),
    (snap) => {
      onData(snap.docs.map((item) => mapRecipe(item.id, item.data())));
    },
    (error) => onError?.(error.message)
  );
}

export function subscribeToCostingSettings(
  onData: (settings: CostingSettings) => void,
  onError?: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), COLLECTIONS.costingSettings, "default"),
    (snap) => {
      if (!snap.exists()) {
        onData({ ...DEFAULT_COSTING_SETTINGS });
        return;
      }
      const data = snap.data();
      onData({
        id: snap.id,
        targetFoodCost: Number(data.targetFoodCost ?? 0.3),
        greenMax: Number(data.greenMax ?? 0.3),
        yellowMax: Number(data.yellowMax ?? 0.35),
        updatedAt: timestampToIso(data.updatedAt as never),
      });
    },
    (error) => onError?.(error.message)
  );
}

export function subscribeToIngredientHistory(
  ingredientId: string,
  onData: (items: IngredientPriceHistory[]) => void
): Unsubscribe {
  const q = query(
    collection(getDb(), COLLECTIONS.ingredientPriceHistory),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    onData(
      snap.docs
        .map((item) => mapHistory(item.id, item.data()))
        .filter((item) => item.ingredientId === ingredientId)
    );
  });
}

function derivedFields(input: IngredientInput) {
  const derived = computeCostPerBaseUnit(
    input.purchasePrice,
    input.purchaseQuantity,
    input.purchaseUnit
  );
  return {
    name: input.name.trim(),
    category: input.category,
    purchaseQuantity: input.purchaseQuantity,
    purchaseUnit: input.purchaseUnit,
    purchasePrice: input.purchasePrice,
    supplierId: input.supplierId?.trim() || null,
    notes: input.notes?.trim() || null,
    active: input.active ?? true,
    ...derived,
  };
}

export async function createIngredient(input: IngredientInput): Promise<ServiceResult<string>> {
  try {
    const ref = await addDoc(
      collection(getDb(), COLLECTIONS.ingredients),
      sanitizeFirestoreData({
        ...derivedFields(input),
        createdAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
      })
    );
    return success(ref.id);
  } catch (error) {
    return failure(error, "Failed to create ingredient");
  }
}

export async function updateIngredient(
  id: string,
  input: IngredientInput,
  previous?: Ingredient
): Promise<ServiceResult<void>> {
  try {
    const next = derivedFields(input);
    await updateDoc(
      doc(getDb(), COLLECTIONS.ingredients, id),
      sanitizeFirestoreData({
        ...next,
        updatedAt: nowTimestamp(),
      })
    );

    const priceChanged =
      previous &&
      (previous.purchasePrice !== input.purchasePrice ||
        previous.purchaseQuantity !== input.purchaseQuantity ||
        previous.purchaseUnit !== input.purchaseUnit);

    if (priceChanged && previous) {
      await addDoc(
        collection(getDb(), COLLECTIONS.ingredientPriceHistory),
        sanitizeFirestoreData({
          ingredientId: id,
          date: new Date().toISOString(),
          oldPrice: previous.purchasePrice,
          newPrice: input.purchasePrice,
          packageQuantity: input.purchaseQuantity,
          purchaseUnit: input.purchaseUnit,
          unitCost: next.costPerBaseUnit,
          createdAt: nowTimestamp(),
        })
      );
    }

    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to update ingredient");
  }
}

export async function deleteIngredient(id: string): Promise<ServiceResult<void>> {
  try {
    await deleteDoc(doc(getDb(), COLLECTIONS.ingredients, id));
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to delete ingredient");
  }
}

export async function saveProductRecipe(
  productId: string,
  ingredients: RecipeIngredientLine[]
): Promise<ServiceResult<void>> {
  try {
    await setDoc(
      doc(getDb(), COLLECTIONS.productRecipes, productId),
      sanitizeFirestoreData({
        productId,
        ingredients,
        updatedAt: nowTimestamp(),
      })
    );
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to save recipe");
  }
}

export async function saveCostingSettings(
  settings: Pick<CostingSettings, "targetFoodCost" | "greenMax" | "yellowMax">
): Promise<ServiceResult<void>> {
  try {
    await setDoc(
      doc(getDb(), COLLECTIONS.costingSettings, "default"),
      sanitizeFirestoreData({
        ...settings,
        updatedAt: nowTimestamp(),
      }),
      { merge: true }
    );
    return success(undefined);
  } catch (error) {
    return failure(error, "Failed to save costing settings");
  }
}
