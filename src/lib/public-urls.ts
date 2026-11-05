/**
 * Single source for customer-facing and admin public URLs.
 * QR / copy / open / download must all read from here.
 *
 * Production: never emit localhost or retired Vercel customer hosts.
 * Staging local (`NEXT_PUBLIC_CRISPY_STAGING_MODE=true`): only http://localhost:3000,
 * never fall back to the live customer domain.
 */

export const PRODUCTION_ADMIN_URL = "https://portal.crispy-turaan.vercel.app";
export const PRODUCTION_MENU_URL = "https://menu.almostafachicken.com";
export const PRODUCTION_CUSTOMER_URL = "https://almostafachicken.com";
export const PRODUCTION_ORDER_URL = PRODUCTION_CUSTOMER_URL;

/** Only allowed public origin while staging-local mode is on. */
export const STAGING_LOCAL_URL = "http://localhost:3000";

export class StagingPublicUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StagingPublicUrlError";
  }
}

function isVercelProduction(env: NodeJS.ProcessEnv): boolean {
  return (env.VERCEL_ENV || "").trim() === "production";
}

/**
 * Explicit local staging isolation. Ignored on Vercel Production so a stray
 * env flag can never rewrite live customer URLs.
 */
export function isCrispyStagingLocalMode(env: NodeJS.ProcessEnv = process.env): boolean {
  if (isVercelProduction(env)) return false;
  return (env.NEXT_PUBLIC_CRISPY_STAGING_MODE || "").trim().toLowerCase() === "true";
}

function isProductionRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
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

/** Old public Vercel host — never show this to customers. Admin portal is allowed in production. */
export function isRetiredCustomerHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return host === "crispy-turaan.vercel.app" || host === "www.crispy-turaan.vercel.app";
}

/** Live customer / portal hosts that staging must never emit. */
export function isLiveCustomerProductionHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "almostafachicken.com" || host.endsWith(".almostafachicken.com")) return true;
  if (host === "portal.crispy-turaan.vercel.app") return true;
  return isRetiredCustomerHost(host);
}

/** Staging allows exactly http://localhost:3000 (no other local hosts/ports). */
export function isAllowedStagingLocalUrl(value: string | URL): boolean {
  try {
    const parsed = value instanceof URL ? value : new URL(value.includes("://") ? value : `http://${value}`);
    if (parsed.protocol !== "http:") return false;
    if (parsed.hostname.toLowerCase() !== "localhost") return false;
    return parsed.port === "3000";
  } catch {
    return false;
  }
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function formatNormalizedUrl(parsed: URL): string {
  const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
  return `${parsed.protocol}//${parsed.host}${path}`;
}

function stagingSafeFallback(fallback: string): string {
  const trimmed = fallback.trim();
  if (!trimmed) return STAGING_LOCAL_URL;
  if (isAllowedStagingLocalUrl(trimmed)) return stripTrailingSlash(trimmed);
  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (isLiveCustomerProductionHost(parsed.hostname) || isRetiredCustomerHost(parsed.hostname)) {
      return STAGING_LOCAL_URL;
    }
    if (isLocalHostname(parsed.hostname) && !isAllowedStagingLocalUrl(parsed)) {
      return STAGING_LOCAL_URL;
    }
  } catch {
    return STAGING_LOCAL_URL;
  }
  // Unknown non-local fallback — still refuse to risk production; stay local.
  return STAGING_LOCAL_URL;
}

/**
 * Normalize a configured public URL.
 * - Production: reject localhost / retired hosts → use fallback (may be production).
 * - Staging: allow only http://localhost:3000; never return a live customer domain.
 */
