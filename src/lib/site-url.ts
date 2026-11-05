import {
  PRODUCTION_CUSTOMER_URL,
  STAGING_LOCAL_URL,
  assertPublicUrlSafeForMode,
  getCustomerUrl,
  isAllowedStagingLocalUrl,
  isCrispyStagingLocalMode,
  isLiveCustomerProductionHost,
  isRetiredCustomerHost,
} from "@/lib/public-urls";

export const PRODUCTION_SITE_URL = PRODUCTION_CUSTOMER_URL;

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") {
    return true;
  }
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (host.endsWith(".local")) return true;
  return false;
}

function isVercelPreviewHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host.endsWith(".vercel.app") && host.includes("-git-");
}

/**
 * Whether a URL is acceptable as a public customer-facing link.
 * Staging local mode accepts only http://localhost:3000 and rejects live customer hosts.
 */
export function isPublicCustomerUrl(value: string, env: NodeJS.ProcessEnv = process.env): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

    if (isCrispyStagingLocalMode(env)) {
      if (isLiveCustomerProductionHost(parsed.hostname)) return false;
      return isAllowedStagingLocalUrl(parsed);
    }

    if (isPrivateOrLocalHost(parsed.hostname)) return false;
    if (isRetiredCustomerHost(parsed.hostname)) return false;
    if (isVercelPreviewHost(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function readConfiguredSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  if (!raw) return "";
  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "";
  }
}

/** Canonical public storefront origin. */
export function getPublicSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (isCrispyStagingLocalMode(env)) {
    const configured = readConfiguredSiteUrl(env);
    if (configured && isPublicCustomerUrl(configured, env)) {
      return assertPublicUrlSafeForMode(stripTrailingSlash(configured), env);
    }
    return assertPublicUrlSafeForMode(getCustomerUrl(env), env);
  }

  const configured = readConfiguredSiteUrl(env);
  if (configured && isPublicCustomerUrl(configured, env)) {
    return stripTrailingSlash(configured);
  }
  return getCustomerUrl(env);
}

/** Customer order page — the live catalog homepage. */
export function getPublicOrderUrl(env: NodeJS.ProcessEnv = process.env): string {
  const site = getPublicSiteUrl(env);
  return site ? `${site}/` : "/";
}

/**
 * Resolve a QR target. Invalid candidates fall back to the public order URL.
 * Staging local mode never falls back to the live customer domain.
 */
export function resolveQrTargetUrl(
  candidate?: string | null,
  env: NodeJS.ProcessEnv = process.env
): string {
  const fallback = getPublicOrderUrl(env);
  if (isCrispyStagingLocalMode(env)) {
    assertPublicUrlSafeForMode(stripTrailingSlash(fallback.replace(/\/$/, "") || STAGING_LOCAL_URL), env);
  }

  const raw = candidate?.trim();
  if (!raw) return fallback;

  try {
    const parsed = new URL(raw);
    if (!isPublicCustomerUrl(parsed.href, env)) {
      if (isCrispyStagingLocalMode(env) && isLiveCustomerProductionHost(parsed.hostname)) {
        // Explicit rejection of live customer QR targets in staging.
        return fallback;
      }
      return fallback;
    }
    if (parsed.pathname === "/" || parsed.pathname === "") {
      return `${stripTrailingSlash(`${parsed.protocol}//${parsed.host}`)}/`;
    }
    return parsed.href;
  } catch {
    return fallback;
  }
}
