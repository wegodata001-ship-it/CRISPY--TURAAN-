import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/verify-admin";
import {
  isPrinterTestAllowed,
  printerTestBlockedResponse,
} from "@/lib/printer/config";
import {
  PrinterConnectionError,
  probePrinterConnection,
} from "@/lib/printer/tcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  if (!isPrinterTestAllowed()) return printerTestBlockedResponse();

  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const result = await probePrinterConnection();
    return Response.json({
      connected: true,
      ip: result.host,
      port: result.port,
      success: true,
      message: "TCP connection OK",
    });
  } catch (error) {
    const message =
      error instanceof PrinterConnectionError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not connect to printer";
    const code = error instanceof PrinterConnectionError ? error.code : undefined;
    return Response.json(
      {
        connected: false,
        success: false,
        message: "Could not connect to printer",
        error: message,
        code,
      },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
