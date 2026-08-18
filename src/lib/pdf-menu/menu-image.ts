const LOGGED_FAILURES = new Set<string>();

export type MenuImageCheck = {
  ok: boolean;
  reason?: string;
};

export function sanitizeMenuImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const src = value.trim();
  if (!src || src === "undefined" || src === "null") return null;
  if (src.startsWith("blob:")) return null;
  if (src.startsWith("data:image/")) return src;
  if (src.startsWith("//")) return null;
  if (src.startsWith("/")) return src;
  try {
    const parsed = new URL(src);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return src;
  } catch {
    return null;
  }
}

export function isRemoteHttpUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export function isFirebaseStorageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "firebasestorage.googleapis.com" || host.endsWith(".firebasestorage.app");
  } catch {
    return url.includes("firebasestorage.googleapis.com") || url.includes("firebasestorage.app");
  }
}

export function isDoubleEncodedStoragePath(url: string): boolean {
  return /%25[0-9A-Fa-f]{2}/.test(url);
}

export function menuImageProxyUrl(url: string): string {
  return `/api/media/proxy?url=${encodeURIComponent(url)}`;
}

export function resolveMenuImageSrc(
  src: unknown,
  mode: "preview" | "pdf" | "thumb" | "export" = "preview"
): string | null {
  const url = sanitizeMenuImageUrl(src);
  if (!url) return null;
  if ((mode === "export" || mode === "pdf") && isRemoteHttpUrl(url)) {
    return menuImageProxyUrl(url);
  }
  return url;
}

const failedUrls = new Set<string>();
const listeners = new Set<() => void>();
let healthVersion = 0;

function emitHealth(): void {
  healthVersion += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeMenuImageHealth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMenuImageHealthVersion(): string {
  return String(healthVersion);
}

export function hasMenuImageFailed(url: string): boolean {
  return failedUrls.has(url);
}

export function markMenuImageFailed(
  url: string,
  meta?: { productId?: string; productName?: string; reason?: string }
): void {
  if (!url || failedUrls.has(url)) return;
  failedUrls.add(url);
  if (process.env.NODE_ENV !== "production" && !LOGGED_FAILURES.has(url)) {
    LOGGED_FAILURES.add(url);
    console.info("[PDF_IMAGE_FAILED]", {
      productId: meta?.productId ?? "",
      productName: meta?.productName ?? "",
      url,
      reason: meta?.reason ?? "load-error",
    });
  }
  emitHealth();
}

export async function checkImageUrl(url: string, timeoutMs = 4000): Promise<MenuImageCheck> {
  const sanitized = sanitizeMenuImageUrl(url);
  if (!sanitized) return { ok: false, reason: "invalid" };
  if (sanitized.startsWith("data:image/")) return { ok: true };
  if (sanitized.startsWith("/")) return { ok: true, reason: "local" };

  try {
    const response = await fetch(sanitized, {
      method: "GET",
      mode: "cors",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      return {
        ok: false,
        reason: response.status === 404 ? "not-found" : `http-${response.status}`,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "timeout-or-network" };
  }
}

function loadHtmlImage(src: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve(true);
      return;
    }
    const img = new Image();
    const timer = window.setTimeout(() => resolve(false), timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img.naturalWidth > 0);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
    img.src = src;
  });
}

export async function preloadMenuImages(
  urls: string[],
  timeoutMs = 4000
): Promise<{ loaded: string[]; failed: string[] }> {
  const unique = [...new Set(urls.map(sanitizeMenuImageUrl).filter((url): url is string => Boolean(url)))];
  const loaded: string[] = [];
  const failed: string[] = [];

  await Promise.all(
    unique.map(async (url) => {
      const ok = await loadHtmlImage(url, timeoutMs);
      if (ok) loaded.push(url);
      else {
        failed.push(url);
        markMenuImageFailed(url, { reason: "load-error" });
      }
    })
  );

  return { loaded, failed };
}

export async function preloadExportImages(originals: string[], timeoutMs = 4000): Promise<string[]> {
  const unique = [...new Set(originals.map(sanitizeMenuImageUrl).filter((url): url is string => Boolean(url)))];
  const failed: string[] = [];

  await Promise.all(
    unique.map(async (original) => {
      const display = resolveMenuImageSrc(original, "export");
      if (!display) {
        failed.push(original);
        markMenuImageFailed(original, { reason: "invalid" });
        return;
      }
      const ok = await loadHtmlImage(display, timeoutMs);
      if (!ok) {
        failed.push(original);
        markMenuImageFailed(original, { reason: "load-error" });
      }
    })
  );

  return failed;
}

export function collectPageImageUrls(
  page: {
    customSettings?: { backgroundImageUrl?: string };
    categories: { category: { image?: string }; products: { image?: string }[] }[];
  },
  template?: { coverSettings?: { logoUrl?: string; backgroundUrl?: string; qrUrl?: string } } | null
): string[] {
  const urls: string[] = [];
  if (template?.coverSettings?.logoUrl) urls.push(template.coverSettings.logoUrl);
  if (template?.coverSettings?.backgroundUrl) urls.push(template.coverSettings.backgroundUrl);
  if (template?.coverSettings?.qrUrl) urls.push(template.coverSettings.qrUrl);
  if (page.customSettings?.backgroundImageUrl) urls.push(page.customSettings.backgroundImageUrl);
  for (const cat of page.categories) {
    if (cat.category.image) urls.push(cat.category.image);
    for (const product of cat.products) {
      if (product.image) urls.push(product.image);
    }
  }
  return [...new Set(urls.map(sanitizeMenuImageUrl).filter((url): url is string => Boolean(url)))];
}
