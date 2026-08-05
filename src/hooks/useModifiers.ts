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

  useEffect(() => {
    const unsub = subscribeToModifierOptions(
      groupId,
      (data) => {
        setOptions(data.filter((o) => !o.archived));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [groupId]);

  return { options, loading };
}

export function useProductBuilderConfig(productId: string | null) {
  const [config, setConfig] = useState<ProductBuilderConfig | null>(null);
  const [loading, setLoading] = useState(Boolean(productId));

  useEffect(() => {
    if (!productId) {
      setConfig(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToProductBuilderConfig(
      productId,
      (data) => {
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
