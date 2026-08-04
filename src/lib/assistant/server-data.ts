import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { mapCategory, mapProduct } from "@/lib/mappers";
import {
  mapMasterMenuCategories,
  mapMasterMenuProducts,
} from "@/lib/menu/map-master-menu";
import type { Locale } from "@/lib/i18n/types";
import {
  getCategoryDisplayName,
  getLocalizedBannerField,
  getLocalizedDescription,
  getProductDisplayName,
} from "@/lib/i18n/localized-content";
import { getProductImage } from "@/lib/menu/placeholders";
import type { Category, Product } from "@/types";
import type { FirestoreSettings } from "@/types/firestore";
import { parseAssistantConfig } from "@/lib/assistant/parse-config";
import {
  ASSISTANT_DOC_ID,
  type AssistantContext,
  type AssistantProduct,
} from "@/lib/assistant/types";

function localizeProduct(p: Product, locale: Locale, categoryName?: string): AssistantProduct {
  return {
    id: p.id,
    name: getProductDisplayName(p, locale),
    description: getLocalizedDescription(p, locale),
    price: p.price,
    image: getProductImage(p.image, p.categoryId),
    categoryId: p.categoryId,
    categoryName,
    available: p.available,
    isPopular: p.isPopular,
    isNew: p.isNew,
    searchText: [
      p.name_he,
      p.name_ar,
      p.name_en,
      p.description_he,
      p.description_ar,
      p.description_en,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export async function loadAssistantContext(locale: Locale): Promise<AssistantContext> {
  const db = getAdminDb();

  const [productsSnap, categoriesSnap, settingsSnap, assistantSnap, bannersSnap] =
    await Promise.all([
      db.collection(COLLECTIONS.products).get(),
      db.collection(COLLECTIONS.categories).get(),
      db.doc(`${COLLECTIONS.settings}/app`).get(),
      db.doc(`${COLLECTIONS.assistant}/${ASSISTANT_DOC_ID}`).get(),
      db.collection(COLLECTIONS.banners).where("active", "==", true).get(),
    ]);

  let products: Product[] = productsSnap.docs.map((d) =>
    mapProduct({ id: d.id, ...(d.data() as import("@/types/firestore").FirestoreProduct) })
  );
  let categories: Category[] = categoriesSnap.docs.map((d) =>
    mapCategory({ id: d.id, ...(d.data() as import("@/types/firestore").FirestoreCategory) })
  );

  if (products.length === 0) products = mapMasterMenuProducts();
  if (categories.length === 0) categories = mapMasterMenuCategories();

  products = products.filter((p) => p.active !== false);
  categories = categories.filter((c) => c.active !== false);

  const settingsData = settingsSnap.exists
    ? (settingsSnap.data() as FirestoreSettings)
    : undefined;

  const config = parseAssistantConfig(
    assistantSnap.exists ? (assistantSnap.data() as Record<string, unknown>) : undefined
  );

  const categoryMap = new Map(
    categories.map((c) => [c.id, getCategoryDisplayName(c, locale)])
  );

  const banners = bannersSnap.docs
    .map((d) => {
      const b = d.data() as Record<string, unknown>;
      const slide = { id: d.id, ...b } as import("@/types").BannerSlide & { id: string };
      return {
        title: getLocalizedBannerField(slide, "title", locale) || String(b.title ?? ""),
        subtitle: getLocalizedBannerField(slide, "subtitle", locale) || String(b.subtitle ?? ""),
      };
    })
    .filter((b) => b.title);

  return {
    locale,
    products: products.map((p) =>
      localizeProduct(p, locale, categoryMap.get(p.categoryId))
    ),
    categories: categories.map((c) => ({
      id: c.id,
      name: getCategoryDisplayName(c, locale),
      searchText: [c.name_he, c.name_ar, c.name_en].filter(Boolean).join(" "),
    })),
    config,
    settings: {
      phone: settingsData?.phone ?? "",
      address: settingsData?.address ?? "",
      hours: settingsData?.hours ?? "Sun–Thu 7:00–22:00",
      whatsapp: settingsData?.social?.whatsapp ?? settingsData?.phone ?? "",
      mapsUrl: settingsData?.mapsUrl ?? "",
    },
    banners,
  };
}