export function normalizePublicUrl(
  raw: string,
  fallback: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const staging = isCrispyStagingLocalMode(env);
  const safeFallback = staging ? stagingSafeFallback(fallback) : stripTrailingSlash(fallback);
  const value = raw.trim();
  if (!value) return safeFallback;

  try {
    const parsed = new URL(value.includes("://") ? value : `https://${value}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return safeFallback;
    }

    if (staging) {
      if (isAllowedStagingLocalUrl(parsed)) return formatNormalizedUrl(parsed);
      // Reject live customer domains and any other host — never fall through to production.
      return safeFallback;
    }

    if (isLocalHostname(parsed.hostname) || isRetiredCustomerHost(parsed.hostname)) {
      return safeFallback;
    }

    return formatNormalizedUrl(parsed);
  } catch {
    return safeFallback;
  }
}

function readConfiguredUrl(
  names: string[],
  fallback: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const staging = isCrispyStagingLocalMode(env);
  for (const name of names) {
    const raw = env[name]?.trim();
    if (!raw) continue;
    const normalized = normalizePublicUrl(raw, "", env);
    if (!normalized) continue;
    if (staging && isLiveCustomerProductionHost(new URL(normalized).hostname)) {
      continue;
    }
    if (staging && !isAllowedStagingLocalUrl(normalized)) {
      continue;
    }
    return normalized;
  }
  if (staging) return stagingSafeFallback(fallback);
  return stripTrailingSlash(fallback);
}

function developmentFallback(productionUrl: string, localUrl: string, env: NodeJS.ProcessEnv): string {
  if (isProductionRuntime(env)) return productionUrl;
  return localUrl;
}

/** Admin portal — never localhost on a production build. */
export function getAdminUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (isCrispyStagingLocalMode(env)) {
    return readConfiguredUrl(
      ["NEXT_PUBLIC_ADMIN_URL", "NEXT_PUBLIC_PORTAL_URL"],
      STAGING_LOCAL_URL,
      env
    );
  }
  return readConfiguredUrl(
    ["NEXT_PUBLIC_ADMIN_URL", "NEXT_PUBLIC_PORTAL_URL"],
    isProductionRuntime(env)
      ? PRODUCTION_ADMIN_URL
      : developmentFallback(PRODUCTION_ADMIN_URL, STAGING_LOCAL_URL, env),
    env
  );
}

/** Digital menu (view-only). Used by القائمة الرقمية QR. */
export function getMenuUrl(env: NodeJS.ProcessEnv = process.env): string {
  return readConfiguredUrl(
    ["NEXT_PUBLIC_MENU_URL", "NEXT_PUBLIC_QR_LINK_1"],
    isCrispyStagingLocalMode(env) ? STAGING_LOCAL_URL : PRODUCTION_MENU_URL,
    env
  );
}

/** Customer website / online ordering. Used by طلب أونلاين QR and "back to store". */
export function getCustomerUrl(env: NodeJS.ProcessEnv = process.env): string {
  return readConfiguredUrl(
    [
      "NEXT_PUBLIC_CUSTOMER_URL",
      "NEXT_PUBLIC_ORDER_URL",
      "NEXT_PUBLIC_SITE_URL",
      "NEXT_PUBLIC_QR_LINK_2",
    ],
    isCrispyStagingLocalMode(env) ? STAGING_LOCAL_URL : PRODUCTION_CUSTOMER_URL,
    env
  );
}

/** @deprecated Use getCustomerUrl — kept so existing imports keep working. */
export function getOrderUrl(env: NodeJS.ProcessEnv = process.env): string {
  return getCustomerUrl(env);
}

export function getAdminOrigin(env: NodeJS.ProcessEnv = process.env): string {
  try {
    return new URL(getAdminUrl(env)).origin;
  } catch {
    if (isCrispyStagingLocalMode(env)) {
      throw new StagingPublicUrlError("Admin URL is not configured for staging local mode");
    }
    return PRODUCTION_ADMIN_URL;
  }
}

export function getMenuOrigin(env: NodeJS.ProcessEnv = process.env): string {
  try {
    return new URL(getMenuUrl(env)).origin;
  } catch {
    if (isCrispyStagingLocalMode(env)) {
      throw new StagingPublicUrlError("Menu URL is not configured for staging local mode");
    }
    return PRODUCTION_MENU_URL;
  }
}

export function getOrderOrigin(env: NodeJS.ProcessEnv = process.env): string {
  try {
    return new URL(getCustomerUrl(env)).origin;
  } catch {
    if (isCrispyStagingLocalMode(env)) {
      throw new StagingPublicUrlError("Customer URL is not configured for staging local mode");
    }
    return PRODUCTION_CUSTOMER_URL;
  }
}

export function adminAbsoluteUrl(path = "", env: NodeJS.ProcessEnv = process.env): string {
  const normalized = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${getAdminOrigin(env)}${normalized}`;
}

/** Assert a resolved URL is safe for the current mode (staging never points at live customer). */
export function assertPublicUrlSafeForMode(url: string, env: NodeJS.ProcessEnv = process.env): string {
  const trimmed = url.trim();
  if (!trimmed) {
    if (isCrispyStagingLocalMode(env)) {
      throw new StagingPublicUrlError("Public URL is empty in staging local mode");
    }
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (isCrispyStagingLocalMode(env)) {
      if (!isAllowedStagingLocalUrl(parsed)) {
        throw new StagingPublicUrlError(
          `Staging local mode rejected non-local public URL host: ${parsed.hostname}`
        );
      }
    }
  } catch (error) {
    if (error instanceof StagingPublicUrlError) throw error;
    if (isCrispyStagingLocalMode(env)) {
      throw new StagingPublicUrlError("Public URL is invalid in staging local mode");
    }
  }
  return trimmed;
}
