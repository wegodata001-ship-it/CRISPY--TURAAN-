"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Product, ProductFilters, Category, BannerSlide } from "@/types";
import { subscribeToProducts } from "@/services/productService";
import { subscribeToCategories } from "@/services/categoryService";
import { subscribeToAllBanners } from "@/services/bannerService";
import { isBannerLive } from "@/lib/mappers";

function isIndexError(message: string): boolean {
  return message.includes("requires an index") || message.includes("FAILED_PRECONDITION");
}

export function useProducts(filters?: ProductFilters, options?: { admin?: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const adminMode = options?.admin ?? false;

  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  const retry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const parsedFilters = filterKey
      ? (JSON.parse(filterKey) as ProductFilters)
      : undefined;

    const unsubscribe = subscribeToProducts(
      parsedFilters,
      (data) => {
        setProducts(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[Products] Failed to load products:", err);
        setError(err);
        setProducts([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [filterKey, adminMode, retryKey]);

  return {
    products,
    loading,
    error,
    usingFallback: false,
    isIndexError: error ? isIndexError(error) : false,
    retry,
  };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToCategories(
      (data) => {
        setCategories(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setCategories([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { categories, loading, error };
}

/** Admin — includes inactive/hidden categories */
export function useAllCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToCategories(
      (data) => {
        setCategories(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[Categories] Failed to load categories:", err);
        setError(err);
        setCategories([]);
        setLoading(false);
      },
      { includeInactive: true }
    );
    return unsubscribe;
  }, [retryKey]);

  return { categories, loading, error, retry };
}

export function useAllProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      { active: true },
      (data) => {
        setProducts(data);
        setLoading(false);
      },
      () => {
        setProducts([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { products, loading };
}

export function useBanners() {
  const [allBanners, setAllBanners] = useState<BannerSlide[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAllBanners(
      (data) => {
        setAllBanners(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const banners = useMemo(
    () => allBanners.filter((banner) => isBannerLive(banner, now)),
    [allBanners, now]
  );

  return { banners, loading, error };
}
