import type { Locale } from "@/lib/i18n/types";
import { fuzzyScore, matchesAny, normalizeText } from "@/lib/assistant/fuzzy";
import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantContext,
  AssistantProduct,
  AssistantQuickAction,
} from "@/lib/assistant/types";

const MSG: Record<
  Locale,
  {
    noResults: string;
    popularIntro: string;
    offersIntro: string;
    categoryIntro: (name: string) => string;
    categoriesIntro: string;
    searchIntro: (query: string) => string;
    priceIntro: (max: number) => string;
    cartEmpty: string;
    cartSummary: (count: number, total: number) => string;
    checkoutHint: string;
    contactIntro: string;
    hours: (h: string) => string;
    address: (a: string) => string;
    phone: (p: string) => string;
    delivery: string;
    pickup: string;
    addedToCart: (name: string) => string;
    productDetail: (name: string, price: number) => string;
    mapsLink: string;
  }
> = {
  he: {
    noResults: "לא מצאתי מוצרים מתאימים. נסו לחפש שם מוצר, קטגוריה, או בחרו מהכפתורים למטה.",
    popularIntro: "הנה המוצרים הכי פופולריים:",
    offersIntro: "הנה המבצעים שלנו:",
    categoryIntro: (name) => `הנה ${name}:`,
    categoriesIntro: "הנה המשקאות שלנו:",
    searchIntro: (q) => `תוצאות עבור "${q}":`,
    priceIntro: (max) => `מוצרים עד ₪${max}:`,
    cartEmpty: "העגלה ריקה. בחרו מוצרים מהתפריט.",
    cartSummary: (count, total) => `בעגלה ${count} פריטים — סה״כ ₪${total.toFixed(0)}`,
    checkoutHint: "לחצו 'לתשלום' להשלמת ההזמנה.",
    contactIntro: "ניתן ליצור קשר:",
    hours: (h) => `שעות פתיחה:\n${h}`,
    address: (a) => (a ? `כתובת:\n${a}` : "פרטי כתובת בקופה."),
    phone: (p) => (p ? `טלפון:\n${p}` : "טלפון לא הוגדר."),
    delivery: "אין משלוחים — הזמנות לאיסוף עצמי מהעסק בלבד.",
    pickup: "איסוף עצמי מהעסק — כל הזמנה היא לאיסוף עצמי.",
    addedToCart: (name) => `✓ ${name} נוסף לעגלה`,
    productDetail: (name, price) => `${name}\nמחיר: ₪${price.toFixed(0)}`,
    mapsLink: "פתחו במפות",
  },
  ar: {
    noResults: "لم أجد منتجات مطابقة. جرّب اسم منتج أو اختر من الأزرار أدناه.",
    popularIntro: "إليك المنتجات الأكثر شعبية:",
    offersIntro: "إليك عروضنا:",
    categoryIntro: (name) => `إليك ${name}:`,
    categoriesIntro: "إليك مشروباتنا:",
    searchIntro: (q) => `نتائج "${q}":`,
    priceIntro: (max) => `منتجات حتى ₪${max}:`,
    cartEmpty: "السلة فارغة. اختر من القائمة.",
    cartSummary: (count, total) => `${count} عناصر — ₪${total.toFixed(0)}`,
    checkoutHint: "اضغط 'الدفع' لإتمام الطلب.",
    contactIntro: "للتواصل:",
    hours: (h) => `ساعات العمل:\n${h}`,
    address: (a) => (a ? `العنوان:\n${a}` : "تفاصيل العنوان عند الكاشير."),
    phone: (p) => (p ? `الهاتف:\n${p}` : "لم يُحدد رقم."),
    delivery: "لا يوجد توصيل — الطلبات للاستلام الذاتي من المحل فقط.",
    pickup: "استلام ذاتي من المحل — كل طلب هو للاستلام الذاتي.",
    addedToCart: (name) => `✓ تمت إضافة ${name} إلى السلة`,
    productDetail: (name, price) => `${name}\nالسعر: ₪${price.toFixed(0)}`,
    mapsLink: "افتح في الخرائط",
  },
  en: {
    noResults: "No matching products. Try a product name or use the buttons below.",
    popularIntro: "Our most popular items:",
    offersIntro: "Current offers:",
    categoryIntro: (name) => `${name}:`,
    categoriesIntro: "Our beverages:",
    searchIntro: (q) => `Results for "${q}":`,
    priceIntro: (max) => `Items up to ₪${max}:`,
    cartEmpty: "Your cart is empty. Browse the menu to add items.",
    cartSummary: (count, total) => `${count} items — ₪${total.toFixed(0)} total`,
    checkoutHint: "Tap checkout to complete your order.",
    contactIntro: "Contact us:",
    hours: (h) => `Opening hours:\n${h}`,
    address: (a) => (a ? `Address:\n${a}` : "Address at the counter."),
    phone: (p) => (p ? `Phone:\n${p}` : "No phone configured."),
    delivery: "No delivery — orders are pickup from the store only.",
    pickup: "Pickup from the store — every order is pickup only.",
    addedToCart: (name) => `✓ ${name} added to cart`,
    productDetail: (name, price) => `${name}\nPrice: ₪${price.toFixed(0)}`,
    mapsLink: "Open in Maps",
  },
};

