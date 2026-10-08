import { PRODUCTION_CUSTOMER_URL, getCustomerUrl, isRetiredCustomerHost } from "@/lib/public-urls";

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

export function isPublicCustomerUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (isPrivateOrLocalHost(parsed.hostname)) return false;
    if (isRetiredCustomerHost(parsed.hostname)) return false;
    if (isVercelPreviewHost(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function readConfiguredSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  if (!raw) return "";
  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "";
  }
}

/** Canonical public storefront origin. Never localhost, LAN IP, or retired Vercel hosts. */
export function getPublicSiteUrl(): string {
  const configured = readConfiguredSiteUrl();
  if (configured && isPublicCustomerUrl(configured)) {
    return stripTrailingSlash(configured);
  }
  return getCustomerUrl();
}

/** Customer order page — the live catalog homepage. */
export function getPublicOrderUrl(): string {
  const site = getPublicSiteUrl();
  return site ? `${site}/` : "/";
}

/** Any candidate (including localhost) is replaced with the public order URL when invalid. */
export function resolveQrTargetUrl(candidate?: string | null): string {
  const fallback = getPublicOrderUrl();
  const raw = candidate?.trim();
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw);
    if (!isPublicCustomerUrl(parsed.href)) return fallback;
    if (parsed.pathname === "/" || parsed.pathname === "") {
      return `${stripTrailingSlash(`${parsed.protocol}//${parsed.host}`)}/`;
    }
    return parsed.href;
  } catch {
    return fallback;
  }
}
