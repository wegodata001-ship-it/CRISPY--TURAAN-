import { describe, expect, it } from "vitest";
import { computeCostPerBaseUnit, convertQuantity, lineCost } from "@/lib/costing/units";
import {
  calculateDishCost,
  foodCostTone,
  recommendedSellingPrice,
} from "@/lib/costing/calculate";
import type { Ingredient, ProductRecipe } from "@/types/costing";

function chicken(overrides: Partial<Ingredient> = {}): Ingredient {
  const derived = computeCostPerBaseUnit(160, 5, "kg");
  return {
    id: "chicken",
    name: "חזה עוף",
    category: "protein",
    purchaseQuantity: 5,
    purchaseUnit: "kg",
    purchasePrice: 160,
    supplierId: undefined,
    notes: undefined,
    active: true,
    createdAt: "",
    updatedAt: "",
    ...derived,
    ...overrides,
  };
}

describe("costing units", () => {
  it("converts a 5kg pack at ₪160 to ₪0.032 / gram", () => {
    const derived = computeCostPerBaseUnit(160, 5, "kg");
    expect(derived.baseQuantity).toBe(5000);
    expect(derived.baseUnit).toBe("g");
    expect(derived.costPerBaseUnit).toBeCloseTo(0.032, 6);
  });

  it("costs 200g of chicken at ₪6.40", () => {
    const derived = computeCostPerBaseUnit(160, 5, "kg");
    expect(lineCost(200, "g", derived.costPerBaseUnit, derived.baseUnit)).toBeCloseTo(6.4, 4);
  });

  it("rejects mixing mass and volume", () => {
    expect(convertQuantity(50, "ml", "g")).toBeNull();
  });
});

describe("dish cost", () => {
  const recipe: ProductRecipe = {
    id: "p1",
    productId: "p1",
    updatedAt: "",
    ingredients: [
      { ingredientId: "chicken", quantity: 200, unit: "g" },
      { ingredientId: "oil", quantity: 50, unit: "ml" },
    ],
  };

  const oil: Ingredient = {
    id: "oil",
    name: "שמן",
    category: "oil",
    purchaseQuantity: 1,
    purchaseUnit: "l",
    purchasePrice: 7,
    ...computeCostPerBaseUnit(7, 1, "l"),
    active: true,
    createdAt: "",
    updatedAt: "",
  };

  it("sums live ingredient costs and profitability", () => {
    const dish = calculateDishCost({
      productId: "p1",
      sellingPrice: 42,
      recipe,
      ingredients: [chicken(), oil],
    });

    expect(dish.totalCost).toBeCloseTo(6.75, 2);
    expect(dish.grossProfit).toBeCloseTo(35.25, 2);
    expect(dish.foodCostPercentage).toBeCloseTo(16.1, 1);
    expect(dish.grossMargin).toBeCloseTo(83.9, 1);
    expect(dish.recommendedPrice).toBeCloseTo(22.5, 2);
  });

  it("propagates a chicken price change without stored dish cost", () => {
    const before = calculateDishCost({
      productId: "p1",
      sellingPrice: 42,
      recipe,
      ingredients: [chicken(), oil],
    });
    const after = calculateDishCost({
      productId: "p1",
      sellingPrice: 42,
      recipe,
      ingredients: [chicken({ purchasePrice: 180, ...computeCostPerBaseUnit(180, 5, "kg") }), oil],
    });

    expect(before.lines[0]?.lineCost).toBeCloseTo(6.4, 2);
    expect(after.lines[0]?.lineCost).toBeCloseTo(7.2, 2);
    expect(after.totalCost).toBeGreaterThan(before.totalCost);
  });

  it("uses settings thresholds for food-cost color", () => {
    expect(foodCostTone(19.7)).toBe("green");
    expect(foodCostTone(32)).toBe("yellow");
    expect(foodCostTone(40)).toBe("red");
  });

  it("recommends selling price from target food cost", () => {
    expect(recommendedSellingPrice(8.29, 0.3)).toBeCloseTo(27.63, 2);
  });
});