function m(ctx: AssistantContext) {
  return MSG[ctx.locale];
}

function available(ctx: AssistantContext): AssistantProduct[] {
  return ctx.products.filter((p) => p.available);
}

function top(products: AssistantProduct[], limit = 8): AssistantProduct[] {
  return [...products]
    .sort((a, b) => Number(b.isPopular) - Number(a.isPopular) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function search(ctx: AssistantContext, query: string, limit = 8): AssistantProduct[] {
  return available(ctx)
    .map((p) => ({
      p,
      score: fuzzyScore(query, p.searchText ?? `${p.name} ${p.description}`),
    }))
    .filter(({ score }) => score >= 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p);
}

function searchByCategoryName(ctx: AssistantContext, query: string, limit = 8): AssistantProduct[] {
  const matched = ctx.categories
    .map((c) => ({ c, score: fuzzyScore(query, c.searchText || c.name) }))
    .filter(({ score }) => score >= 0.4)
    .sort((a, b) => b.score - a.score);

  if (matched.length === 0) return [];
  const ids = new Set(matched.map(({ c }) => c.id));
  return top(
    available(ctx).filter((p) => ids.has(p.categoryId)),
    limit
  );
}

function findProduct(ctx: AssistantContext, productId: string): AssistantProduct | undefined {
  return available(ctx).find((p) => p.id === productId);
}

function cartTotals(ctx: AssistantContext, req: AssistantChatRequest) {
  const ids = req.cartProductIds ?? [];
  let total = 0;
  for (const id of ids) {
    const p = available(ctx).find((x) => x.id === id);
    if (p) total += p.price;
  }
  return { count: ids.length, total };
}

function byCategory(ctx: AssistantContext, categoryId: string, limit = 8): AssistantProduct[] {
  return top(
    available(ctx).filter((p) => p.categoryId === categoryId),
    limit
  );
}

function byCategories(ctx: AssistantContext, categoryIds: string[], limit = 8): AssistantProduct[] {
  const set = new Set(categoryIds);
  return top(
    available(ctx).filter((p) => set.has(p.categoryId)),
    limit
  );
}

function byMaxPrice(ctx: AssistantContext, maxPrice: number, limit = 8): AssistantProduct[] {
  return top(
    available(ctx).filter((p) => p.price <= maxPrice),
    limit
  );
}

function parseMaxPrice(text: string): number | null {
  const cleaned = text.replace(/[^\d.,]/g, " ").trim();
  const match = cleaned.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const value = parseFloat(match[1]!.replace(",", "."));
  return Number.isFinite(value) && value > 0 && value < 10000 ? value : null;
}

function suggestions(ctx: AssistantContext): string[] {
  return ctx.config.suggestedQuestions.map((q) => q[ctx.locale]).slice(0, 6);
}

function respond(
  ctx: AssistantContext,
  message: string,
  products: AssistantProduct[] = [],
  extra: Partial<AssistantChatResponse> = {}
): AssistantChatResponse {
  return {
    message,
    products,
    suggestions: extra.suggestions ?? suggestions(ctx),
    showContact: extra.showContact,
    showCart: extra.showCart,
    clientAction: extra.clientAction,
  };
}

function handleFaq(ctx: AssistantContext, text: string): AssistantChatResponse | null {
  const t = m(ctx);
  if (matchesAny(text, ["שעות", "hours", "פתוח", "open", "ساعات"])) {
    return respond(ctx, t.hours(ctx.settings.hours));
  }
  if (matchesAny(text, ["כתובת", "address", "איפה", "where", "عنوان", "מפה", "maps"])) {
    const addr = t.address(ctx.settings.address);
    return respond(ctx, addr, [], {
      showContact: Boolean(ctx.settings.mapsUrl || ctx.settings.phone),
    });
  }
  if (matchesAny(text, ["טלפון", "phone", "התקשר", "call", "هاتف", "צור קשר", "contact"])) {
    return respond(ctx, t.phone(ctx.settings.phone), [], { showContact: true });
  }
  if (matchesAny(text, ["משלוח", "delivery", "توصيل"])) {
    return respond(ctx, t.delivery);
  }
  if (matchesAny(text, ["איסוף", "pickup", "استلام"])) {
    return respond(ctx, t.pickup);
  }
  for (const item of ctx.config.faq.filter((f) => f.enabled)) {
    if (matchesAny(text, item.keywords) || matchesAny(text, [item.question[ctx.locale]])) {
      return respond(ctx, item.answer[ctx.locale]);
    }
  }
  return null;
}

function handleCart(ctx: AssistantContext, req: AssistantChatRequest): AssistantChatResponse | null {
  const t = m(ctx);
  const { count, total } = cartTotals(ctx, req);
  if (count === 0) {
    return respond(ctx, t.cartEmpty, [], { showCart: true, clientAction: { type: "show_cart" } });
  }
  const uniqueIds = [...new Set(req.cartProductIds ?? [])];
  const cartProducts = available(ctx).filter((p) => uniqueIds.includes(p.id));
  return respond(ctx, `${t.cartSummary(count, total)}\n${t.checkoutHint}`, cartProducts, {
    showCart: true,
    clientAction: { type: "show_cart" },
  });
}

function handleProductDetail(ctx: AssistantContext, productId: string): AssistantChatResponse | null {
  const product = findProduct(ctx, productId);
  if (!product) return null;
  const t = m(ctx);
  const lines = [
    t.productDetail(product.name, product.price),
    product.description,
    product.categoryName ? product.categoryName : "",
  ].filter(Boolean);
  return respond(ctx, lines.join("\n\n"), [product]);
}

function runQuickAction(action: AssistantQuickAction, ctx: AssistantContext, req: AssistantChatRequest): AssistantChatResponse {
  const t = m(ctx);
  switch (action.action) {
    case "popular": {
      const items = top(available(ctx).filter((p) => p.isPopular), 8);
      return respond(ctx, t.popularIntro, items.length ? items : top(available(ctx), 8));
    }
    case "offers": {
      const items = ctx.config.featuredProductIds.length
        ? available(ctx).filter((p) => ctx.config.featuredProductIds.includes(p.id))
        : top(available(ctx).filter((p) => p.isPopular || p.isNew), 8);
      const intro =
        ctx.banners.length > 0
          ? `${t.offersIntro}\n${ctx.banners.map((b) => `• ${b.title}`).join("\n")}`
          : t.offersIntro;
      return respond(ctx, intro, items);
    }
    case "cart":
      return handleCart(ctx, req) ?? respond(ctx, t.cartEmpty, [], { showCart: true });
    case "checkout":
      return respond(ctx, t.checkoutHint, [], { clientAction: { type: "checkout" } });
    case "contact":
      return respond(ctx, `${t.contactIntro}\n${t.phone(ctx.settings.phone)}`, [], { showContact: true });
    case "product":
      if (action.productId) {
        return handleProductDetail(ctx, action.productId) ?? respond(ctx, t.noResults);
      }
      break;
    case "page":
      if (action.url) {
        return respond(ctx, action.label[ctx.locale], [], {
          clientAction: { type: "open_url", url: action.url },
        });
      }
      break;
    case "whatsapp":
      return respond(ctx, action.label[ctx.locale], [], {
        clientAction: {
          type: "open_url",
          url: action.url || ctx.settings.whatsapp || `https://wa.me/${ctx.settings.phone}`,
        },
      });
    case "question":
      if (action.question?.[ctx.locale]) {
        return processMessage({ ...req, message: action.question[ctx.locale] }, ctx);
      }
      break;
    case "category":
      if (action.categoryId) {
        const cat = ctx.categories.find((c) => c.id === action.categoryId);
        return respond(ctx, t.categoryIntro(cat?.name ?? action.categoryId), byCategory(ctx, action.categoryId, 8));
      }
      break;
    case "categories":
      if (action.categoryIds?.length) {
        return respond(ctx, t.categoriesIntro, byCategories(ctx, action.categoryIds, 8));
      }
      break;
  }
  return respond(ctx, t.noResults, top(available(ctx), 4));
}

export function processQuickAction(
  actionId: string,
  ctx: AssistantContext,
  req: AssistantChatRequest
): AssistantChatResponse {
  const action = ctx.config.quickActions
    .filter((a) => a.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .find((a) => a.id === actionId);
  if (!action) return processMessage(req, ctx);
  return runQuickAction(action, ctx, req);
}

export function processMessage(req: AssistantChatRequest, ctx: AssistantContext): AssistantChatResponse {
  if (req.productId) {
    const detail = handleProductDetail(ctx, req.productId);
    if (detail) return detail;
  }

  const text = normalizeText(req.message);
  if (!text) {
    return respond(ctx, ctx.config.greeting[ctx.locale], [], { suggestions: suggestions(ctx) });
  }

  const faq = handleFaq(ctx, text);
  if (faq) return faq;

  if (matchesAny(text, ["עגלה", "cart", "سلة", "העגלה"])) {
    const cart = handleCart(ctx, req);
    if (cart) return cart;
  }

  if (matchesAny(text, ["תשלום", "checkout", "pay", "הזמנה", "دفع"])) {
    return respond(ctx, m(ctx).checkoutHint, [], { clientAction: { type: "checkout" } });
  }

  const maxPrice = parseMaxPrice(req.message);
  if (maxPrice !== null) {
    const items = byMaxPrice(ctx, maxPrice, 8);
    return respond(ctx, m(ctx).priceIntro(maxPrice), items);
  }

  if (matchesAny(text, ["פופולרי", "popular", "הכי", "best", "top"])) {
    return processQuickAction("popular", ctx, req);
  }

  if (matchesAny(text, ["מבצע", "offer", "promo", "deal"])) {
    return processQuickAction("offers", ctx, req);
  }

  const results = search(ctx, req.message, 8);
  if (results.length > 0) {
    return respond(ctx, m(ctx).searchIntro(req.message.trim()), results);
  }

  const categoryResults = searchByCategoryName(ctx, req.message, 8);
  if (categoryResults.length > 0) {
    return respond(ctx, m(ctx).searchIntro(req.message.trim()), categoryResults);
  }

  return respond(ctx, m(ctx).noResults, top(available(ctx), 4), { showContact: true });
}
