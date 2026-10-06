import type {
  CostingSettings,
  DishCostBreakdown,
  Ingredient,
  ProductRecipe,
  RecipeLineCost,
} from "@/types/costing";
import { DEFAULT_COSTING_SETTINGS } from "@/types/costing";
import { lineCost } from "@/lib/costing/units";

export function roundMoney(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function foodCostTone(
  foodCostPercentage: number | null,
  settings: CostingSettings = DEFAULT_COSTING_SETTINGS
): "green" | "yellow" | "red" | "neutral" {
  if (foodCostPercentage === null || !Number.isFinite(foodCostPercentage)) return "neutral";
  const ratio = foodCostPercentage / 100;
  if (ratio <= settings.greenMax) return "green";
  if (ratio <= settings.yellowMax) return "yellow";
  return "red";
}

export function recommendedSellingPrice(
  totalCost: number,
  targetFoodCost: number
): number | null {
  if (totalCost <= 0 || targetFoodCost <= 0) return null;
  return roundMoney(totalCost / targetFoodCost);
}

export function buildRecipeLines(
  recipe: ProductRecipe | null,
  ingredients: Ingredient[]
): RecipeLineCost[] {
  if (!recipe) return [];
  const byId = new Map(ingredients.map((item) => [item.id, item]));

  return recipe.ingredients.map((line) => {
    const ingredient = byId.get(line.ingredientId);
    const missingPrice = !ingredient || !ingredient.purchasePrice || ingredient.costPerBaseUnit <= 0;
    if (!ingredient) {
      return {
        ingredientId: line.ingredientId,
        ingredientName: "",
        quantity: line.quantity,
        unit: line.unit,
        unitCost: 0,
        lineCost: 0,
        missingPrice: true,
        incompatibleUnit: false,
      };
    }

    const cost = lineCost(
      line.quantity,
      line.unit,
      ingredient.costPerBaseUnit,
      ingredient.baseUnit
    );

    return {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      quantity: line.quantity,
      unit: line.unit,
      unitCost: ingredient.costPerBaseUnit,
      lineCost: cost === null ? 0 : cost,
      missingPrice,
      incompatibleUnit: cost === null,
    };
  });
}

export function calculateDishCost(input: {
  productId: string;
  sellingPrice: number;
  recipe: ProductRecipe | null;
  ingredients: Ingredient[];
  settings?: CostingSettings;
}): DishCostBreakdown {
  const settings = input.settings ?? DEFAULT_COSTING_SETTINGS;
  const lines = buildRecipeLines(input.recipe, input.ingredients);
  const totalCost = roundMoney(lines.reduce((sum, line) => sum + line.lineCost, 0));
  const sellingPrice = input.sellingPrice;
  const hasRecipe = Boolean(input.recipe && input.recipe.ingredients.length > 0);
  const foodCostPercentage =
    sellingPrice > 0 ? roundMoney((totalCost / sellingPrice) * 100, 1) : null;
  const grossProfit = roundMoney(sellingPrice - totalCost);
  const grossMargin =
    sellingPrice > 0 ? roundMoney(((sellingPrice - totalCost) / sellingPrice) * 100, 1) : null;

  return {
    productId: input.productId,
    hasRecipe,
    lines,
    totalCost,
    sellingPrice,
    grossProfit,
    foodCostPercentage,
    grossMargin,
    recommendedPrice: recommendedSellingPrice(totalCost, settings.targetFoodCost),
    missingIngredientPrice: lines.some((line) => line.missingPrice),
  };
}
