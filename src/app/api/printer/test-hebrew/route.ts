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
import { buildHebrewTestPayload } from "@/lib/printer/test-payloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Separate Hebrew test (CP862). Only use after ASCII test passes.
 * Does not touch orders / auto-print.
 */
export async function POST(request: NextRequest) {
  if (!isPrinterTestAllowed()) return printerTestBlockedResponse();

  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const payload = buildHebrewTestPayload();
    const result = await sendRawToPrinter(payload);
    return Response.json({
      success: true,
      printer: { ip: result.host, port: result.port },
      encoding: "cp862",
      bytesSent: result.bytesSent,
      message:
        "Hebrew test sent (CP862). Verify glyphs on paper — firmware code-page index may need PRINTER_HEBREW_CODEPAGE_INDEX.",
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
