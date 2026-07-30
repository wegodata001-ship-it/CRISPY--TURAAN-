"use client";

import { useState, useEffect, useMemo } from "react";
import type { Product, ProductFilters, Category, BannerSlide } from "@/types";
import { subscribeToProducts } from "@/services/productService";
import { subscribeToCategories } from "@/services/categoryService";
import { subscribeToBanners } from "@/services/bannerService";

export function useProducts(filters?: ProductFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const parsedFilters = filterKey ? (JSON.parse(filterKey) as ProductFilters) : undefined;

    const unsubscribe = subscribeToProducts(
      parsedFilters,
      (data) => {
        setProducts(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [filterKey]);

  return { products, loading, error };
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
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { categories, loading, error };
}

export function useBanners() {
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToBanners(
      (data) => {
        setBanners(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { banners, loading, error };
}
