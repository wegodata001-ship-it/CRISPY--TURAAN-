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
type CutVariant = "full" | "partial";

export async function POST(request: NextRequest) {
  if (!isPrinterTestAllowed()) return printerTestBlockedResponse();

  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  let mode: TestMode = "ascii";
  let cut: CutVariant = "full";
  try {
    const body = (await request.json().catch(() => null)) as {
      mode?: string;
      cut?: string;
    } | null;
    if (body?.mode === "cutter") mode = "cutter";
    // GS V 0 = full, GS V 1 = partial — one cut per request only
    if (body?.cut === "partial" || body?.cut === "1") cut = "partial";
  } catch {
    mode = "ascii";
  }

  const payload =
    mode === "cutter" ? buildCutterTestPayload(cut) : buildAsciiTestPayload();

  try {
    const result = await sendRawToPrinter(payload);
    return Response.json({
      success: true,
      printer: { ip: result.host, port: result.port },
      mode,
      cut: mode === "cutter" ? cut : undefined,
      cutCommand: mode === "cutter" ? (cut === "partial" ? "GS V 1" : "GS V 0") : undefined,
      bytesSent: result.bytesSent,
      message:
        mode === "cutter"
          ? `Cutter test sent (${cut === "partial" ? "GS V 1" : "GS V 0"}). Confirm paper cut on printer.`
          : "Test print sent successfully",
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
