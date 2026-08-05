"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { HeroBanner } from "@/features/catalog/hero-banner";
import { CategoryGrid } from "@/features/catalog/catalog-sections";
import { CategoryProductSection } from "@/features/catalog/category-product-section";
import { StickyCatalogBar } from "@/features/catalog/sticky-catalog-bar";
import { ProductFiltersBar } from "@/features/catalog/product-filters-bar";
import { ProductGrid } from "@/features/catalog/product-grid";
import { ProductDetailDrawer } from "@/features/catalog/product-detail-drawer";
import { FloatingCartButton } from "@/features/cart/floating-cart-button";
import { CatalogSeeder } from "@/components/catalog/catalog-seeder";
import { AboutCafeCard } from "@/components/brand/about-cafe-card";
import { useProducts, useAllProducts, useCategories } from "@/hooks/useProducts";
import { useT } from "@/components/providers/locale-provider";
import type { Product, ProductFilters } from "@/types";

export function CatalogView() {
  const t = useT();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
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
  const { categories } = useCategories();

  const activeCategories = useMemo(
    () => [...categories].filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const cat of activeCategories) {
      const items = allProducts
        .filter((p) => p.active && p.categoryId === cat.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || Number(b.isPopular) - Number(a.isPopular));
      if (items.length > 0) map.set(cat.id, items);
    }
    return map;
  }, [activeCategories, allProducts]);

  const showCategorySections = selectedCategory === "all" && !searchQuery;
  const showFilteredGrid = !showCategorySections;

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    requestAnimationFrame(() => {
      document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
    });
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

      {showCategorySections && (
        <>
          <CategoryGrid selected={selectedCategory} onSelect={handleCategorySelect} />

          <div id="menu" className="mb-8">
            {activeCategories.map((cat) => {
              const catProducts = productsByCategory.get(cat.id);
              if (!catProducts?.length) return null;
              return (
                <CategoryProductSection
                  key={cat.id}
                  category={cat}
                  products={catProducts}
                  onProductClick={setSelectedProduct}
                />
              );
            })}
          </div>
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

      {showFilteredGrid && <AboutCafeCard />}

      {showFilteredGrid && (
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
            products={products}
            loading={loading}
            onProductClick={setSelectedProduct}
            incrementalMobile
          />
        </div>
      )}

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
