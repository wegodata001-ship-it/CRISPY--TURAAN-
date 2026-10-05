"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/layout/header";
import { HeroBanner } from "@/features/catalog/hero-banner";
import { MenuCategoryStrip } from "@/features/catalog/menu-category-strip";
import { SubcategoryChips } from "@/features/catalog/subcategory-chips";
import { ProductGrid } from "@/features/catalog/product-grid";
import { CategoryProductSection } from "@/features/catalog/category-product-section";
import { ProductDetailDrawer } from "@/features/catalog/product-detail-drawer";
import { CatalogModifierPreviewProvider } from "@/features/catalog/catalog-modifier-preview-context";
import { CatalogSeeder } from "@/components/catalog/catalog-seeder";
import { CartSidebar } from "@/features/cart/cart-sidebar";
import { Input } from "@/components/ui/input";
import { useProducts, useAllProducts, useCategories } from "@/hooks/useProducts";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import {
  filterMenuDisplayProducts,
  filterMenuProducts,
  getRootCategories,
  sortProducts,
} from "@/lib/menu/category-tree";
import type { Category, Product, ProductFilters } from "@/types";

function CategoryHeading({ category }: { category: Category | undefined }) {
  const localized = useLocalizedCategory(category ?? null);
  if (!category) return null;
  return (
    <div className="mb-4">
      <h2 className="font-display text-2xl font-bold text-[#171717]" dir={localized.dir}>
        {localized.name}
      </h2>
      <div className="mt-2 h-px w-16 bg-[#F6B800]" />
    </div>
  );
}

function rootCategoryId(product: Product, categories: Category[]): string {
  const own = categories.find((category) => category.id === product.categoryId);
  if (own?.parentId) return own.parentId;
  if (product.subcategoryId) {
    const sub = categories.find((category) => category.id === product.subcategoryId);
    if (sub?.parentId) return sub.parentId;
  }
  return product.categoryId;
}

export function CatalogView() {
  const t = useT();
  const { dir } = useLocale();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const bannerTargetApplied = useRef(false);

  const { categories } = useCategories();
  const { products: allProducts, loading: allLoading } = useAllProducts();
  const rootCategories = useMemo(() => getRootCategories(categories), [categories]);

  useEffect(() => {
    if (bannerTargetApplied.current || (categories.length === 0 && allProducts.length === 0)) return;
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get("category");
    const productId = params.get("product");
    if (categoryId && categories.some((category) => category.id === categoryId)) {
      setSelectedCategoryId(categoryId);
      setSelectedSubcategoryId(null);
      bannerTargetApplied.current = true;
    } else if (productId) {
      const product = allProducts.find((item) => item.id === productId);
      if (product) {
        setSelectedProduct(product);
        bannerTargetApplied.current = true;
      }
    }
  }, [allProducts, categories]);

  const isSearchMode = searchQuery.trim().length > 0;

  const searchFilters = useMemo<ProductFilters>(
    () => ({
      search: searchQuery || undefined,
      active: true,
    }),
    [searchQuery]
  );

  const { products: searchProducts, loading: searchLoading } = useProducts(
    isSearchMode ? searchFilters : undefined
  );

  const menuProducts = useMemo(() => {
    if (isSearchMode) return sortProducts(searchProducts);
    if (selectedSubcategoryId) {
      return sortProducts(filterMenuProducts(allProducts, selectedCategoryId, selectedSubcategoryId, categories));
    }
    return filterMenuDisplayProducts(allProducts, selectedCategoryId, categories);
  }, [
    isSearchMode,
    searchProducts,
    allProducts,
    selectedCategoryId,
    selectedSubcategoryId,
    categories,
  ]);

  const loading = isSearchMode ? searchLoading : allLoading;

  const bestsellers = useMemo(
    () => allProducts.filter((product) => product.active && product.isPopular).slice(0, 10),
    [allProducts]
  );

  const groupedMenu = useMemo(() => {
    if (isSearchMode || selectedCategoryId) return [];
    return rootCategories
      .map((category) => ({
        category,
        products: menuProducts.filter((product) => rootCategoryId(product, categories) === category.id),
      }))
      .filter((group) => group.products.length > 0);
  }, [isSearchMode, selectedCategoryId, rootCategories, menuProducts, categories]);

  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(null);
    requestAnimationFrame(() => {
      document.getElementById("menu")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const showBestsellers = isHome && !isSearchMode && !selectedCategoryId && bestsellers.length > 0;

  return (
    <CatalogModifierPreviewProvider>
      <>
        <CatalogSeeder />
        <SiteHeader />
        {isHome && <HeroBanner />}

        <div className="mx-auto max-w-[1280px] px-4 md:px-6">
          <div
            dir="ltr"
            className="grid gap-6 pb-36 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:pb-12"
          >
            <div className="min-w-0" dir={dir}>
              <div className="relative mt-4">
                <Search
                  className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-light"
                  strokeWidth={1.75}
                />
                <Input
                  id="menu-search"
                  placeholder={t("header.search")}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label={t("header.search")}
                  dir={dir}
                  className="h-12 w-full rounded-2xl border-beige-dark bg-warm-white ps-10 text-base shadow-soft"
                />
              </div>

              {!isSearchMode && (
                <div className="sticky top-[64px] z-30 -mx-4 mt-3 bg-cream/95 px-4 py-2 backdrop-blur-md md:top-[72px]">
                  <MenuCategoryStrip
                    selectedId={selectedCategoryId}
                    onSelect={handleCategorySelect}
                  />
                  <SubcategoryChips
                    parentId={selectedCategoryId}
                    selectedSubId={selectedSubcategoryId}
                    onSelect={setSelectedSubcategoryId}
                  />
                </div>
              )}

              {showBestsellers && (
                <section className="mt-5">
                  <div className="mb-4">
                    <h2 className="font-display text-2xl font-bold text-[#171717]">
                      {t("catalog.hotSellers")}
                    </h2>
                    <div className="mt-2 h-px w-16 bg-[#F6B800]" />
                  </div>
                  <ProductGrid
                    products={bestsellers}
                    loading={false}
                    onProductClick={setSelectedProduct}
                  />
                </section>
              )}

              <div id="menu" className="mt-6 scroll-mt-[8.5rem]">
                {loading ? (
                  <ProductGrid products={[]} loading onProductClick={setSelectedProduct} />
                ) : isSearchMode || selectedCategoryId ? (
                  <>
                    {selectedCategoryId && !isSearchMode && (
                      <CategoryHeading
                        category={categories.find((category) => category.id === selectedCategoryId)}
                      />
                    )}
                    <ProductGrid
                      products={menuProducts}
                      loading={false}
                      onProductClick={setSelectedProduct}
                    />
                  </>
                ) : groupedMenu.length > 0 ? (
                  <div className="space-y-6">
                    {groupedMenu.map(({ category, products }) => (
                      <CategoryProductSection
                        key={category.id}
                        category={category}
                        products={products}
                        onProductClick={setSelectedProduct}
                      />
                    ))}
                  </div>
                ) : (
                  <ProductGrid
                    products={menuProducts}
                    loading={false}
                    onProductClick={setSelectedProduct}
                  />
                )}
              </div>
            </div>

            <div dir={dir}>
              <CartSidebar className="hidden lg:block" />
            </div>
          </div>
        </div>

        <ProductDetailDrawer
          product={selectedProduct}
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
          onSelectProduct={setSelectedProduct}
        />
      </>
    </CatalogModifierPreviewProvider>
  );
}
