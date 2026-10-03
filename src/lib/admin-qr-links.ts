import { getMenuOrigin, getPublicStoreOrigin } from "@/lib/domains/host-routing";

export type AdminQrLinkId = "menu" | "order";

export type AdminQrLink = {
  id: AdminQrLinkId;
  nameKey: string;
  url: string;
  filename: string;
};

function normalizePublicUrl(raw: string, fallback: string): string {
  const value = raw.trim();
  if (!value) return fallback.replace(/\/+$/, "");
  try {
    const parsed = new URL(value.includes("://") ? value : `https://${value}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fallback.replace(/\/+$/, "");
    }
    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${path}`;
  } catch {
    return fallback.replace(/\/+$/, "");
  }
}

function readQrLink(envName: string, fallback: string): string {
  return normalizePublicUrl(process.env[envName] ?? "", fallback);
}

/** Single source for Admin QR cards. Override with NEXT_PUBLIC_QR_LINK_1 / _2. */
export function getAdminQrLinks(): AdminQrLink[] {
  return [
    {
      id: "menu",
      nameKey: "admin.qr.menuName",
      url: readQrLink("NEXT_PUBLIC_QR_LINK_1", getMenuOrigin()),
      filename: "crispy-qr-menu.png",
    },
    {
      id: "order",
      nameKey: "admin.qr.orderName",
      url: readQrLink("NEXT_PUBLIC_QR_LINK_2", getPublicStoreOrigin()),
      filename: "crispy-qr-order.png",
    },
  ];
}

export const ADMIN_QR_PREVIEW_PX = 360;
export const ADMIN_QR_DOWNLOAD_PX = 2048;
export const ADMIN_QR_COLORS = { dark: "#1A1410", light: "#FFFFFF" } as const;
