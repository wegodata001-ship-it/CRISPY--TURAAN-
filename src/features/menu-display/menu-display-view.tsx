"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppLogo } from "@/components/brand/app-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BRAND } from "@/lib/brand";
import { formatPrice, cn } from "@/lib/utils";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useT, useLocale } from "@/components/providers/locale-provider";
import {
  useLocalizedCategory,
  useLocalizedProduct,
} from "@/hooks/useLocalizedContent";
import { ProductImage } from "@/components/catalog/product-image";
import {
  filterMenuDisplayProducts,
  getRootCategories,
} from "@/lib/menu/category-tree";
import type { Category, Product } from "@/types";

function CategoryTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors md:px-5 md:text-base",
        active
          ? "bg-coffee text-warm-white shadow-soft dark:bg-turquoise"
          : "bg-warm-white text-coffee/75 ring-1 ring-beige-dark/25 hover:bg-beige/50 dark:bg-white/5 dark:text-warm-white/80 dark:ring-white/10"
      )}
    >
      {children}
    </button>
  );
}

function CategoryLabel({ category }: { category: Category }) {
  const localized = useLocalizedCategory(category);
  return <>{localized.name}</>;
}

function MenuDisplayCard({ product, index }: { product: Product; index: number }) {
  const t = useT();
  const localized = useLocalizedProduct(product);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.28 }}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl bg-warm-white shadow-soft ring-1 ring-beige-dark/15 dark:bg-[#1a1412] dark:ring-white/10",
        !product.available && "opacity-60"
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-beige/40 dark:bg-white/5">
        <ProductImage
          image={product.image}
          categoryId={product.categoryId}
          alt={localized.name}
          className="object-contain p-2"
          sizes="(max-width:640px) 100vw, (max-width:1024px) 33vw, 20vw"
        />
        {!product.available && (
          <span className="absolute start-3 top-3 rounded-full bg-dark-brown/80 px-2.5 py-1 text-[11px] font-medium text-warm-white">
            {t("catalog.unavailable", "לא זמין")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
        <h3 className="font-display text-lg font-bold leading-snug text-dark-brown md:text-xl dark:text-warm-white">
          {localized.name}
        </h3>
        {localized.description?.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-coffee/70 dark:text-warm-white/65">
            {localized.description}
          </p>
        ) : null}
        <p className="mt-auto pt-2 text-xl font-bold text-turquoise md:text-2xl">
          {formatPrice(product.price)}
        </p>
      </div>
    </motion.article>
  );
}

export function MenuDisplayView() {
  const t = useT();
  const { dir } = useLocale();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const { categories, loading: catsLoading } = useCategories();
  const { products, loading: productsLoading } = useProducts({ active: true });

  const rootCategories = useMemo(() => getRootCategories(categories), [categories]);
  const visibleProducts = useMemo(
    () => filterMenuDisplayProducts(products, selectedCategoryId, categories),
    [products, selectedCategoryId, categories]
  );

  const loading = catsLoading || productsLoading;

  return (
    <div
      dir={dir}
      className="min-h-dvh bg-gradient-to-b from-cream via-[#F5EDE3] to-cream text-dark-brown dark:from-[#120e0c] dark:via-[#16110f] dark:to-[#120e0c]"
      data-menu-display
    >
      <header className="sticky top-0 z-30 border-b border-beige-dark/20 bg-cream/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#120e0c]/90">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <AppLogo size="md" href={null} className="h-11 w-auto md:h-14" priority />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold tracking-wide md:text-2xl">
                {BRAND.name}
              </p>
              <p className="truncate text-xs text-coffee/55 md:text-sm dark:text-warm-white/50">
                {t("menuDisplay.subtitle", "תפריט דיגיטלי")}
              </p>
            </div>
          </div>
          <LanguageSwitcher compact />
        </div>

        <div className="mx-auto max-w-[1600px] px-4 pb-3 md:px-6 md:pb-4">
          <nav
            aria-label={t("menuDisplay.categories", "קטגוריות")}
            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <CategoryTabButton
              active={selectedCategoryId == null}
              onClick={() => setSelectedCategoryId(null)}
            >
              {t("menuDisplay.all", "הכל")}
            </CategoryTabButton>
            {rootCategories.map((category) => (
              <CategoryTabButton
                key={category.id}
                active={selectedCategoryId === category.id}
                onClick={() => setSelectedCategoryId(category.id)}
              >
                <CategoryLabel category={category} />
              </CategoryTabButton>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-5 md:px-6 md:py-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl bg-beige/50 dark:bg-white/5"
              />
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <p className="py-16 text-center text-coffee/55 dark:text-warm-white/50">
            {t("catalog.noProducts", "אין מוצרים להצגה")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
            {visibleProducts.map((product, index) => (
              <MenuDisplayCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
