"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BRAND } from "@/lib/brand";
import { formatPrice, cn } from "@/lib/utils";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import { useT, useLocale } from "@/components/providers/locale-provider";
import {
  useLocalizedCategory,
  useLocalizedProduct,
} from "@/hooks/useLocalizedContent";
import { ProductImage } from "@/components/catalog/product-image";
import { CatalogModifierPreviewProvider, useProductModifierPreview } from "@/features/catalog/catalog-modifier-preview-context";
import { ProductModifiersTeaser } from "@/features/catalog/product-modifiers-teaser";
import { MenuProductDetailsModal } from "@/features/menu-display/menu-product-details-modal";
import { HorizontalScroller } from "@/components/ui/horizontal-scroller";
import {
  filterMenuDisplayProducts,
  getRootCategories,
} from "@/lib/menu/category-tree";
import type { Category, Product } from "@/types";

function productMatchesQuery(product: Product, query: string): boolean {
  if (!query) return true;
  const haystack = [
    product.name_he,
    product.name_ar,
    product.name_en,
    product.description_he,
    product.description_ar,
    product.description_en,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

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
      data-hscroll-active={active ? "true" : undefined}
      className={cn(
        "shrink-0 flex-none rounded-full px-4 py-2 text-sm font-semibold transition-colors md:px-5 md:text-base",
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

function MenuDisplayCard({
  product,
  index,
  onOpen,
}: {
  product: Product;
  index: number;
  onOpen: () => void;
}) {
  const t = useT();
  const localized = useLocalizedProduct(product);
  const modifierPreview = useProductModifierPreview(product.id);

  return (
    <motion.article
      role="button"
      tabIndex={0}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.28 }}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "flex h-full w-full max-w-none cursor-pointer flex-col overflow-hidden rounded-2xl bg-warm-white text-start shadow-soft ring-1 ring-beige-dark/15 transition-shadow hover:shadow-md min-[480px]:max-w-[420px] dark:bg-[#1a1412] dark:ring-white/10",
        !product.available && "opacity-60"
      )}
    >
      <div className="relative h-[180px] w-full bg-[#FFF4E2] sm:h-[200px] md:h-[240px] dark:bg-white/5">
        <ProductImage
          image={product.image}
          categoryId={product.categoryId}
          alt={localized.name}
          className="object-cover"
          sizes="(max-width:640px) 100vw, (max-width:1024px) 33vw, 20vw"
        />
        {!product.available && (
          <span className="absolute start-3 top-3 rounded-full bg-dark-brown/80 px-2.5 py-1 text-[11px] font-medium text-warm-white">
            {t("menuDisplay.soldOut", "אזל זמנית")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4 md:p-5">
        <h3 className="break-words font-display text-lg font-bold leading-snug text-dark-brown md:text-xl dark:text-warm-white">
          {localized.name}
        </h3>
        {localized.description?.trim() ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-coffee/70 dark:text-warm-white/65">
            {localized.description}
          </p>
        ) : null}
        <ProductModifiersTeaser groups={modifierPreview} />
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
  const { settings } = useSettings();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const { categories, loading: catsLoading } = useCategories();
  const { products, loading: productsLoading } = useProducts({ active: true });

  const rootCategories = useMemo(() => getRootCategories(categories), [categories]);
  const query = search.trim().toLowerCase();
  const visibleProducts = useMemo(
    () =>
      filterMenuDisplayProducts(products, selectedCategoryId, categories).filter((product) =>
        productMatchesQuery(product, query)
      ),
    [products, selectedCategoryId, categories, query]
  );
  const storeTitle = BRAND.publicName;
  const phone = settings?.phone?.trim();
  const address = settings?.address?.trim();
  const hours = settings?.hours?.trim();
  const whatsapp = settings?.social?.whatsapp?.trim();

  const loading = catsLoading || productsLoading;

  return (
    <CatalogModifierPreviewProvider>
    <div
      dir={dir}
      className="min-h-dvh overflow-x-hidden bg-gradient-to-b from-cream via-[#F5EDE3] to-cream text-dark-brown dark:from-[#120e0c] dark:via-[#16110f] dark:to-[#120e0c]"
      data-menu-display
    >
      <header className="sticky top-0 z-30 border-b border-beige-dark/20 bg-cream/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#120e0c]/90">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <AppLogo size="md" href={null} className="h-11 w-auto shrink-0 md:h-14" priority />
            <div className="min-w-0">
              <p className="truncate font-display text-[17px] font-bold leading-tight tracking-wide md:text-2xl">
                {storeTitle}
              </p>
              <p className="truncate text-xs text-coffee/55 md:text-sm dark:text-warm-white/50">
                {t("menuDisplay.subtitle", "תפריט דיגיטלי")}
              </p>
            </div>
          </div>
          <LanguageSwitcher compact />
        </div>

        <div className="mx-auto max-w-[1600px] space-y-3 px-4 pb-3 md:px-6 md:pb-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee/40" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("menuDisplay.search", "חיפוש בתפריט")}
              className="h-11 w-full rounded-full bg-warm-white pe-4 ps-10 text-base text-dark-brown shadow-soft ring-1 ring-beige-dark/20 placeholder:text-coffee/40 focus:outline-none focus:ring-2 focus:ring-crispy-red/40 dark:bg-white/5 dark:text-warm-white dark:ring-white/10"
            />
          </label>
          <HorizontalScroller
            activeKey={selectedCategoryId ?? "__all__"}
            aria-label={t("menuDisplay.categories", "קטגוריות")}
            fadeFromClassName="from-cream dark:from-[#120e0c]"
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
          </HorizontalScroller>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-5 md:px-6 md:py-8">
        {loading ? (
          <div className="grid justify-items-stretch gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))] md:gap-5">
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
          <div className="grid justify-items-stretch gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))] md:gap-5">
            {visibleProducts.map((product, index) => (
              <MenuDisplayCard
                key={product.id}
                product={product}
                index={index}
                onOpen={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        )}
      </main>

      {(phone || address || hours || whatsapp) && (
        <footer className="mx-auto max-w-[1600px] px-4 pb-8 pt-2 text-sm text-coffee/70 md:px-6 dark:text-warm-white/60">
          <p className="font-semibold text-dark-brown dark:text-warm-white">
            {t("menuDisplay.contact", "יצירת קשר")}
          </p>
          <div className="mt-1 space-y-1 break-words">
            {phone ? (
              <p>
                <a href={`tel:${phone}`} className="underline-offset-2 hover:underline">
                  {phone}
                </a>
              </p>
            ) : null}
            {whatsapp ? (
              <p>
                <a
                  href={whatsapp.startsWith("http") ? whatsapp : `https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                  className="underline-offset-2 hover:underline"
                >
                  WhatsApp
                </a>
              </p>
            ) : null}
            {address ? <p>{address}</p> : null}
            {hours ? <p>{hours}</p> : null}
          </div>
        </footer>
      )}

      <MenuProductDetailsModal
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
      />
    </div>
    </CatalogModifierPreviewProvider>
  );
}
