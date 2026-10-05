import type { Metadata } from "next";
import { MenuDisplayView } from "@/features/menu-display/menu-display-view";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND.publicName} | תפריט`,
  description: `${BRAND.publicName} — תפריט דיגיטלי`,
};

export default function MenuDisplayPage() {
  return <MenuDisplayView />;
}
