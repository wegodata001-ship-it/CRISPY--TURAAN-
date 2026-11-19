import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhoneOtpDialog } from "@/features/checkout/phone-otp-dialog";

describe("PhoneOtpDialog", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/phone-otp/send")) {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              challengeId: "challenge-1",
              maskedPhone: "050****567",
              resendInSec: 60,
              deliveryStatus: "mock",
              mock: true,
              devCode: "123456",
            }),
          };
        }
        if (url.includes("/api/phone-otp/verify")) {
          const body = JSON.parse(String(init?.body || "{}")) as { code?: string };
          if (body.code === "123456") {
            return {
              ok: true,
              json: async () => ({
                ok: true,
                proofId: "proof-1",
                phoneLocal: "0501234567",
                maskedPhone: "050****567",
                expiresInSec: 600,
              }),
            };
          }
          return {
            ok: false,
            json: async () => ({
              ok: false,
              code: "INVALID_CODE",
              message: "رمز التحقق غير صحيح",
            }),
          };
        }
        throw new Error(`unexpected fetch ${url}`);
      })
    );
  });

  it("sends OTP on open and verifies a 6-digit code into phoneProof", async () => {
    const onVerified = vi.fn();
    render(
      <PhoneOtpDialog
        open
        phone="0501234567"
        locale="ar"
        onClose={() => {}}
        onVerified={onVerified}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/phone-otp/send",
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(screen.getByText("تأكيد رقم الهاتف")).toBeTruthy();
    expect(screen.getByText(/يمكن إعادة الإرسال خلال/)).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId("otp-mock-code").textContent).toMatch(/123456/);
    });

    const inputs = screen.getAllByLabelText(/OTP digit/);
    "123456".split("").forEach((digit, index) => {
      fireEvent.change(inputs[index]!, { target: { value: digit } });
    });

    await waitFor(() => {
      expect(onVerified).toHaveBeenCalledWith({
        proofId: "proof-1",
        phoneLocal: "0501234567",
        maskedPhone: "050****567",
      });
    });
  });

  it("shows server error text for a wrong code", async () => {
    const onVerified = vi.fn();
    render(
      <PhoneOtpDialog
        open
        phone="0501234567"
        locale="ar"
        onClose={() => {}}
        onVerified={onVerified}
      />
    );

    await waitFor(() => expect(screen.getByLabelText("OTP digit 1")).toBeTruthy());
    const inputs = screen.getAllByLabelText(/OTP digit/);
    "000000".split("").forEach((digit, index) => {
      fireEvent.change(inputs[index]!, { target: { value: digit } });
    });

    await waitFor(() => {
      expect(screen.getByText("رمز التحقق غير صحيح")).toBeTruthy();
    });
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("auto-sends only once per open (no duplicate SMS on remount of same open session)", async () => {
    const { rerender } = render(
      <PhoneOtpDialog
        open
        phone="0501234567"
        locale="ar"
        onClose={() => {}}
        onVerified={() => {}}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/phone-otp/send",
        expect.objectContaining({ method: "POST" })
      );
    });
    const sendCalls = () =>
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter((call) =>
        String(call[0]).includes("/api/phone-otp/send")
      ).length;
    expect(sendCalls()).toBe(1);

    rerender(
      <PhoneOtpDialog
        open
        phone="0501234567"
        locale="ar"
        onClose={() => {}}
        onVerified={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText("تأكيد رقم الهاتف")).toBeTruthy());
    expect(sendCalls()).toBe(1);
  });
});
