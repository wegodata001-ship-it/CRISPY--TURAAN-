import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/verify-admin";
import {
  getArabicEncoding,
  isPrinterTestAllowed,
  printerTestBlockedResponse,
} from "@/lib/printer/config";
import {
  PrinterConnectionError,
  sendRawToPrinter,
} from "@/lib/printer/tcp";
import { buildArabicTextTestPayload } from "@/lib/printer/test-payloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Experimental Arabic ESC/POS text mode (code page).
 * If letters are disconnected / wrong on paper, use POST /api/printer/test-arabic-raster.
 * Does not touch orders / auto-print.
 */
export async function POST(request: NextRequest) {
  if (!isPrinterTestAllowed()) return printerTestBlockedResponse();

  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const payload = buildArabicTextTestPayload();
    const result = await sendRawToPrinter(payload);
    return Response.json({
      success: true,
      printer: { ip: result.host, port: result.port },
      encoding: getArabicEncoding(),
      bytesSent: result.bytesSent,
      message:
        "Arabic text-mode test sent. Confirm connected RTL glyphs on paper. If disconnected/wrong → use test-arabic-raster.",
      fallback: "/api/printer/test-arabic-raster",
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
        message: "Could not connect to printer",
        error: message,
      },
      { status: 503 }
    );
  }
}
