import { NextResponse } from "next/server";
import {
  isPhoneOtpMockEnabled,
  isPhoneOtpRequired,
} from "@/lib/phone-otp/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public, secret-free OTP capability flags for the checkout UI.
 * Does not enable SMS; real send stays gated server-side.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    required: isPhoneOtpRequired(),
    mock: isPhoneOtpMockEnabled(),
  });
}
