import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/verify-admin";
import {
  isPrinterTestAllowed,
  printerTestBlockedResponse,
} from "@/lib/printer/config";
import {
  PrinterConnectionError,
  sendRawToPrinter,
} from "@/lib/printer/tcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Arabic receipt via 576px ESC/POS raster (proper shaping + RTL via canvas).
 * Isolated test — not wired to orders.
 * Canvas is loaded lazily so Vercel production build does not bundle .node binaries.
 */
export async function POST(request: NextRequest) {
  if (!isPrinterTestAllowed()) return printerTestBlockedResponse();

  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const { buildArabicRasterTestPayload } = await import(
      "@/lib/printer/arabic-raster"
    );
    const payload = await buildArabicRasterTestPayload();
    const result = await sendRawToPrinter(payload);
    return Response.json({
      success: true,
      printer: { ip: result.host, port: result.port },
      mode: "raster",
      widthPx: 576,
      bytesSent: result.bytesSent,
      message:
        "Arabic raster test sent (576px). Confirm connected Arabic + RTL on paper.",
    });
  } catch (error) {
    const message =
      error instanceof PrinterConnectionError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not connect to printer";
    return Response.json(
      {
        success: false,
        message: "Could not send Arabic raster test",
        error: message,
      },
      { status: 503 }
    );
  }
}
