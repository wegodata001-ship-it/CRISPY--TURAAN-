"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Product, ProductFilters, Category, BannerSlide } from "@/types";
import { subscribeToProducts } from "@/services/productService";
import { subscribeToCategories } from "@/services/categoryService";
import { subscribeToAllBanners } from "@/services/bannerService";
import { isBannerLive } from "@/lib/mappers";
import {
  mapMasterMenuCategories,
  mapMasterMenuProducts,
  applyProductFilters,
} from "@/lib/menu/map-master-menu";

function isIndexError(message: string): boolean {
  return message.includes("requires an index") || message.includes("FAILED_PRECONDITION");
}

function useMasterMenuFallback() {
  const categories = useMemo(() => mapMasterMenuCategories(), []);
  const products = useMemo(() => mapMasterMenuProducts(), []);
  return { categories, products };
}

export function useProducts(filters?: ProductFilters, options?: { admin?: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const { products: fallbackProducts } = useMasterMenuFallback();
  const adminMode = options?.admin ?? false;

  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  const retry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setUsingFallback(false);
    const parsedFilters = filterKey
      ? (JSON.parse(filterKey) as ProductFilters)
      : undefined;

    const unsubscribe = subscribeToProducts(
      parsedFilters,
      (data) => {
        if (data.length === 0 && !adminMode) {
          setUsingFallback(true);
          setProducts(applyProductFilters(fallbackProducts, parsedFilters));
        } else {
          setProducts(data);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[Products] Failed to load products:", err);
        setError(err);
        if (!adminMode) {
          setUsingFallback(true);
          setProducts(applyProductFilters(fallbackProducts, parsedFilters));
        } else {
          setProducts([]);
        }
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [filterKey, fallbackProducts, adminMode, retryKey]);

  return {
    products,
    loading,
    error,
    usingFallback,
    isIndexError: error ? isIndexError(error) : false,
    retry,
  };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { categories: fallbackCategories } = useMasterMenuFallback();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToCategories(
      (data) => {
        setCategories(data.length > 0 ? data : fallbackCategories);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setCategories(fallbackCategories);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [fallbackCategories]);

  return { categories, loading, error };
}

/** Admin — includes inactive/hidden categories */
export function useAllCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const { categories: fallbackCategories } = useMasterMenuFallback();

  const retry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToCategories(
      (data) => {
        setCategories(data.length > 0 ? data : fallbackCategories);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[Categories] Failed to load categories:", err);
        setError(err);
        setCategories(fallbackCategories);
        setLoading(false);
      },
      { includeInactive: true }
    );
    return unsubscribe;
  }, [fallbackCategories, retryKey]);

  return { categories, loading, error, retry };
}

export function useAllProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { products: fallbackProducts } = useMasterMenuFallback();

  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      { active: true },
      (data) => {
        setProducts(data.length > 0 ? data : fallbackProducts);
        setLoading(false);
      },
      () => {
        setProducts(fallbackProducts);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [fallbackProducts]);

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
