"use client";

import { useEffect, useState } from "react";
import type { Unsubscribe } from "firebase/firestore";
import {
  subscribeToModifierGroups,
  subscribeToModifierOptions,
  subscribeToProductBuilderConfig,
  subscribeToBusinessRules,
  subscribeToSuggestions,
  subscribeToInventoryLinks,
  subscribeToProductModifierGroups,
  subscribeToAllProductModifierGroups,
  subscribeToCategoryModifierGroups,
  subscribeToProductAddonExclusions,
} from "@/services/modifierService";
import type {
  ModifierGroup,
  ModifierOption,
  ProductBuilderConfig,
  BusinessRule,
  ProductSuggestion,
  InventoryLink,
  ProductModifierGroup,
} from "@/types/modifiers";

const productBuilderConfigCache = new Map<string, ProductBuilderConfig>();

export function useModifierGroups(includeArchived = false) {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToModifierGroups(
      (data) => {
        setGroups(data);
        setLoading(false);
      },
      (msg) => {
        setError(msg);
        setLoading(false);
      },
      includeArchived
    );
    return () => unsub();
  }, [includeArchived]);

  return { groups, loading, error };
}

export function useModifierOptions(groupId?: string) {
  const [options, setOptions] = useState<ModifierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToModifierOptions(
      groupId,
      (data) => {
        setOptions(data.filter((o) => !o.archived));
        setLoading(false);
        setError(null);
      },
      (message) => {
        setError(message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [groupId]);

  return { options, loading, error };
}

export function useAllModifierOptions() {
  return useModifierOptions(undefined);
}

export function useProductBuilderConfig(productId: string | null) {
  const [config, setConfig] = useState<ProductBuilderConfig | null>(() =>
    productId ? productBuilderConfigCache.get(productId) ?? null : null
  );
  const [loading, setLoading] = useState(
    Boolean(productId && !productBuilderConfigCache.has(productId))
  );

  useEffect(() => {
    if (!productId) {
      setConfig(null);
      setLoading(false);
      return;
    }
    const cached = productBuilderConfigCache.get(productId);
    if (cached) {
      setConfig(cached);
      setLoading(false);
    } else {
      setConfig(null);
      setLoading(true);
    }
    const unsub = subscribeToProductBuilderConfig(
      productId,
      (data) => {
        if (data.groups.length > 0) {
          productBuilderConfigCache.set(productId, data);
        } else {
          productBuilderConfigCache.delete(productId);
        }
        setConfig(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [productId]);

  return { config, loading };
}

export function useProductModifierGroups(productId: string | null) {
  const [links, setLinks] = useState<ProductModifierGroup[]>([]);
  const [loading, setLoading] = useState(Boolean(productId));

  useEffect(() => {
    if (!productId) {
      setLinks([]);
      setLoading(false);
      return;
    }
    const unsub = subscribeToProductModifierGroups(
      productId,
      (data) => {
        setLinks(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [productId]);

  return { links, loading };
}

export function useAllProductModifierGroups() {
  const [links, setLinks] = useState<ProductModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToAllProductModifierGroups(
      (data) => {
        setLinks(data);
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      }
    );
  }, []);

  return { links, loading, error };
}

export function useBusinessRules() {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToBusinessRules((data) => {
      setRules(data);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  return { rules, loading };
}

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToSuggestions((data) => {
      setSuggestions(data);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  return { suggestions, loading };
}

export function useInventoryLinks() {
  const [links, setLinks] = useState<InventoryLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToInventoryLinks((data) => {
      setLinks(data);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  return { links, loading };
}

export function useCategoryModifierGroups() {
  const [links, setLinks] = useState<
    import("@/lib/product-builder/category-addons").CategoryAddonLink[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeToCategoryModifierGroups(
      (data) => {
        setLinks(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  return { links, loading };
}

export function useProductAddonExclusions() {
  const [exclusions, setExclusions] = useState<
    import("@/lib/product-builder/category-addons").ProductAddonExclusion[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeToProductAddonExclusions(
      (data) => {
        setExclusions(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  return { exclusions, loading };
}
