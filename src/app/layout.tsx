import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { FirebaseProvider } from "@/components/providers/firebase-provider";
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
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen pb-20 md:pb-0 flex flex-col has-[[data-admin]]:pb-0">
        <BrandSplash />
        <FirebaseProvider>
          <CartProvider>
            <main className="flex-1">{children}</main>
            <CartDrawer />
            <BottomNav />
          </CartProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
