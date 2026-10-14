/**
 * CRISPY kitchen menu. Stable Firestore ids. Prices are ILS.
 * Products outside this list are never deleted by the seed.
 */

export const FAMILY_COLESLAW_CONTENTS =
  "رز + شيبس + سلطة كولسلو + 3 قطع خبز + مشروب كبير";
export const FAMILY_SALAD_CONTENTS =
  "رز + شيبس + سلطة + 3 قطع خبز + مشروب كبير";
export const SANDWICH_DESCRIPTION =
  "اختيار المكونات: حمص، مايونيز، حريف، خس، بندورة، خيار مكبوس، ملفوف أبيض، سلطة عربية، بصل. الجبنة بزيادة 5₪.";
export const KIDS_DESCRIPTION = "مشروب + شيبس. اختيار المشروب مشمول في السعر.";

export type CrispyMenuCategory = {
  id: string;
  nameAr: string;
  icon: string;
  sortOrder: number;
};

export type CrispyMenuProduct = {
  id: string;
  categoryId: string;
  nameAr: string;
  descriptionAr: string;
  price: number;
  sortOrder: number;
  active: boolean;
  needsReview: boolean;
  businessType: "food" | "beverage";
  modifierGroupIds: string[];
};

export type CrispyModifierGroup = {
  id: string;
  nameAr: string;
  selectionType: "single" | "multiple";
  requirement: "optional";
  minSelections: number;
  maxSelections: number;
  displayType: "chips";
  sortOrder: number;
};

export type CrispyModifierOption = {
  id: string;
  groupId: string;
  nameAr: string;
  priceDelta: number;
  sortOrder: number;
};

export const SANDWICH_GROUP = "sandwich-ingredients";
export const DRINK_LARGE_GROUP = "included-drink-large";
export const DRINK_SMALL_GROUP = "included-drink-small";
export const EXTRA_GROUP = "extra-items";

const extras = [EXTRA_GROUP];
const sandwichGroups = [SANDWICH_GROUP, EXTRA_GROUP];
const kidsGroups = [DRINK_SMALL_GROUP, EXTRA_GROUP];
const familyGroups = [DRINK_LARGE_GROUP, EXTRA_GROUP];

export const crispyMenuCategories: CrispyMenuCategory[] = [
  { id: "crispy-personal", nameAr: "وجبات شخصية", icon: "drumstick", sortOrder: 1 },
  { id: "crispy-family", nameAr: "وجبات عائلية", icon: "utensils", sortOrder: 2 },
  { id: "crispy-kids", nameAr: "وجبات الأطفال", icon: "hamburger", sortOrder: 3 },
  { id: "crispy-sandwiches", nameAr: "الساندويتشات", icon: "sandwich", sortOrder: 4 },
  { id: "crispy-occasions", nameAr: "وجبات المناسبات وأعياد الميلاد", icon: "cake", sortOrder: 5 },
  { id: "crispy-specials", nameAr: "وجبات مميزة", icon: "utensils", sortOrder: 6 },
  { id: "crispy-salads", nameAr: "السلطات", icon: "salad", sortOrder: 7 },
  { id: "crispy-extras", nameAr: "الإضافات", icon: "fries", sortOrder: 8 },
  { id: "crispy-drinks", nameAr: "المشروبات", icon: "cup-soda", sortOrder: 9 },
];

function food(
  id: string,
  categoryId: string,
  nameAr: string,
  price: number,
  sortOrder: number,
  descriptionAr = "",
  modifierGroupIds: string[] = [],
  flags: { active?: boolean; needsReview?: boolean } = {}
): CrispyMenuProduct {
  return {
    id,
    categoryId,
    nameAr,
    descriptionAr,
    price,
    sortOrder,
    active: flags.active !== false,
    needsReview: flags.needsReview === true,
    businessType: "food",
    modifierGroupIds,
  };
}

function drink(
  id: string,
  nameAr: string,
  price: number,
  sortOrder: number
): CrispyMenuProduct {
  return {
    ...food(id, "crispy-drinks", nameAr, price, sortOrder),
    businessType: "beverage",
  };
}

