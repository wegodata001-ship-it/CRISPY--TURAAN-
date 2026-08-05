"use client";

import { useState, useEffect, useMemo } from "react";
import type { Product, ProductFilters, Category, BannerSlide } from "@/types";
import { subscribeToProducts } from "@/services/productService";
import { subscribeToCategories } from "@/services/categoryService";
import { subscribeToBanners } from "@/services/bannerService";
import {
  mapMasterMenuCategories,
  mapMasterMenuProducts,
  applyProductFilters,
} from "@/lib/menu/map-master-menu";

function useMasterMenuFallback() {
  const categories = useMemo(() => mapMasterMenuCategories(), []);
  const products = useMemo(() => mapMasterMenuProducts(), []);
  return { categories, products };
}

export function useProducts(filters?: ProductFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const { products: fallbackProducts } = useMasterMenuFallback();

  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

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
        if (data.length === 0) {
          setUsingFallback(true);
          setProducts(applyProductFilters(fallbackProducts, parsedFilters));
        } else {
          setProducts(data);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setUsingFallback(true);
        setProducts(applyProductFilters(fallbackProducts, parsedFilters));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [filterKey, fallbackProducts]);

  return { products, loading, error, usingFallback };
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
      },
      { includeInactive: true }
    );
    return unsubscribe;
  }, [fallbackCategories]);

  return { categories, loading, error };
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
