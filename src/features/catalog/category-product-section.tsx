"use client";

import { ProductCard } from "@/features/catalog/product-card";
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import type { Category, Product } from "@/types";

const GRID_CLASS = "flex flex-col gap-3";

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
      <h2 className="mb-3 px-0.5 font-display text-lg font-bold text-dark-brown" dir={localized.dir}>
        {localized.name}
      </h2>
      <div className={GRID_CLASS}>
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            variant="row"
            onClick={() => onProductClick(product)}
          />
        ))}
      </div>
    </section>
  );
}

export { GRID_CLASS as CATALOG_GRID_CLASS };
