import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { PWA_APP_NAME, PWA_ICONS } from "@/lib/pwa/config";
import { getMenuOrigin, getPortalOrigin, isMenuHost, isPortalHost } from "@/lib/domains/host-routing";

function metadataBaseUrl(host: string | null): URL {
  if (isPortalHost(host)) return new URL(getPortalOrigin());
  if (isMenuHost(host)) return new URL(getMenuOrigin());
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return new URL(site || "http://localhost:3000");
}

const sharedIcons: Metadata["icons"] = {
  icon: [
    { url: PWA_ICONS.icon192, sizes: "192x192", type: "image/png" },
    { url: PWA_ICONS.icon512, sizes: "512x512", type: "image/png" },
    { url: BRAND.logo, type: "image/png" },
  ],
  apple: [{ url: PWA_ICONS.appleTouch, sizes: "180x180", type: "image/png" }],
};

export function getSurfaceMetadata(host: string | null | undefined): Metadata {
  const metadataBase = metadataBaseUrl(host ?? null);

  if (isPortalHost(host)) {
    return {
      metadataBase,
      title: `${BRAND.publicName} | Portal`,
      description: "Admin portal",
      applicationName: "Portal",
      robots: { index: false, follow: false },
      icons: sharedIcons,
    };
  }

  if (isMenuHost(host)) {
    const title = `${BRAND.publicName} | תפריט`;
    const description = `${BRAND.publicName} — תפריט דיגיטלי`;
    return {
      metadataBase,
      title,
      description,
      applicationName: `${BRAND.publicName} Menu`,
      robots: { index: true, follow: true },
      icons: sharedIcons,
      openGraph: {
        title,
        description,
        images: [{ url: BRAND.logo, width: 1182, height: 1330, alt: BRAND.publicName }],
        type: "website",
      },
    };
  }

  return {
    metadataBase,
    title: BRAND.name,
    description: `${BRAND.taglineAlt} — ${BRAND.tagline}`,
    applicationName: PWA_APP_NAME,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: PWA_APP_NAME,
    },
    formatDetection: { telephone: false },
    icons: sharedIcons,
    openGraph: {
      title: BRAND.name,
      description: BRAND.taglineAlt,
      images: [{ url: BRAND.logo, width: 1182, height: 1330, alt: BRAND.name }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: BRAND.name,
      description: BRAND.taglineAlt,
      images: [BRAND.logo],
    },
  };
}
