import { resolveQrTargetUrl } from "@/lib/site-url";

export async function makeQrDataUrl(url?: string | null): Promise<string> {
  const target = resolveQrTargetUrl(url);
  try {
    new URL(target);
  } catch {
    return "";
  }
  const mod = await import("qrcode");
  const toDataURL = mod.default?.toDataURL ?? mod.toDataURL;
  return toDataURL(target, {
    margin: 1,
    width: 280,
    color: { dark: "#1A1410", light: "#FFFFFF" },
  });
}

export { resolveQrTargetUrl, getPublicOrderUrl, getPublicSiteUrl } from "@/lib/site-url";
