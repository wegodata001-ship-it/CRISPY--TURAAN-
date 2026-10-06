export const COSTING_UNITS = ["g", "kg", "ml", "l", "unit"] as const;
export type CostingUnit = (typeof COSTING_UNITS)[number];

export const INGREDIENT_CATEGORIES = [
  "protein",
  "starch",
  "bread",
  "sauce",
  "oil",
  "packaging",
  "dairy",
  "produce",
  "spice",
  "other",
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  purchaseQuantity: number;
  purchaseUnit: CostingUnit;
  baseQuantity: number;
  baseUnit: CostingUnit;
  purchasePrice: number;
  costPerBaseUnit: number;
  supplierId?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientPriceHistory {
  id: string;
  ingredientId: string;
  date: string;
  oldPrice: number;
  newPrice: number;
  packageQuantity: number;
  purchaseUnit: CostingUnit;
  unitCost: number;
  createdAt: string;
}

export interface RecipeIngredientLine {
  ingredientId: string;
  quantity: number;
  unit: CostingUnit;
}

export interface ProductRecipe {
  id: string;
  productId: string;
  ingredients: RecipeIngredientLine[];
  updatedAt: string;
}

export interface CostingSettings {
  id: string;
  targetFoodCost: number;
  greenMax: number;
  yellowMax: number;
  updatedAt: string;
}

export interface RecipeLineCost {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: CostingUnit;
  unitCost: number;
  lineCost: number;
  missingPrice: boolean;
  incompatibleUnit: boolean;
}

export interface DishCostBreakdown {
  productId: string;
  hasRecipe: boolean;
  lines: RecipeLineCost[];
  totalCost: number;
  sellingPrice: number;
  grossProfit: number;
  foodCostPercentage: number | null;
  grossMargin: number | null;
  recommendedPrice: number | null;
  missingIngredientPrice: boolean;
}

export const DEFAULT_COSTING_SETTINGS: CostingSettings = {
  id: "default",
  targetFoodCost: 0.3,
  greenMax: 0.3,
  yellowMax: 0.35,
  updatedAt: "",
};