export const crispyMenuProducts: CrispyMenuProduct[] = [
  food("crispy-personal-crispy-3", "crispy-personal", "3 قطع كريسبي مع شيبس وسلطة كولسلو", 45, 1, "شيبس وسلطة كولسلو", extras),
  food("crispy-personal-crispy-5", "crispy-personal", "5 قطع كريسبي وشيبس وخبزة وسلطة كولسلو", 55, 2, "شيبس وخبزة وسلطة كولسلو", extras),
  food("crispy-personal-crispy-8", "crispy-personal", "8 قطع كريسبي + شيبس وخبزة وسلطة كولسلو", 70, 3, "شيبس وخبزة وسلطة كولسلو", extras),
  food("crispy-personal-thigh-3", "crispy-personal", "3 قطع فخاد مع شيبس وسلطة كولسلو", 45, 4, "شيبس وسلطة كولسلو", extras),
  food("crispy-personal-thigh-5", "crispy-personal", "5 قطع فخاد مع شيبس وخبزة وسلطة كولسلو", 65, 5, "شيبس وخبزة وسلطة كولسلو", extras),
  food("crispy-personal-mix-3-3", "crispy-personal", "3+3 ميكس مع شيبس وخبزة وسلطة كولسلو", 65, 6, "شيبس وخبزة وسلطة كولسلو", extras),
  food("crispy-personal-wings-8", "crispy-personal", "8 قطع اجنحة مع شيبس وخبزة وسلطة كولسلو", 48, 7, "شيبس وخبزة وسلطة كولسلو", extras),
  food("crispy-personal-rice-thigh-2", "crispy-personal", "رز مع قطعتين فخاد", 45, 8, "رز مع قطعتين فخاد", extras),
  food("crispy-personal-rice-crispy-3", "crispy-personal", "وجبة رز مع 3 قطع كريسبي", 45, 9, "رز مع 3 قطع كريسبي", extras),
  food("crispy-personal-rice-chicken", "crispy-personal", "وجبة رز مع تشيكن", 40, 10, "رز مع تشيكن", extras),
  food("crispy-personal-mix-fries", "crispy-personal", "ميكس شيبس (كريسبي وشيبس)", 45, 11, "كريسبي وشيبس", extras),
  food("crispy-personal-mix-rice", "crispy-personal", "ميكس رز (رز وكريسبي)", 45, 12, "رز وكريسبي", extras),
  food("crispy-personal-schnitzel", "crispy-personal", "وجبة شنيتسل مع رز وشيبس", 53, 13, "رز وشيبس", extras),
  food("crispy-personal-haziya", "crispy-personal", "وجبة حزيه مع شيبس", 40, 14, "شيبس", extras),

  food("crispy-family-crispy-12", "crispy-family", "12 قطعة كريسبي", 150, 1, FAMILY_COLESLAW_CONTENTS, familyGroups),
  food("crispy-family-crispy-17", "crispy-family", "17 قطعة كريسبي", 185, 2, FAMILY_COLESLAW_CONTENTS, familyGroups, { needsReview: true }),
  food("crispy-family-crispy-17-review", "crispy-family", "17 قطعة كريسبي", 235, 3, FAMILY_COLESLAW_CONTENTS, familyGroups, { active: false, needsReview: true }),
  food("crispy-family-thigh-8", "crispy-family", "8 قطع فخاد", 142, 4, FAMILY_SALAD_CONTENTS, familyGroups),
  food("crispy-family-thigh-10", "crispy-family", "10 قطع فخاد", 166, 5, FAMILY_SALAD_CONTENTS, familyGroups),
  food("crispy-family-thigh-12", "crispy-family", "12 قطع فخاد", 180, 6, FAMILY_SALAD_CONTENTS, familyGroups),
  food("crispy-family-mix-5-5", "crispy-family", "ميكس 5 + 5", 135, 7, FAMILY_SALAD_CONTENTS, familyGroups),
  food("crispy-family-mix-7-7", "crispy-family", "ميكس 7 + 7", 190, 8, FAMILY_SALAD_CONTENTS, familyGroups),
  food("crispy-family-mix-10-10", "crispy-family", "ميكس 10 + 10", 245, 9, FAMILY_SALAD_CONTENTS, familyGroups),
  food("crispy-family-wings-12", "crispy-family", "12 قطعة أجنحة", 100, 10, FAMILY_SALAD_CONTENTS, familyGroups),
  food("crispy-family-wings-20", "crispy-family", "20 قطعة أجنحة", 185, 11, FAMILY_SALAD_CONTENTS, familyGroups),

  food("crispy-kids-crispy", "crispy-kids", "كريسبي + مشروب + شيبس", 35, 1, KIDS_DESCRIPTION, kidsGroups),
  food("crispy-kids-crispy-burger", "crispy-kids", "همبرجر كريسبي + مشروب + شيبس", 35, 2, KIDS_DESCRIPTION, kidsGroups),
  food("crispy-kids-schnitzel-burger", "crispy-kids", "همبرجر شنيتسل + مشروب + شيبس", 35, 3, KIDS_DESCRIPTION, kidsGroups),
  food("crispy-kids-crispy-wrap", "crispy-kids", "لفة كريسبي + مشروب + شيبس", 35, 4, KIDS_DESCRIPTION, kidsGroups),
  food("crispy-kids-schnitzel-wrap", "crispy-kids", "لفة شنيتسل + مشروب + شيبس", 35, 5, KIDS_DESCRIPTION, kidsGroups),

  food("crispy-sandwich-crispy-burger", "crispy-sandwiches", "كرسبي برغر + شيبس", 40, 1, SANDWICH_DESCRIPTION, sandwichGroups),
  food("crispy-sandwich-schnitzel-burger", "crispy-sandwiches", "شنيتسل برغر + شيبس", 40, 2, SANDWICH_DESCRIPTION, sandwichGroups),
  food("crispy-sandwich-crispy-tortilla", "crispy-sandwiches", "تورتيا كرسبي + شيبس", 35, 3, SANDWICH_DESCRIPTION, sandwichGroups),
  food("crispy-sandwich-schnitzel-tortilla", "crispy-sandwiches", "تورتيا شنيتسل + شيبس", 35, 4, SANDWICH_DESCRIPTION, sandwichGroups),
  food("crispy-sandwich-haziya-tortilla", "crispy-sandwiches", "تورتيا حزيه + شيبس", 35, 5, SANDWICH_DESCRIPTION, sandwichGroups),
  food("crispy-sandwich-schnitzel-baguette", "crispy-sandwiches", "باجيت شنيتسل + شيبس", 40, 6, SANDWICH_DESCRIPTION, sandwichGroups),
  food("crispy-sandwich-crispy-baguette", "crispy-sandwiches", "باجيت كرسبي + شيبس", 40, 7, SANDWICH_DESCRIPTION, sandwichGroups),
  food("crispy-sandwich-haziya-baguette", "crispy-sandwiches", "باجيت حزيه + شيبس", 40, 8, SANDWICH_DESCRIPTION, sandwichGroups),
  food("crispy-sandwich-crispy-pita", "crispy-sandwiches", "جبيتا كرسبي + شيبس", 40, 9, SANDWICH_DESCRIPTION, sandwichGroups),
  food("crispy-sandwich-schnitzel-pita", "crispy-sandwiches", "جبيتا شنيتسل + شيبس", 40, 10, SANDWICH_DESCRIPTION, sandwichGroups),
  food("crispy-sandwich-haziya-pita", "crispy-sandwiches", "جبيتا حزيه + شيبس", 40, 11, SANDWICH_DESCRIPTION, sandwichGroups),

  food("crispy-occasion-crispy-30", "crispy-occasions", "30 قطعة كرسبي", 270, 1, "", extras),
  food("crispy-occasion-crispy-40", "crispy-occasions", "40 قطعة كرسبي", 360, 2, "", extras),
  food("crispy-occasion-crispy-50", "crispy-occasions", "50 قطعة كرسبي", 450, 3, "", extras),
  food("crispy-occasion-thigh-16", "crispy-occasions", "16 قطعة فخاذ", 190, 4, "", extras),
  food("crispy-occasion-thigh-20", "crispy-occasions", "20 قطعة فخاذ", 240, 5, "", extras),
  food("crispy-occasion-thigh-24", "crispy-occasions", "24 قطعة فخاذ", 290, 6, "", extras),

  food(
    "crispy-special-330",
    "crispy-specials",
    "وجبة مميزة",
    330,
    1,
    "12 قطعة كريسبي + 8 قطع فخاذ + 8 أجنحة + 3 شيبس + 3 رز + 3 سلطة كولسلو + 1 سلطة فريش + 5 خبز + 2 مشروب كبير",
    familyGroups
  ),
  food(
    "crispy-special-590",
    "crispy-specials",
    "وجبة مميزة",
    590,
    2,
    "24 قطعة كرسبي + 16 قطعة فخاذ + 16 جناح + 5 شيبس + 5 رز + 5 سلطة كولسلو + 2 سلطة فريش + 3 مشروب كبير",
    familyGroups
  ),

  food("crispy-salad-coleslaw-large", "crispy-salads", "كولسلو كبير", 15, 1),
  food("crispy-salad-coleslaw-small", "crispy-salads", "كولسلو صغير", 6, 2),
  food("crispy-salad-fattoush-large", "crispy-salads", "فتوش كبير", 40, 3),
  food("crispy-salad-fattoush-small", "crispy-salads", "فتوش صغير", 30, 4),
  food("crispy-salad-tabbouleh-large", "crispy-salads", "تبولة كبير", 40, 5),
  food("crispy-salad-tabbouleh-small", "crispy-salads", "تبولة صغير", 30, 6),
  food("crispy-salad-crispy", "crispy-salads", "سلطة كريسبي", 40, 7),
  food("crispy-salad-haziya", "crispy-salads", "سلطة حزيه", 40, 8),

  food("crispy-extra-fries-large", "crispy-extras", "شيبس كبير", 20, 1),
  food("crispy-extra-fries-small", "crispy-extras", "شيبس صغير", 10, 2),
  food("crispy-extra-onion-large", "crispy-extras", "حلقات بصل كبير", 24, 3),
  food("crispy-extra-onion-small", "crispy-extras", "حلقات بصل صغير", 13, 4),
  food("crispy-extra-mozzarella", "crispy-extras", "أصابع موتزريلا", 25, 5),
  food("crispy-extra-potato-large", "crispy-extras", "بوتيتو كبير", 24, 6),
  food("crispy-extra-potato-small", "crispy-extras", "بوتيتو صغير", 13, 7),
  food("crispy-extra-potato-balls-large", "crispy-extras", "كرات البطاطا كبير", 24, 8),
  food("crispy-extra-potato-balls-small", "crispy-extras", "كرات البطاطا صغير", 13, 9),
  food("crispy-extra-fried-mix", "crispy-extras", "ميكس مقليات", 30, 10),
  food("crispy-extra-rice-large", "crispy-extras", "رز كبير", 17, 11),
  food("crispy-extra-rice-small", "crispy-extras", "رز صغير", 10, 12),
  food("crispy-extra-rice-sauce", "crispy-extras", "صوص الرز", 5, 13),
  food("crispy-extra-bread", "crispy-extras", "خبزة", 3, 14),
  food("crispy-extra-crispy-piece", "crispy-extras", "قطعة كريسبي", 8, 15),
  food("crispy-extra-thigh-piece", "crispy-extras", "قطعة فخاذ", 12, 16),
  food("crispy-extra-wing-piece", "crispy-extras", "قطعة جناح", 4, 17),

  drink("crispy-drink-large-cola", "كولا كبير", 15, 1),
  drink("crispy-drink-large-cola-zero", "كولا زيرو كبير", 15, 2),
  drink("crispy-drink-large-fanta", "فانتا كبير", 15, 3),
  drink("crispy-drink-large-sprite", "سبرايت كبير", 15, 4),
  drink("crispy-drink-large-water", "مي كبير", 10, 5),
  drink("crispy-drink-large-grape", "عنب كبير", 15, 6),
  drink("crispy-drink-large-berry-banana", "توت بنانا كبير", 15, 7),
  drink("crispy-drink-large-orange", "برتقال كبير", 15, 8),
  drink("crispy-drink-large-eshkaliot", "اشكليوت كبير", 15, 9),
  drink("crispy-drink-small-cola", "كولا صغير", 8, 10),
  drink("crispy-drink-small-cola-zero", "كولا زيرو صغير", 8, 11),
  drink("crispy-drink-small-fanta", "فانتا صغير", 8, 12),
  drink("crispy-drink-small-sprite", "سبرايت صغير", 8, 13),
  drink("crispy-drink-small-water", "مي صغير", 8, 14),
  drink("crispy-drink-small-grape", "عنب صغير", 8, 15),
  drink("crispy-drink-small-berry-banana", "توت بنانا صغير", 8, 16),
  drink("crispy-drink-small-orange", "برتقال صغير", 8, 17),
  drink("crispy-drink-small-eshkaliot", "اشكليوت صغير", 8, 18),
  drink("crispy-drink-small-soda", "صودا", 8, 19),
  drink("crispy-drink-small-xl", "اكس ال", 7, 20),
  drink("crispy-drink-small-xl-fig", "اكس ال تين", 7, 21),
  drink("crispy-drink-small-blue", "بلو", 7, 22),
  drink("crispy-drink-small-blue-day", "بلو داي", 7, 23),
];

