"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { HeroBanner } from "@/features/catalog/hero-banner";
import { CategoryScroll } from "@/features/catalog/category-scroll";
import { CategoryGrid, ProductCarousel } from "@/features/catalog/catalog-sections";
import { ProductFiltersBar } from "@/features/catalog/product-filters-bar";
import { ProductGrid } from "@/features/catalog/product-grid";
import { ProductDetailDrawer } from "@/features/catalog/product-detail-drawer";
import { FloatingCartButton } from "@/features/cart/floating-cart-button";
import { AboutCafeCard } from "@/components/brand/about-cafe-card";
import { SiteFooter } from "@/components/layout/footer";
import { useProducts } from "@/hooks/useProducts";
import type { Product, ProductFilters } from "@/types";

const PAGE_SIZE = 12;

export function CatalogView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({
    sortBy: "popular",
    active: true,
  });

  const combinedFilters = useMemo<ProductFilters>(
    () => ({
      ...filters,
      search: searchQuery || undefined,
      categoryId: selectedCategory,
      active: true,
      available: undefined,
    }),
    [filters, searchQuery, selectedCategory]
  );

  const { products, loading } = useProducts(combinedFilters);

  const popularProducts = useMemo(
    () => products.filter((p) => p.isPopular).slice(0, 10),
    [products]
  );

  const newProducts = useMemo(
    () =>
      products
        .filter((p) => p.isNew)
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [products]
  );

  const recommendedProducts = useMemo(
    () =>
      products
        .filter((p) => !p.isPopular)
        .slice()
        .sort((a, b) => b.price - a.price)
        .slice(0, 8),
    [products]
  );

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setVisibleCount(PAGE_SIZE);
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const showSections = selectedCategory === "all" && !searchQuery;

  return (
    <>
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <HeroBanner />

      {showSections && (
        <>
          <CategoryGrid
            selected={selectedCategory}
            onSelect={handleCategorySelect}
          />

          <ProductCarousel
            title="מוצרים פופולריים"
            subtitle="Most loved at MISHKAT CAFÉ"
            products={popularProducts}
            onProductClick={setSelectedProduct}
          />

          {newProducts.length > 0 && (
            <ProductCarousel
              title="חדשים"
              subtitle="Fresh additions to our menu"
              products={newProducts}
              onProductClick={setSelectedProduct}
            />
          )}

          <ProductCarousel
            title="מומלצים"
            subtitle="Chef's recommendations"
            products={recommendedProducts}
            onProductClick={setSelectedProduct}
          />
        </>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mt-2"
      >
        <CategoryScroll
          selected={selectedCategory}
          onSelect={handleCategorySelect}
        />
      </motion.div>

      <ProductFiltersBar
        filters={combinedFilters}
        onFiltersChange={setFilters}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {!showSections && <AboutCafeCard />}

      <div id="menu" className="mt-4 mb-4">
        <div className="mb-3 flex items-center justify-between px-4 md:px-6">
          <h2 className="font-display text-lg font-bold text-dark-brown md:text-xl" dir="rtl">
            {selectedCategory === "all" ? "כל התפריט" : "תפריט"}
          </h2>
          <p className="text-sm text-coffee/60">
            {loading ? "Loading..." : `${products.length} items`}
          </p>
        </div>

        <ProductGrid
          products={visibleProducts}
          loading={loading}
          onProductClick={setSelectedProduct}
        />

        {hasMore && !loading && (
          <div className="mt-6 flex justify-center px-4">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="rounded-full border border-beige-dark/40 bg-warm-white px-8 py-3 text-sm font-medium text-coffee transition-colors hover:bg-beige/60"
            >
              Load more ({products.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      <SiteFooter />

      <ProductDetailDrawer
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      />

      <FloatingCartButton />
    </>
  );
}
