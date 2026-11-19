import { describe, expect, it, vi } from "vitest";
import { otpSmsText } from "@/lib/phone-otp/engine";
import { readMeser10Config, sendMeser10Sms } from "@/lib/phone-otp/meser10";

describe("meser10 config", () => {
  it("requires api key and approved sender ≤11 chars", () => {
    expect(readMeser10Config({})).toBeNull();
    expect(readMeser10Config({ MESER10_API_KEY: "k" })).toEqual({
      apiKey: "k",
      sender: "CRISPY",
      userAgent: "crispy-otp/1.0",
    });
    expect(
      readMeser10Config({ MESER10_API_KEY: "k", MESER10_SENDER: "Meser10 Israel" })
    ).toBeNull();
    expect(readMeser10Config({ MESER10_API_KEY: "k", MESER10_SENDER: "CRISPY" })).toEqual({
      apiKey: "k",
      sender: "CRISPY",
      userAgent: "crispy-otp/1.0",
    });
  });
});

describe("meser10 sendSms mock transport", () => {
  const config = { apiKey: "test-key-not-real", sender: "CRISPY", userAgent: "crispy-otp-test/1.0" };

  it("sends digits-only MessageBody and CRISPY FromName", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || "{}")) as Record<string, string>;
      expect(body.ToPhone).toBe("0501234567");
      expect(body.MessageBody).toBe("483921");
      expect(body.MessageBody).toMatch(/^\d{6}$/);
      expect(body.MessageBody).not.toMatch(/[^\d]/);
      expect(body.FromName).toBe("CRISPY");
      const headers = init?.headers as Record<string, string>;
      expect(headers.ApiKey).toBe("test-key-not-real");
      expect(headers["User-Agent"]).toBe("crispy-otp-test/1.0");
      return new Response(JSON.stringify({ ErrorCode: 0, Result: "", MessageID: 42 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const result = await sendMeser10Sms("0501234567", otpSmsText("483921"), config, fetchImpl);
    expect(result).toEqual({ ok: true, status: "sent", messageId: "42" });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("rejects non-digit message bodies before network", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await sendMeser10Sms("0501234567", "Your code is 123456", config, fetchImpl);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("INVALID_MESSAGE");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps auth failure (ErrorCode 1) without treating as success", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ErrorCode: "1", Result: "bad key" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    ) as unknown as typeof fetch;
    const result = await sendMeser10Sms("0501234567", "123456", config, fetchImpl);
    expect(result).toMatchObject({ ok: false, error: "AUTH_FAILED", errorCode: "1" });
  });

  it("maps unapproved sender (ErrorCode 4)", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ErrorCode: 4, Result: "sender" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    ) as unknown as typeof fetch;
    const result = await sendMeser10Sms("0501234567", "123456", config, fetchImpl);
    expect(result).toMatchObject({ ok: false, error: "SENDER_OR_PARAMS", errorCode: "4" });
  });

  it("maps network failures", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("socket hang up");
    }) as unknown as typeof fetch;
    const result = await sendMeser10Sms("0501234567", "123456", config, fetchImpl);
    expect(result).toMatchObject({ ok: false, error: "socket hang up" });
  });
});
