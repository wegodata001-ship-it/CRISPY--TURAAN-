/**
 * Single source for customer-facing and admin production URLs.
 * QR / copy / open / download must all read from here.
 * Never emit localhost in production.
 */

export const PRODUCTION_ADMIN_URL = "https://portal.crispy-turaan.vercel.app";
export const PRODUCTION_MENU_URL = "https://crispy-turaan.vercel.app/menu-display";
export const PRODUCTION_ORDER_URL = "https://crispy-turaan.vercel.app";

function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

function isLocalHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.endsWith(".localhost")
  );
}

export function normalizePublicUrl(raw: string, fallback: string): string {
  const value = raw.trim();
  if (!value) return fallback.replace(/\/+$/, "");
  try {
    const parsed = new URL(value.includes("://") ? value : `https://${value}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fallback.replace(/\/+$/, "");
    }
    if (isLocalHostname(parsed.hostname)) {
      return fallback.replace(/\/+$/, "");
    }
    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${path}`;
  } catch {
    return fallback.replace(/\/+$/, "");
  }
}

function readConfiguredUrl(names: string[], fallback: string): string {
  for (const name of names) {
    const raw = process.env[name]?.trim();
    if (!raw) continue;
    const normalized = normalizePublicUrl(raw, "");
    if (normalized) return normalized;
  }
  return fallback.replace(/\/+$/, "");
}

function developmentFallback(productionUrl: string, localUrl: string): string {
  if (isProductionRuntime()) return productionUrl;
  return localUrl;
}

/** Admin portal — never localhost on a production build. */
export function getAdminUrl(): string {
  return readConfiguredUrl(
    ["NEXT_PUBLIC_ADMIN_URL", "NEXT_PUBLIC_PORTAL_URL"],
    isProductionRuntime()
      ? PRODUCTION_ADMIN_URL
      : developmentFallback(PRODUCTION_ADMIN_URL, "http://localhost:3000")
  );
}

/** Digital menu (view-only). Used by القائمة الرقمية QR. */
export function getMenuUrl(): string {
  return readConfiguredUrl(
    ["NEXT_PUBLIC_MENU_URL", "NEXT_PUBLIC_QR_LINK_1"],
    PRODUCTION_MENU_URL
  );
}

/** Customer ordering homepage. Used by طلب أونلاين QR and "back to store". */
export function getOrderUrl(): string {
  return readConfiguredUrl(
    ["NEXT_PUBLIC_ORDER_URL", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_QR_LINK_2"],
    PRODUCTION_ORDER_URL
  );
}

export function getAdminOrigin(): string {
  try {
    return new URL(getAdminUrl()).origin;
  } catch {
    return PRODUCTION_ADMIN_URL;
  }
}

export function getMenuOrigin(): string {
  try {
    return new URL(getMenuUrl()).origin;
  } catch {
    return new URL(PRODUCTION_MENU_URL).origin;
  }
}

export function getOrderOrigin(): string {
  try {
    return new URL(getOrderUrl()).origin;
  } catch {
    return PRODUCTION_ORDER_URL;
  }
}

export function adminAbsoluteUrl(path = ""): string {
  const normalized = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${getAdminOrigin()}${normalized}`;
}
