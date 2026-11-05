/** Parse Hyp Pay URL-encoded response / redirect query strings. */

export function parseHypQueryString(raw: string): {
  params: Record<string, string>;
  order: string[];
} {
  const params: Record<string, string> = {};
  const order: string[] = [];
  const input = raw.startsWith("?") ? raw.slice(1) : raw.trim();
  if (!input) return { params, order };

  for (const part of input.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    const rawKey = eq === -1 ? part : part.slice(0, eq);
    const rawVal = eq === -1 ? "" : part.slice(eq + 1);
    let key = rawKey;
    let value = rawVal;
    try {
      key = decodeURIComponent(rawKey.replace(/\+/g, " "));
      value = decodeURIComponent(rawVal.replace(/\+/g, " "));
    } catch {
      // keep raw if malformed
    }
    if (!order.includes(key)) order.push(key);
    params[key] = value;
  }
  return { params, order };
}

export function buildQueryString(
  entries: Array<[string, string]>,
  encode = true
): string {
  return entries
    .map(([key, value]) => {
      if (!encode) return `${key}=${value}`;
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join("&");
}

/**
 * Rebuild the exact redirect query using Hyp's original key order.
 * Required for APISign What=VERIFY.
 */
export function rebuildOrderedQuery(
  params: Record<string, string>,
  order: string[]
): string {
  const entries: Array<[string, string]> = [];
  const seen = new Set<string>();
  for (const key of order) {
    if (!(key in params) || seen.has(key)) continue;
    seen.add(key);
    entries.push([key, params[key]]);
  }
  for (const key of Object.keys(params)) {
    if (seen.has(key)) continue;
    entries.push([key, params[key]]);
  }
  return buildQueryString(entries, true);
}

export function redactSecretsFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const secret of ["KEY", "PassP", "Passp", "passp"]) {
      if (parsed.searchParams.has(secret)) parsed.searchParams.set(secret, "REDACTED");
    }
    return parsed.toString();
  } catch {
    return url
      .replace(/([?&]KEY=)[^&]*/gi, "$1REDACTED")
      .replace(/([?&]PassP=)[^&]*/gi, "$1REDACTED");
  }
}
