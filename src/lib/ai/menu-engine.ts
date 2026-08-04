import type { Locale } from "@/lib/i18n/types";
import { fuzzyScore, matchesAny, normalizeText } from "@/lib/ai/fuzzy";
import type {
  AiChatRequest,
  AiChatResponse,
  AiMenuContext,
  AiMenuProduct,
} from "@/lib/ai/types";

const MESSAGES: Record<
  Locale,
  {
    noResults: string;
    popularIntro: string;
    offersIntro: string;
    veganIntro: string;
    noVegan: string;
    hungryIntro: string;
    categoryIntro: (name: string) => string;
    searchIntro: (query: string) => string;
    cartEmpty: string;
    cartSummary: (count: number, total: number) => string;
    addedToCart: (name: string) => string;
    removedFromCart: (name: string) => string;
    checkoutHint: string;
    crossSell: (name: string) => string;
    hours: (h: string) => string;
    address: (a: string) => string;
    phone: (p: string) => string;
    parking: string;
    wifi: string;
    delivery: string;
    pickup: string;
  }
> = {
  he: {
    noResults: "לא מצאתי בדיוק מה שחיפשת. הנה כמה אפשרויות — או שאפשר לדבר עם נציג:",
    popularIntro: "הנה המוצרים הכי פופולריים שלנו:",
    offersIntro: "הנה המבצעים וההמלצות שלנו:",
    veganIntro: "מצאתי מוצרים שעשויים להתאים (טבעוני/צמחוני):",
    noVegan: "לא מצאתי מוצרים מסומנים כטבעוניים. אפשר לשאול את הצוות שלנו לפרטים.",
    hungryIntro: "בואו נבנה לכם ארוחה — הנה מה שאני ממליץ:",
    categoryIntro: (name) => `הנה מה שיש לנו ב${name}:`,
    searchIntro: (query) => `מצאתי עבור "${query}":`,
    cartEmpty: "העגלה שלכם ריקה כרגע. רוצים שאמליץ על משהו?",
    cartSummary: (count, total) => `בעגלה ${count} פריטים — סה"כ ₪${total.toFixed(0)}`,
    addedToCart: (name) => `הוספתי את ${name} לעגלה!`,
    removedFromCart: (name) => `הסרתי את ${name} מהעגלה.`,
    checkoutHint: "מעולה! לחצו על 'לתשלום' כדי להשלים את ההזמנה.",
    crossSell: (name) => `אולי גם תרצו ${name}?`,
    hours: (h) => `שעות הפעילות: ${h}`,
    address: (a) => (a ? `הכתובת: ${a}` : "פרטי כתובת יימסרו בקופה."),
    phone: (p) => (p ? `טלפון: ${p}` : "מספר טלפון לא הוגדר — פנו לצוות בקפה."),
    parking: "יש חניה בסמוך למקום.",
    wifi: "WiFi חינם זמין — שאלו את הצוות לפרטי התחברות.",
    delivery: "משלוחים זמינים — ניתן לבחור 'משלוח' בעת התשלום.",
    pickup: "איסוף עצמי זמין — בחרו 'איסוף' בעת התשלום.",
  },
  ar: {
    noResults: "لم أجد بالضبط ما تبحث عنه. إليك بعض الخيارات — أو يمكنك التحدث مع ممثل:",
    popularIntro: "إليك منتجاتنا الأكثر شعبية:",
    offersIntro: "إليك عروضنا وتوصياتنا:",
    veganIntro: "وجدت منتجات قد تناسب (نباتي):",
    noVegan: "لم أجد منتجات نباتية محددة. اسأل فريقنا للتفاصيل.",
    hungryIntro: "دعنا نبني لك وجبة — إليك توصياتي:",
    categoryIntro: (name) => `إليك ما لدينا في ${name}:`,
    searchIntro: (query) => `وجدت لـ "${query}":`,
    cartEmpty: "سلتك فارغة حالياً. هل تريد توصية؟",
    cartSummary: (count, total) => `${count} عناصر في السلة — الإجمالي ₪${total.toFixed(0)}`,
    addedToCart: (name) => `أضفت ${name} إلى السلة!`,
    removedFromCart: (name) => `أزلت ${name} من السلة.`,
    checkoutHint: "رائع! اضغط على 'الدفع' لإتمام الطلب.",
    crossSell: (name) => `ربما تريد أيضاً ${name}؟`,
    hours: (h) => `ساعات العمل: ${h}`,
    address: (a) => (a ? `العنوان: ${a}` : "تفاصيل العنوان عند الكاشير."),
    phone: (p) => (p ? `الهاتف: ${p}` : "لم يتم تحديد رقم — اسأل فريقنا."),
    parking: "موقف سيارات متاح بالقرب.",
    wifi: "WiFi مجاني — اسأل فريقنا لتفاصيل الاتصال.",
    delivery: "التوصيل متاح — اختر 'توصيل' عند الدفع.",
    pickup: "الاستلام الذاتي متاح — اختر 'استلام' عند الدفع.",
  },
  en: {
    noResults: "I couldn't find exactly what you're looking for. Here are some options — or speak with our team:",
    popularIntro: "Here are our most popular items:",
    offersIntro: "Here are our offers and recommendations:",
    veganIntro: "I found items that may suit you (vegan/plant-based):",
    noVegan: "No specifically vegan items found. Ask our team for details.",
    hungryIntro: "Let's build you a meal — here's what I recommend:",
    categoryIntro: (name) => `Here's what we have in ${name}:`,
    searchIntro: (query) => `Found for "${query}":`,
    cartEmpty: "Your cart is empty. Want a recommendation?",
    cartSummary: (count, total) => `${count} items in cart — total ₪${total.toFixed(0)}`,
    addedToCart: (name) => `Added ${name} to your cart!`,
    removedFromCart: (name) => `Removed ${name} from your cart.`,
    checkoutHint: "Great! Tap checkout to complete your order.",
    crossSell: (name) => `You might also like ${name}?`,
    hours: (h) => `Opening hours: ${h}`,
    address: (a) => (a ? `Address: ${a}` : "Address details at the counter."),
    phone: (p) => (p ? `Phone: ${p}` : "No phone configured — ask our team."),
    parking: "Parking available nearby.",
    wifi: "Free WiFi — ask our team for connection details.",
    delivery: "Delivery available — choose 'Delivery' at checkout.",
    pickup: "Pickup available — choose 'Pickup' at checkout.",
  },
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "hot-drinks": ["קפה", "coffee", "espresso", "אספרסו", "הפוך", "latte", "americano", "cappuccino", "قهوة", "شاي", "tea", "תה"],
  desserts: ["קינוח", "dessert", "cake", "עוגה", "טירמיסו", "tiramisu", "מוס", "حلو", "حلويات", "sweet"],
  "ice-drinks": ["קר", "cold", "iced", "אייס", "milkshake", "שייק", "shake", "بارد", "مثلج"],
  breakfast: ["בוקר", "breakfast", "ארוחת בוקר", "فطور", "shakshuka"],
  sandwiches: ["כריך", "sandwich", "croissant", "קרואסון", "ساندويتش"],
  "mains-pasta": ["פסטה", "pasta", "מנה", "main", "معكرونة"],
  bakery: ["מאפה", "בורקס", "bakery", "boreka"],
  salads: ["סלט", "salad", "سلطة"],
  "soft-drinks": ["קולה", "cola", "soda", "מוגז", "غازية"],
  "fresh-juices": ["מיץ", "juice", "לימונדה", "lemonade", "عصير"],
  shakes: ["שייק", "shake", "شيك"],
  "ice-cream-yogurt": ["גלידה", "ice cream", "יוגורט", "yogurt"],
};

