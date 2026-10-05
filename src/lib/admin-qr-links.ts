import { getMenuUrl, getOrderUrl } from "@/lib/public-urls";

export type AdminQrLinkId = "menu" | "order";

export type AdminQrLink = {
  id: AdminQrLinkId;
  nameKey: string;
  url: string;
  filename: string;
};

/** Single source for Admin QR cards. Preview, copy, open, and download share `url`. */
export function getAdminQrLinks(): AdminQrLink[] {
  return [
    {
      id: "menu",
      nameKey: "admin.qr.menuName",
      url: getMenuUrl(),
      filename: "crispy-qr-menu.png",
    },
    {
      id: "order",
      nameKey: "admin.qr.orderName",
      url: getOrderUrl(),
      filename: "crispy-qr-order.png",
    },
  ];
}

export const ADMIN_QR_PREVIEW_PX = 360;
export const ADMIN_QR_DOWNLOAD_PX = 2048;
export const ADMIN_QR_COLORS = { dark: "#1A1410", light: "#FFFFFF" } as const;
