import { describe, expect, it, vi } from "vitest";
import { otpSmsText } from "@/lib/phone-otp/engine";
import { getOtpSmsProvider, isOtpSmsProviderConfigured } from "@/lib/phone-otp/provider";
import { sendTelnyxSms } from "@/lib/phone-otp/telnyx";

describe("OTP SMS provider selection", () => {
  it("defaults to telnyx and accepts meser10", () => {
    expect(getOtpSmsProvider({})).toBe("telnyx");
    expect(getOtpSmsProvider({ OTP_SMS_PROVIDER: "telnyx" })).toBe("telnyx");
    expect(getOtpSmsProvider({ OTP_SMS_PROVIDER: "meser10" })).toBe("meser10");
  });

  it("requires Telnyx key + messaging profile", () => {
    expect(isOtpSmsProviderConfigured({ OTP_SMS_PROVIDER: "telnyx" }, "telnyx")).toBe(false);
    expect(
      isOtpSmsProviderConfigured(
        {
          OTP_SMS_PROVIDER: "telnyx",
          TELNYX_API_KEY: "k",
          TELNYX_MESSAGING_PROFILE_ID: "profile-1",
        },
        "telnyx"
      )
    ).toBe(true);
  });
});

describe("Telnyx digits-only OTP body", () => {
  it("rejects non-digit message before network", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await sendTelnyxSms(
      "+972501234567",
      "Your code is 123456",
      { apiKey: "k", messagingProfileId: "p", senderId: "CRISPY" },
      fetchImpl
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("INVALID_MESSAGE");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends digits-only Telnyx payload for CRISPY sender", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/messages") && init?.method === "POST") {
        const body = JSON.parse(String(init.body || "{}")) as Record<string, string>;
        expect(body.to).toBe("+972501234567");
        expect(body.from).toBe("CRISPY");
        expect(body.text).toBe("483921");
        expect(body.text).toMatch(/^\d{6}$/);
        expect(body.text).not.toMatch(/[^\d]/);
        return new Response(JSON.stringify({ data: { id: "msg-1", status: "queued" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ data: { id: "msg-1", status: "queued" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const direct = await sendTelnyxSms(
      "+972501234567",
      otpSmsText("483921"),
      { apiKey: "k", messagingProfileId: "p", senderId: "CRISPY" },
      fetchImpl
    );
    expect(direct.ok).toBe(true);
    expect(getOtpSmsProvider({ OTP_SMS_PROVIDER: "telnyx" })).toBe("telnyx");
  });
});