const VEGAN_KEYWORDS = ["טבעוני", "vegan", "نباتي", "צמחוני", "vegetarian", "plant"];

function msg(ctx: AiMenuContext) {
  return MESSAGES[ctx.locale];
}

function availableProducts(ctx: AiMenuContext): AiMenuProduct[] {
  return ctx.products.filter((p) => p.available);
}

function topProducts(products: AiMenuProduct[], limit = 6): AiMenuProduct[] {
  return [...products]
    .sort((a, b) => Number(b.isPopular) - Number(a.isPopular) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function searchProducts(ctx: AiMenuContext, query: string, limit = 6): AiMenuProduct[] {
  return availableProducts(ctx)
    .map((p) => ({ p, score: fuzzyScore(query, `${p.name} ${p.description} ${p.categoryId}`) }))
    .filter(({ score }) => score >= 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p);
}

function productsByCategory(ctx: AiMenuContext, categoryId: string, limit = 6): AiMenuProduct[] {
  return topProducts(
    availableProducts(ctx).filter((p) => p.categoryId === categoryId),
    limit
  );
}

function detectCategoryId(text: string): string | null {
  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (matchesAny(text, keywords)) return catId;
  }
  return null;
}

function crossSellProducts(ctx: AiMenuContext, categoryId: string): AiMenuProduct[] {
  const rule = ctx.config.crossSellRules.find((r) => r.triggerCategoryId === categoryId);
  if (!rule) return [];
  const ids = new Set(rule.suggestCategoryIds);
  return topProducts(
    availableProducts(ctx).filter((p) => ids.has(p.categoryId)),
    3
  );
}

function buildSuggestions(ctx: AiMenuContext): string[] {
  return ctx.config.suggestedQuestions.map((q) => q[ctx.locale]).slice(0, 4);
}

function respond(
  ctx: AiMenuContext,
  message: string,
  products: AiMenuProduct[] = [],
  extra: Partial<AiChatResponse> = {}
): AiChatResponse {
  return {
    message,
    products,
    suggestions: extra.suggestions ?? buildSuggestions(ctx),
    showHandoff: extra.showHandoff ?? false,
    clientAction: extra.clientAction,
  };
}

function handleFaq(ctx: AiMenuContext, text: string): AiChatResponse | null {
  const m = msg(ctx);
  if (matchesAny(text, ["שעות", "hours", "פתוח", "open", "ساعات"])) return respond(ctx, m.hours(ctx.settings.hours));
  if (matchesAny(text, ["כתובת", "address", "איפה", "where", "عنوان"])) return respond(ctx, m.address(ctx.settings.address));
  if (matchesAny(text, ["טלפון", "phone", "התקשר", "call", "هاتف"])) return respond(ctx, m.phone(ctx.settings.phone));
  if (matchesAny(text, ["חניה", "parking", "موقف"])) return respond(ctx, m.parking);
  if (matchesAny(text, ["wifi", "wi-fi", "ווייפי", "אינטרנט"])) return respond(ctx, m.wifi);
  if (matchesAny(text, ["משלוח", "delivery", "توصيل"])) return respond(ctx, m.delivery);
  if (matchesAny(text, ["איסוף", "pickup", "استلام"])) return respond(ctx, m.pickup);
  for (const item of ctx.config.faq) {
    if (matchesAny(text, item.keywords)) return respond(ctx, item.answer[ctx.locale]);
  }
  return null;
}

function handleCartCommands(ctx: AiMenuContext, text: string, req: AiChatRequest): AiChatResponse | null {
  const m = msg(ctx);
  if (matchesAny(text, ["עגלה", "cart", "הזמנה שלי", "سلة", "my order"])) {
    const ids = req.cartProductIds ?? [];
    if (ids.length === 0) return respond(ctx, m.cartEmpty, [], { clientAction: { type: "show_cart" } });
    const cartProducts = availableProducts(ctx).filter((p) => ids.includes(p.id));
    const total = cartProducts.reduce((s, p) => s + p.price, 0);
    return respond(ctx, m.cartSummary(ids.length, total), cartProducts, {
      clientAction: { type: "show_cart" },
      suggestions: [ctx.locale === "he" ? "לתשלום" : ctx.locale === "ar" ? "الدفع" : "Checkout"],
    });
  }
  if (matchesAny(text, ["תשלום", "checkout", "לשלם", "pay", "دفع"])) {
    return respond(ctx, m.checkoutHint, [], { clientAction: { type: "checkout" } });
  }
  if (matchesAny(text, ["הסר", "remove", "delete", "أزل"])) {
    const found = searchProducts(ctx, text, 1)[0];
    if (found) {
      return respond(ctx, m.removedFromCart(found.name), [], {
        clientAction: { type: "remove_from_cart", productId: found.id },
      });
    }
  }
  if (matchesAny(text, ["הוסף", "add", "שים", "أضف"])) {
    const found = searchProducts(ctx, text, 1)[0];
    if (found) {
      const cross = crossSellProducts(ctx, found.categoryId);
      const crossMsg = cross.length > 0 ? ` ${m.crossSell(cross.map((p) => p.name).join(", "))}` : "";
      return respond(ctx, m.addedToCart(found.name) + crossMsg, cross.length ? cross : [found], {
        clientAction: { type: "add_to_cart", productId: found.id },
      });
    }
  }
  return null;
}

export function processAiMessage(req: AiChatRequest, ctx: AiMenuContext): AiChatResponse {
  const text = normalizeText(req.message);
  if (!text) {
    return respond(ctx, ctx.config.welcomeMessage[ctx.locale], [], { suggestions: buildSuggestions(ctx) });
  }

  const faq = handleFaq(ctx, text);
  if (faq) return faq;

  const cart = handleCartCommands(ctx, text, req);
  if (cart) return cart;

  if (matchesAny(text, ["פופולרי", "popular", "best", "top", "הכי", "bestseller", "شعب"])) {
    const popular = topProducts(availableProducts(ctx).filter((p) => p.isPopular), 6);
    return respond(ctx, msg(ctx).popularIntro, popular.length ? popular : topProducts(availableProducts(ctx), 6));
  }

  if (matchesAny(text, ["מבצע", "offer", "deal", "promo", "عرض"])) {
    const featured = ctx.config.featuredProductIds.length
      ? availableProducts(ctx).filter((p) => ctx.config.featuredProductIds.includes(p.id))
      : topProducts(availableProducts(ctx).filter((p) => p.isPopular || p.isNew), 6);
    const intro =
      ctx.banners.length > 0
        ? `${msg(ctx).offersIntro}\n${ctx.banners.map((b) => `• ${b.title}`).join("\n")}`
        : msg(ctx).offersIntro;
    return respond(ctx, intro, featured);
  }

  if (matchesAny(text, VEGAN_KEYWORDS)) {
    const vegan = availableProducts(ctx).filter((p) =>
      matchesAny(`${p.name} ${p.description}`, VEGAN_KEYWORDS)
    );
    if (vegan.length === 0) {
      return respond(ctx, msg(ctx).noVegan, topProducts(availableProducts(ctx), 4), { showHandoff: true });
    }
    return respond(ctx, msg(ctx).veganIntro, topProducts(vegan, 6));
  }

  if (matchesAny(text, ["רעב", "hungry", "starving", "جائع"])) {
    const meal = [
      ...productsByCategory(ctx, "breakfast", 2),
      ...productsByCategory(ctx, "sandwiches", 2),
      ...productsByCategory(ctx, "hot-drinks", 1),
      ...productsByCategory(ctx, "desserts", 1),
    ];
    const unique = [...new Map(meal.map((p) => [p.id, p])).values()].slice(0, 6);
    return respond(ctx, msg(ctx).hungryIntro, unique);
  }

  const categoryId = detectCategoryId(text);
  if (categoryId) {
    const cat = ctx.categories.find((c) => c.id === categoryId);
    const products = productsByCategory(ctx, categoryId, 6);
    const cross = crossSellProducts(ctx, categoryId);
    const all = [...products, ...cross.filter((p) => !products.find((x) => x.id === p.id))].slice(0, 6);
    return respond(ctx, msg(ctx).categoryIntro(cat?.name ?? categoryId), all);
  }

  const searchResults = searchProducts(ctx, req.message, 6);
  if (searchResults.length > 0) {
    const cross = crossSellProducts(ctx, searchResults[0]!.categoryId);
    const all = [...searchResults, ...cross.filter((p) => !searchResults.find((x) => x.id === p.id))].slice(0, 6);
    return respond(ctx, msg(ctx).searchIntro(req.message.trim()), all);
  }

  if (req.lastAddedCategoryId) {
    const cross = crossSellProducts(ctx, req.lastAddedCategoryId);
    if (cross.length) return respond(ctx, msg(ctx).crossSell(cross.map((p) => p.name).join(", ")), cross);
  }

  return respond(ctx, msg(ctx).noResults, topProducts(availableProducts(ctx), 4), {
    showHandoff: ctx.config.humanHandoffEnabled,
  });
}

export function processQuickAction(
  actionId: string,
  ctx: AiMenuContext,
  req: Pick<AiChatRequest, "cartProductIds">
): AiChatResponse {
  const action = ctx.config.quickActions.find((a) => a.id === actionId);
  if (!action) return processAiMessage({ message: "", locale: ctx.locale, ...req }, ctx);

  switch (action.action) {
    case "popular":
      return processAiMessage({ message: "popular", locale: ctx.locale, ...req }, ctx);
    case "offers":
      return processAiMessage({ message: "offers", locale: ctx.locale, ...req }, ctx);
    case "cart":
      return processAiMessage({ message: "cart", locale: ctx.locale, ...req }, ctx);
    case "category":
      if (action.categoryId) {
        const cat = ctx.categories.find((c) => c.id === action.categoryId);
        const products = productsByCategory(ctx, action.categoryId, 6);
        return respond(ctx, msg(ctx).categoryIntro(cat?.name ?? action.categoryId), products);
      }
      break;
  }
  return processAiMessage({ message: action.label[ctx.locale], locale: ctx.locale, ...req }, ctx);
}
