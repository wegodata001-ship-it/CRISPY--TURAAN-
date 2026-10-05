"use client";

import { ProductCard } from "@/features/catalog/product-card";
import { PRODUCT_GRID_CLASS } from "@/features/catalog/product-grid";
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import type { Category, Product } from "@/types";

interface CategoryProductSectionProps {
  category: Category;
  products: Product[];
  onProductClick: (product: Product) => void;
}

export function CategoryProductSection({
  category,
  products,
  onProductClick,
}: CategoryProductSectionProps) {
  const localized = useLocalizedCategory(category);

  if (products.length === 0) return null;

  return (
    <section id={`category-${category.id}`} className="scroll-mt-36 py-2">
      <div className="mb-4">
        <h2
          className="font-display text-2xl font-bold text-[#171717]"
          dir={localized.dir}
        >
          {localized.name}
        </h2>
        <div className="mt-2 h-px w-16 bg-[#F6B800]" />
      </div>
      <div className={PRODUCT_GRID_CLASS}>
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            variant="card"
            onClick={() => onProductClick(product)}
          />
        ))}
      </div>
    </section>
  );
}

export { PRODUCT_GRID_CLASS as CATALOG_GRID_CLASS };
