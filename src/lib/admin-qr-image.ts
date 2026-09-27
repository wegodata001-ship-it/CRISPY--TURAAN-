import QRCode from "qrcode";
import { ADMIN_QR_COLORS } from "@/lib/admin-qr-links";

/** High-contrast QR from the live URL. No stored image, no center logo (scan reliability). */
export async function createQrPngDataUrl(url: string, size: number): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: ADMIN_QR_COLORS,
  });
}
