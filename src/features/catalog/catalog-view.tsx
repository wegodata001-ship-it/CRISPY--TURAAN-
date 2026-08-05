"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/header";
import { HeroBanner } from "@/features/catalog/hero-banner";
import { MenuCategoryStrip } from "@/features/catalog/menu-category-strip";
import { SubcategoryChips } from "@/features/catalog/subcategory-chips";
import { StickyCatalogBar } from "@/features/catalog/sticky-catalog-bar";
import { ProductFiltersBar } from "@/features/catalog/product-filters-bar";
import { ProductGrid } from "@/features/catalog/product-grid";
import { ProductDetailDrawer } from "@/features/catalog/product-detail-drawer";
import { FloatingCartButton } from "@/features/cart/floating-cart-button";
import { CatalogSeeder } from "@/components/catalog/catalog-seeder";
import { useProducts, useAllProducts, useCategories } from "@/hooks/useProducts";
import { useT } from "@/components/providers/locale-provider";
import {
  filterMenuProducts,
  getRootCategories,
  hasSubcategories,
  sortProducts,
} from "@/lib/menu/category-tree";
import type { Product, ProductFilters } from "@/types";

export function CatalogView() {
  const t = useT();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({
    sortBy: "popular",
    active: true,
  });

  const { categories } = useCategories();
  const { products: allProducts, loading: allLoading } = useAllProducts();
  const rootCategories = useMemo(() => getRootCategories(categories), [categories]);

  // Auto-select first category on load
  useEffect(() => {
    if (selectedCategoryId || rootCategories.length === 0) return;
    setSelectedCategoryId(rootCategories[0]!.id);
  }, [rootCategories, selectedCategoryId]);

  const isSearchMode = searchQuery.trim().length > 0;

  const combinedFilters = useMemo<ProductFilters>(
    () => ({
      ...filters,
      search: searchQuery || undefined,
      categoryId: isSearchMode ? undefined : selectedCategoryId ?? undefined,
      subcategoryId: isSearchMode ? undefined : selectedSubcategoryId ?? undefined,
      active: true,
    }),
    [filters, searchQuery, isSearchMode, selectedCategoryId, selectedSubcategoryId]
  );

  const { products: searchProducts, loading: searchLoading } = useProducts(
    isSearchMode ? combinedFilters : undefined
  );

  const menuProducts = useMemo(() => {
    if (isSearchMode) return sortProducts(searchProducts);
    const filtered = filterMenuProducts(
      allProducts,
      selectedCategoryId,
      selectedSubcategoryId,
      categories
    );
    return sortProducts(filtered);
  }, [
    isSearchMode,
    searchProducts,
    allProducts,
    selectedCategoryId,
    selectedSubcategoryId,
    categories,
  ]);

  const displayProducts = menuProducts;
  const loading = isSearchMode ? searchLoading : allLoading;

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const selectedSub = selectedSubcategoryId
    ? categories.find((c) => c.id === selectedSubcategoryId) ?? null
    : null;

  const sectionTitle = useMemo(() => {
    if (isSearchMode) return t("catalog.fullMenu");
    if (selectedSub) {
      const sub = categories.find((c) => c.id === selectedSubcategoryId);
      return sub?.name_he || sub?.name_en || t("catalog.menuSection");
    }
    if (selectedCategory) {
      return selectedCategory.name_he || selectedCategory.name_en || t("catalog.menuSection");
    }
    return t("catalog.menuSection");
  }, [isSearchMode, selectedSub, selectedCategory, selectedSubcategoryId, categories, t]);

  const showProducts =
    isSearchMode ||
    (selectedCategoryId &&
      (!hasSubcategories(categories, selectedCategoryId) || selectedSubcategoryId));

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      setSelectedCategoryId(categoryId);
      setSelectedSubcategoryId(null);
      requestAnimationFrame(() => {
        document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    []
  );

  const handleSubcategorySelect = useCallback((subcategoryId: string) => {
    setSelectedSubcategoryId(subcategoryId);
  }, []);

  const needsSubcategoryPick =
    !isSearchMode &&
    selectedCategoryId &&
    hasSubcategories(categories, selectedCategoryId) &&
    !selectedSubcategoryId;

  return (
    <>
      <CatalogSeeder />
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <HeroBanner />

      <StickyCatalogBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {!isSearchMode && (
        <section className="border-b border-beige-dark/10 bg-cream/50">
          <MenuCategoryStrip
            selectedId={selectedCategoryId}
            onSelect={handleCategorySelect}
          />
          <SubcategoryChips
            parentId={selectedCategoryId}
            selectedSubId={selectedSubcategoryId}
            onSelect={handleSubcategorySelect}
          />
        </section>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
        <ProductFiltersBar
          filters={combinedFilters}
          onFiltersChange={setFilters}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />
      </motion.div>

      <div id="menu" className="mb-24 mt-6 md:mb-8">
        <div className="mb-4 flex items-center justify-between px-4 md:px-6">
          <h2 className="heading-section">{sectionTitle}</h2>
          {showProducts && (
            <p className="rounded-full bg-beige/60 px-3 py-1 text-sm font-medium text-coffee">
              {loading ? "..." : `${displayProducts.length} ${t("catalog.productsCount")}`}
            </p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {needsSubcategoryPick ? (
            <motion.p
              key="pick-sub"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-4 py-12 text-center text-sm text-coffee/50 md:px-6"
            >
              {t("catalog.pickSubcategory")}
            </motion.p>
          ) : showProducts ? (
            <motion.div
              key={`${selectedCategoryId}-${selectedSubcategoryId}-${searchQuery}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ProductGrid
                products={displayProducts}
                loading={loading}
                onProductClick={setSelectedProduct}
                incrementalMobile
              />
            </motion.div>
          ) : (
            <motion.p
              key="pick-cat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-12 text-center text-sm text-coffee/50 md:px-6"
            >
              {t("catalog.pickCategory")}
            </motion.p>
          )}
        </AnimatePresence>
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
