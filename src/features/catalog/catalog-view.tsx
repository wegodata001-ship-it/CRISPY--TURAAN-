"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { HeroBanner } from "@/features/catalog/hero-banner";
import {
  CategoryGrid,
  ProductCarousel,
  filterProductsByCategories,
} from "@/features/catalog/catalog-sections";
import { StickyCatalogBar } from "@/features/catalog/sticky-catalog-bar";
import { ProductFiltersBar } from "@/features/catalog/product-filters-bar";
import { ProductGrid } from "@/features/catalog/product-grid";
import { ProductDetailDrawer } from "@/features/catalog/product-detail-drawer";
import { FloatingCartButton } from "@/features/cart/floating-cart-button";
import { CatalogSeeder } from "@/components/catalog/catalog-seeder";
import { AboutCafeCard } from "@/components/brand/about-cafe-card";
import { useProducts, useAllProducts } from "@/hooks/useProducts";
import { useT } from "@/components/providers/locale-provider";
import type { Product, ProductFilters } from "@/types";

const PAGE_SIZE = 12;

const COFFEE_CATS = ["hot-drinks", "ice-drinks"];
const DESSERT_CATS = ["desserts", "ice-cream-yogurt"];
const BREAKFAST_CATS = ["breakfast"];

export function CatalogView() {
  const t = useT();
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
      categoryId: selectedCategory === "all" ? undefined : selectedCategory,
      active: true,
    }),
    [filters, searchQuery, selectedCategory]
  );

  const { products, loading } = useProducts(combinedFilters);
  const { products: allProducts } = useAllProducts();

  const bestSellers = useMemo(
    () => allProducts.filter((p) => p.isPopular).slice(0, 10),
    [allProducts]
  );
  const popularProducts = useMemo(
    () => allProducts.filter((p) => p.isPopular).slice(0, 12),
    [allProducts]
  );
  const newProducts = useMemo(
    () => allProducts.filter((p) => p.isNew).slice(0, 10),
    [allProducts]
  );
  const coffeeProducts = useMemo(
    () => filterProductsByCategories(allProducts, COFFEE_CATS).slice(0, 10),
    [allProducts]
  );
  const dessertProducts = useMemo(
    () => filterProductsByCategories(allProducts, DESSERT_CATS).slice(0, 10),
    [allProducts]
  );
  const breakfastProducts = useMemo(
    () => filterProductsByCategories(allProducts, BREAKFAST_CATS).slice(0, 8),
    [allProducts]
  );

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;
  const showSections = selectedCategory === "all" && !searchQuery;

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setVisibleCount(PAGE_SIZE);
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <>
      <CatalogSeeder />
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <HeroBanner />

      <StickyCatalogBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
      />

      {showSections && (
        <>
          <CategoryGrid selected={selectedCategory} onSelect={handleCategorySelect} />

          <ProductCarousel iconKey="bestSellers" titleKey="catalog.bestSellers" products={bestSellers} onProductClick={setSelectedProduct} />
          <ProductCarousel iconKey="popular" titleKey="catalog.popular" products={popularProducts} onProductClick={setSelectedProduct} />
          <ProductCarousel iconKey="new" titleKey="catalog.new" products={newProducts} onProductClick={setSelectedProduct} />
          <ProductCarousel iconKey="coffee" titleKey="catalog.coffee" products={coffeeProducts} onProductClick={setSelectedProduct} />
          <ProductCarousel iconKey="desserts" titleKey="catalog.desserts" products={dessertProducts} onProductClick={setSelectedProduct} />
          <ProductCarousel iconKey="breakfast" titleKey="catalog.breakfast" products={breakfastProducts} onProductClick={setSelectedProduct} />
        </>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <ProductFiltersBar
          filters={combinedFilters}
          onFiltersChange={setFilters}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />
      </motion.div>

      {!showSections && <AboutCafeCard />}

      <div id="menu" className="mb-24 mt-6 md:mb-8">
        <div className="mb-4 flex items-center justify-between px-4 md:px-6">
          <h2 className="heading-section">
            {selectedCategory === "all" ? t("catalog.fullMenu") : t("catalog.menuSection")}
          </h2>
          <p className="rounded-full bg-beige/60 px-3 py-1 text-sm font-medium text-coffee">
            {loading ? "..." : `${products.length} ${t("catalog.productsCount")}`}
          </p>
        </div>

        <ProductGrid
          products={visibleProducts}
          loading={loading}
          onProductClick={setSelectedProduct}
        />

        {hasMore && !loading && (
          <div className="mt-8 flex justify-center px-4">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="rounded-full border-2 border-coffee/15 bg-warm-white px-10 py-3.5 text-sm font-semibold text-coffee shadow-soft transition-all hover:border-turquoise hover:text-turquoise hover:shadow-elevated"
            >
              {t("catalog.loadMore")} ({products.length - visibleCount} {t("catalog.itemsRemaining")})
            </button>
          </div>
        )}
      </div>

      <ProductDetailDrawer
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        onSelectProduct={setSelectedProduct}
      />

      <FloatingCartButton />
    </>
  );
}
