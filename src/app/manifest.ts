import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isPortalHost, isMenuHost } from "@/lib/domains/host-routing";
import {
  PWA_APP_NAME,
  PWA_BACKGROUND_COLOR,
  PWA_DESCRIPTION,
  PWA_ICONS,
  PWA_SCOPE,
  PWA_SHORT_NAME,
  PWA_START_URL,
  PWA_THEME_COLOR,
} from "@/lib/pwa/config";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = (await headers()).get("host");
  if (isPortalHost(host) || isMenuHost(host)) {
    return {
      name: isMenuHost(host) ? "Almostafa Chicken | תפריט" : "Portal",
      short_name: isMenuHost(host) ? "Menu" : "Portal",
      description: isMenuHost(host) ? "Almostafa Chicken digital menu" : "Admin portal",
      start_url: "/",
      scope: "/",
      display: "browser",
      icons: [],
      background_color: PWA_BACKGROUND_COLOR,
      theme_color: PWA_THEME_COLOR,
    };
  }

  return {
    name: PWA_APP_NAME,
    short_name: PWA_SHORT_NAME,
    description: PWA_DESCRIPTION,
    start_url: PWA_START_URL,
    scope: PWA_SCOPE,
    display: "standalone",
    orientation: "any",
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR,
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: PWA_ICONS.icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: PWA_ICONS.icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: PWA_ICONS.maskable512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
