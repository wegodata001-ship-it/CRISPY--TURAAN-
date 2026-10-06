"use client";

import { useEffect, useMemo, useState } from "react";
import {
  subscribeToCostingSettings,
  subscribeToIngredientHistory,
  subscribeToIngredients,
  subscribeToRecipes,
} from "@/services/costingService";
import { DEFAULT_COSTING_SETTINGS } from "@/types/costing";
import type { CostingSettings, Ingredient, IngredientPriceHistory, ProductRecipe } from "@/types/costing";

export function useIngredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToIngredients(
      (items) => {
        setIngredients(items);
        setLoading(false);
        setError(null);
      },
      (message) => {
        setError(message);
        setLoading(false);
      }
    );
  }, []);

  return { ingredients, loading, error };
}

export function useProductRecipes() {
  const [recipes, setRecipes] = useState<ProductRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeToRecipes((items) => {
      setRecipes(items);
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  const byProductId = useMemo(() => {
    const map = new Map<string, ProductRecipe>();
    for (const recipe of recipes) map.set(recipe.productId, recipe);
    return map;
  }, [recipes]);

  return { recipes, byProductId, loading };
}

export function useCostingSettings() {
  const [settings, setSettings] = useState<CostingSettings>(DEFAULT_COSTING_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeToCostingSettings((next) => {
      setSettings(next);
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  return { settings, loading };
}

export function useIngredientHistory(ingredientId: string | null) {
  const [history, setHistory] = useState<IngredientPriceHistory[]>([]);

  useEffect(() => {
    if (!ingredientId) {
      setHistory([]);
      return;
    }
    return subscribeToIngredientHistory(ingredientId, setHistory);
  }, [ingredientId]);

  return history;
}
