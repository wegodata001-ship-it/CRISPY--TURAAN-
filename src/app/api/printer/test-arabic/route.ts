import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/verify-admin";
import {
  isPrinterTestAllowed,
  printerTestBlockedResponse,
} from "@/lib/printer/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Arabic text-mode is deferred: needs code page + shaping/BiDi.
 * Prefer raster later. This endpoint only documents that — no print.
 */
export async function POST(request: NextRequest) {
  if (!isPrinterTestAllowed()) return printerTestBlockedResponse();

  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  return Response.json(
    {
      success: false,
      tested: false,
      message:
        "Arabic ESC/POS text mode is not enabled yet. After ASCII/Hebrew pass, we will add a raster (image) receipt path for proper RTL Arabic.",
      nextStep: "raster-escpos",
    },
    { status: 501 }
  );
}