const sandwichOptions: Array<[string, string, number]> = [
  ["hummus", "حمص", 0],
  ["mayo", "مايونيز", 0],
  ["spicy", "حريف", 0],
  ["lettuce", "خس", 0],
  ["tomato", "بندورة", 0],
  ["pickle", "خيار مكبوس", 0],
  ["cabbage", "ملفوف أبيض", 0],
  ["arabic-salad", "سلطة عربية", 0],
  ["onion", "بصل", 0],
  ["cheese", "جبنة", 5],
];

function drinkOptions(size: "large" | "small"): CrispyModifierOption[] {
  const names: Array<[string, string]> = [
    ["cola", "كولا"],
    ["cola-zero", "كولا زيرو"],
    ["fanta", "فانتا"],
    ["sprite", "سبرايت"],
    ["water", "مي"],
    ["grape", "عنب"],
    ["berry-banana", "توت بنانا"],
    ["orange", "برتقال"],
    ["eshkaliot", "اشكليوت"],
  ];
  if (size === "small") {
    names.push(
      ["soda", "صودا"],
      ["xl", "اكس ال"],
      ["xl-fig", "اكس ال تين"],
      ["blue", "بلو"],
      ["blue-day", "بلو داي"]
    );
  }
  const groupId = size === "large" ? DRINK_LARGE_GROUP : DRINK_SMALL_GROUP;
  const label = size === "large" ? "كبير" : "صغير";
  return names.map(([key, name], index) => ({
    id: `opt-drink-${size}-${key}`,
    groupId,
    nameAr: size === "small" && ["soda", "xl", "xl-fig", "blue", "blue-day"].includes(key) ? name : `${name} ${label}`,
    priceDelta: 0,
    sortOrder: index + 1,
  }));
}

