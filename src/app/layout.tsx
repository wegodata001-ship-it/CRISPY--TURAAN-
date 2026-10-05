import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getSurfaceMetadata } from "@/lib/domains/surface-metadata";
import {
  Inter,
  Playfair_Display,
  Atkinson_Hyperlegible,
  Heebo,
  Assistant,
  Cairo,
  Tajawal,
} from "next/font/google";
import { FirebaseProvider } from "@/components/providers/firebase-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AccessibilityProvider } from "@/components/providers/accessibility-provider";
import { AccessibilityCenter } from "@/components/accessibility/accessibility-center";
import { AssistantWidget } from "@/features/assistant/assistant-widget";
import { ClientSiteFooter } from "@/components/layout/client-site-footer";
import { LocaleHtmlScript } from "@/components/providers/locale-html-sync";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { CartProvider } from "@/features/cart/cart-context";
import { CartDrawer } from "@/features/cart/cart-drawer";
import { FloatingCartButton } from "@/features/cart/floating-cart-button";
import { MobileCartBar } from "@/features/cart/mobile-cart-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PwaManager } from "@/components/pwa/pwa-manager";
import { BrandSplash } from "@/components/brand/brand-splash";
import { HostSurfaceProvider } from "@/components/providers/host-surface-provider";
import { isMenuHost, isPortalHost } from "@/lib/domains/host-routing";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  weight: ["500", "600", "700"],
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  variable: "--font-tajawal",
  weight: ["400", "500"],
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-atkinson",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#D71920",
};

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host");
  return getSurfaceMetadata(host);
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const host = (await headers()).get("host");
  const surface = isPortalHost(host) ? "portal" : isMenuHost(host) ? "menu" : "public";

  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      data-surface={surface}
      className={`${inter.variable} ${playfair.variable} ${heebo.variable} ${assistant.variable} ${cairo.variable} ${tajawal.variable} ${atkinson.variable}`}
    >
      <head>
        <LocaleHtmlScript />
        <link rel="preload" as="image" href={BRAND.logo} type="image/png" />
      </head>
      <body className="flex min-h-dvh flex-col overflow-x-hidden bg-cream pb-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom,0px)+12px)] has-[[data-admin]]:pb-0 has-[[data-menu-display]]:pb-0 md:pb-0">
        <HostSurfaceProvider surface={surface}>
          <ThemeProvider>
            <AccessibilityProvider>
              <LocaleProvider>
                <BrandSplash />
                <FirebaseProvider>
                  <AuthProvider>
                    <CartProvider>
                      <main id="main-content" className="min-w-0 flex-1" tabIndex={-1}>
                        {children}
                      </main>
                      <ClientSiteFooter />
                      <FloatingCartButton />
                      <MobileCartBar />
                      <CartDrawer />
                      <BottomNav />
                      <PwaManager />
                      <AccessibilityCenter />
                      <AssistantWidget />
                    </CartProvider>
                  </AuthProvider>
                </FirebaseProvider>
              </LocaleProvider>
            </AccessibilityProvider>
          </ThemeProvider>
        </HostSurfaceProvider>
      </body>
    </html>
  );
}
