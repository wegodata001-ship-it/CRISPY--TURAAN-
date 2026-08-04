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
  getLocalizedDescription,
  getProductDisplayName,
} from "@/lib/i18n/localized-content";
import type { Category, Product } from "@/types";
import type { FirestoreSettings } from "@/types/firestore";
import {
  DEFAULT_AI_CONFIG,
  type AiAssistantConfig,
  type AiMenuCategory,
  type AiMenuContext,
  type AiMenuProduct,
} from "@/lib/ai/types";

const AI_SETTINGS_DOC = "ai_assistant";

function localizeProduct(p: Product, locale: Locale): AiMenuProduct {
  return {
    id: p.id,
    name: getProductDisplayName(p, locale),
    description: getLocalizedDescription(p, locale),
    price: p.price,
    image: p.image,
    categoryId: p.categoryId,
    available: p.available,
    isPopular: p.isPopular,
    isNew: p.isNew,
  };
}

function localizeCategory(c: Category, locale: Locale): AiMenuCategory {
  return {
    id: c.id,
    name: getCategoryDisplayName(c, locale),
  };
}

function parseAiConfig(data: Record<string, unknown> | undefined): AiAssistantConfig {
  if (!data) return DEFAULT_AI_CONFIG;
  return {
    ...DEFAULT_AI_CONFIG,
    ...(data as Partial<AiAssistantConfig>),
    welcomeMessage: {
      ...DEFAULT_AI_CONFIG.welcomeMessage,
      ...(data.welcomeMessage as AiAssistantConfig["welcomeMessage"] | undefined),
    },
    quickActions: (data.quickActions as AiAssistantConfig["quickActions"]) ?? DEFAULT_AI_CONFIG.quickActions,
    suggestedQuestions:
      (data.suggestedQuestions as AiAssistantConfig["suggestedQuestions"]) ??
      DEFAULT_AI_CONFIG.suggestedQuestions,
    faq: (data.faq as AiAssistantConfig["faq"]) ?? DEFAULT_AI_CONFIG.faq,
    crossSellRules:
      (data.crossSellRules as AiAssistantConfig["crossSellRules"]) ?? DEFAULT_AI_CONFIG.crossSellRules,
    featuredProductIds:
      (data.featuredProductIds as string[]) ?? DEFAULT_AI_CONFIG.featuredProductIds,
  };
}

export async function loadAiMenuContext(locale: Locale): Promise<AiMenuContext> {
  const db = getAdminDb();

  const [productsSnap, categoriesSnap, settingsSnap, aiSnap, bannersSnap] =
    await Promise.all([
      db.collection(COLLECTIONS.products).get(),
      db.collection(COLLECTIONS.categories).get(),
      db.doc(`${COLLECTIONS.settings}/app`).get(),
      db.doc(`${COLLECTIONS.settings}/${AI_SETTINGS_DOC}`).get(),
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

  const config = parseAiConfig(
    aiSnap.exists ? (aiSnap.data() as Record<string, unknown>) : undefined
  );

  const banners = bannersSnap.docs
    .map((d) => {
      const b = d.data();
      return { title: String(b.title ?? ""), subtitle: String(b.subtitle ?? "") };
    })
    .filter((b) => b.title);

  return {
    locale,
    products: products.map((p) => localizeProduct(p, locale)),
    categories: categories.map((c) => localizeCategory(c, locale)),
    config,
    settings: {
      phone: settingsData?.phone ?? "",
      address: settingsData?.address ?? "",
      hours: settingsData?.hours ?? "Sun–Thu 7:00–22:00",
      whatsapp: settingsData?.social?.whatsapp ?? settingsData?.phone ?? "",
    },
    banners,
  };
}
