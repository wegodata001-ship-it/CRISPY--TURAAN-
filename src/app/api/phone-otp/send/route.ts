import { NextRequest, NextResponse } from "next/server";
import { OTP_ERROR_TEXT, maskIsraeliPhone, type OtpErrorCode } from "@/lib/phone-otp/engine";
import { sendPhoneOtp } from "@/lib/phone-otp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function localeOf(value: unknown): "ar" | "he" | "en" {
  return value === "he" || value === "en" ? value : "ar";
}

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { phone?: string; locale?: string } | null;
  const locale = localeOf(body?.locale);
  const result = await sendPhoneOtp({ phone: body?.phone || "", ip: clientIp(request) });
  if (!result.ok) {
    const code = result.code as OtpErrorCode;
    const status =
      code === "NOT_CONFIGURED" || code === "SEND_FAILED" || code === "DELIVERY_FAILED"
        ? 503
        : code === "INVALID_PHONE"
          ? 400
          : 429;
    return NextResponse.json(
      { ok: false, code, message: OTP_ERROR_TEXT[code][locale], retryAfterSec: "retryAfterSec" in result ? result.retryAfterSec : undefined },
      { status }
    );
  }
  return NextResponse.json({
    ok: true,
    challengeId: result.challengeId,
    maskedPhone: maskIsraeliPhone(result.phoneLocal),
    expiresInSec: result.expiresInSec,
    resendInSec: result.resendInSec,
    deliveryStatus: result.deliveryStatus,
  });
}
