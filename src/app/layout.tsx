import type { Metadata } from "next";
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
import { BrandSplash } from "@/components/brand/brand-splash";
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: BRAND.name,
  description: `${BRAND.taglineAlt} — ${BRAND.tagline}`,
  icons: {
    icon: BRAND.logo,
    apple: BRAND.logo,
  },
  openGraph: {
    title: BRAND.name,
    description: BRAND.taglineAlt,
    images: [{ url: BRAND.logo, width: 1059, height: 931, alt: BRAND.name }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.name,
    description: BRAND.taglineAlt,
    images: [BRAND.logo],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} ${heebo.variable} ${assistant.variable} ${cairo.variable} ${tajawal.variable} ${atkinson.variable}`}
    >
      <head>
        <LocaleHtmlScript />
      </head>
      <body className="min-h-screen overflow-x-hidden bg-cream pb-24 md:pb-0 flex flex-col has-[[data-admin]]:pb-0">
        <BrandSplash />
        <ThemeProvider>
          <AccessibilityProvider>
            <LocaleProvider>
              <FirebaseProvider>
                <AuthProvider>
                  <CartProvider>
                    <main id="main-content" className="flex-1" tabIndex={-1}>
                      {children}
                    </main>
                    <FloatingCartButton />
                    <MobileCartBar />
                    <CartDrawer />
                    <BottomNav />
                    <ClientSiteFooter />
                    <AccessibilityCenter />
                    <AssistantWidget />
                  </CartProvider>
                </AuthProvider>
              </FirebaseProvider>
            </LocaleProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
