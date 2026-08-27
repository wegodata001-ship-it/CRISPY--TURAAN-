/** PWA constants — installable app shell only; no business logic. */

export const PWA_APP_NAME = "MSHKAH";

export const PWA_SHORT_NAME = "MSHKAH";

export const PWA_DESCRIPTION =
  "MISHKAT CAFÉ — menu, orders, and pickup. Install for a full-screen tablet and phone experience.";

/** Customer menu home — same as storefront catalog */
export const PWA_START_URL = "/";

export const PWA_SCOPE = "/";

export const PWA_THEME_COLOR = "#F8F3ED";

export const PWA_BACKGROUND_COLOR = "#F8F3ED";

/** Bump when service worker caching strategy changes */
export const PWA_SW_VERSION = "mshkah-pwa-1";

export const PWA_ICONS = {
  icon192: "/icons/icon-192.png",
  icon512: "/icons/icon-512.png",
  maskable512: "/icons/icon-maskable-512.png",
  appleTouch: "/icons/apple-touch-icon.png",
} as const;
