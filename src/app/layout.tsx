import type { Metadata } from "next";
import { Inter, Playfair_Display, Atkinson_Hyperlegible } from "next/font/google";
import { FirebaseProvider } from "@/components/providers/firebase-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AccessibilityProvider } from "@/components/providers/accessibility-provider";
import { AccessibilityCenter } from "@/components/accessibility/accessibility-center";
import { AiAssistantWidget } from "@/features/ai-assistant/ai-assistant-widget";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { CartProvider } from "@/features/cart/cart-context";
import { CartDrawer } from "@/features/cart/cart-drawer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { BrandSplash } from "@/components/brand/brand-splash";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
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
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: BRAND.name,
    description: BRAND.taglineAlt,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: BRAND.name }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.name,
    description: BRAND.taglineAlt,
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${atkinson.variable}`}>
      <body className="min-h-screen pb-20 md:pb-0 flex flex-col has-[[data-admin]]:pb-0">
        <BrandSplash />
        <ThemeProvider>
          <AccessibilityProvider>
            <FirebaseProvider>
              <LocaleProvider>
                <AuthProvider>
                  <CartProvider>
                    <main id="main-content" className="flex-1" tabIndex={-1}>
                      {children}
                    </main>
                    <CartDrawer />
                    <BottomNav />
                    <AccessibilityCenter />
                    <AiAssistantWidget />
                  </CartProvider>
                </AuthProvider>
              </LocaleProvider>
            </FirebaseProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
