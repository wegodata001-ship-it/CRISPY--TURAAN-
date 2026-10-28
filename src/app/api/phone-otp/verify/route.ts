import { NextRequest, NextResponse } from "next/server";
import { OTP_ERROR_TEXT, maskIsraeliPhone, type OtpErrorCode } from "@/lib/phone-otp/engine";
import { verifyPhoneOtp } from "@/lib/phone-otp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function localeOf(value: unknown): "ar" | "he" | "en" {
  return value === "he" || value === "en" ? value : "ar";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    challengeId?: string;
    code?: string;
    locale?: string;
  } | null;
  const locale = localeOf(body?.locale);
  const result = await verifyPhoneOtp({ challengeId: body?.challengeId || "", code: body?.code || "" });
  if (!result.ok) {
    const code = result.code as OtpErrorCode;
    return NextResponse.json(
      { ok: false, code, message: OTP_ERROR_TEXT[code][locale] },
      { status: code === "NOT_CONFIGURED" ? 503 : 400 }
    );
  }
  return NextResponse.json({
    ok: true,
    proofId: result.proofId,
    maskedPhone: maskIsraeliPhone(result.phoneLocal),
    expiresInSec: result.expiresInSec,
  });
}
