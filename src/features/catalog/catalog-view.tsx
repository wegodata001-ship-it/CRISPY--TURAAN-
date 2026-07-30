"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { HeroBanner } from "@/features/catalog/hero-banner";
import { CategoryScroll } from "@/features/catalog/category-scroll";
import { ProductFiltersBar } from "@/features/catalog/product-filters-bar";
import { ProductGrid } from "@/features/catalog/product-grid";
import { AboutCafeCard } from "@/components/brand/about-cafe-card";
import { SiteFooter } from "@/components/layout/footer";
import { useProducts } from "@/hooks/useProducts";
import type { ProductFilters } from "@/types";

export function CatalogView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({
    sortBy: "newest",
  });

  const combinedFilters = useMemo<ProductFilters>(
    () => ({
      ...filters,
      search: searchQuery || undefined,
      categoryId: selectedCategory,
    }),
    [filters, searchQuery, selectedCategory]
  );

  const { products, loading } = useProducts(combinedFilters);

  return (
    <>
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <HeroBanner />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-2"
      >
        <CategoryScroll
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </motion.div>

      <ProductFiltersBar
        filters={combinedFilters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
        }}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      <AboutCafeCard />

      <div id="menu" className="mt-4 mb-4">
        <div className="mb-3 px-4 md:px-6">
          <p className="text-sm text-coffee/60">
            {loading ? "Loading..." : `${products.length} products`}
          </p>
        </div>
        <ProductGrid products={products} loading={loading} />
      </div>

      <SiteFooter />
    </>
  );
}
