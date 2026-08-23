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
import {
  buildAsciiTestPayload,
  buildCutterTestPayload,
} from "@/lib/printer/test-payloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestMode = "ascii" | "cutter";

export async function POST(request: NextRequest) {
  if (!isPrinterTestAllowed()) return printerTestBlockedResponse();

  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  let mode: TestMode = "ascii";
  try {
    const body = (await request.json().catch(() => null)) as { mode?: string } | null;
    if (body?.mode === "cutter") mode = "cutter";
  } catch {
    mode = "ascii";
  }

  const payload = mode === "cutter" ? buildCutterTestPayload() : buildAsciiTestPayload();

  try {
    const result = await sendRawToPrinter(payload);
    return Response.json({
      success: true,
      printer: { ip: result.host, port: result.port },
      mode,
      bytesSent: result.bytesSent,
      message: mode === "cutter" ? "Cutter test sent successfully" : "Test print sent successfully",
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
        mode,
      },
      { status: 503 }
    );
  }
}