const extraProducts = crispyMenuProducts.filter((product) => product.categoryId === "crispy-extras");

export const crispyModifierGroups: CrispyModifierGroup[] = [
  {
    id: SANDWICH_GROUP,
    nameAr: "مكونات الساندويتش",
    selectionType: "multiple",
    requirement: "optional",
    minSelections: 0,
    maxSelections: sandwichOptions.length,
    displayType: "chips",
    sortOrder: 1,
  },
  {
    id: DRINK_LARGE_GROUP,
    nameAr: "المشروب المشمول — كبير",
    selectionType: "single",
    requirement: "optional",
    minSelections: 0,
    maxSelections: 1,
    displayType: "chips",
    sortOrder: 2,
  },
  {
    id: DRINK_SMALL_GROUP,
    nameAr: "المشروب المشمول — صغير",
    selectionType: "single",
    requirement: "optional",
    minSelections: 0,
    maxSelections: 1,
    displayType: "chips",
    sortOrder: 3,
  },
  {
    id: EXTRA_GROUP,
    nameAr: "إضافات",
    selectionType: "multiple",
    requirement: "optional",
    minSelections: 0,
    maxSelections: extraProducts.length,
    displayType: "chips",
    sortOrder: 4,
  },
];

export const crispyModifierOptions: CrispyModifierOption[] = [
  ...sandwichOptions.map(([key, nameAr, priceDelta], index) => ({
    id: `opt-sandwich-${key}`,
    groupId: SANDWICH_GROUP,
    nameAr,
    priceDelta,
    sortOrder: index + 1,
  })),
  ...drinkOptions("large"),
  ...drinkOptions("small"),
  ...extraProducts.map((product, index) => ({
    id: `opt-${product.id}`,
    groupId: EXTRA_GROUP,
    nameAr: product.nameAr,
    priceDelta: product.price,
    sortOrder: index + 1,
  })),
];

export const crispyProductModifierLinks = crispyMenuProducts.flatMap((product) =>
  product.modifierGroupIds.map((groupId, index) => ({
    id: `${product.id}__${groupId}`,
    productId: product.id,
    groupId,
    sortOrder: index + 1,
  }))
);

export const CRISPY_MENU_STATS = {
  categories: crispyMenuCategories.length,
  products: crispyMenuProducts.length,
  modifierGroups: crispyModifierGroups.length,
  modifierOptions: crispyModifierOptions.length,
  productLinks: crispyProductModifierLinks.length,
  needsReview: crispyMenuProducts.filter((product) => product.needsReview).length,
  hidden: crispyMenuProducts.filter((product) => !product.active).length,
};
