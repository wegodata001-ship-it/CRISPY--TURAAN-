"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Locale = "ar" | "he" | "en";

const COPY = {
  ar: {
    title: "تأكيد رقم الهاتف",
    sent: "أرسلنا رمز التحقق إلى رقم هاتفك",
    confirm: "تأكيد الرمز",
    resend: "إعادة إرسال الرمز",
    change: "تغيير رقم الهاتف",
    wait: "يمكن إعادة الإرسال خلال",
    mockHint: "وضع تجريبي — الرمز:",
  },
  he: {
    title: "אימות מספר טלפון",
    sent: "שלחנו קוד אימות לטלפון",
    confirm: "אישור הקוד",
    resend: "שליחה מחדש",
    change: "שינוי מספר הטלפון",
    wait: "אפשר לשלוח שוב בעוד",
    mockHint: "מצב בדיקה — הקוד:",
  },
  en: {
    title: "Confirm your phone",
    sent: "We sent a verification code to your phone",
    confirm: "Confirm code",
    resend: "Resend code",
    change: "Change phone number",
    wait: "You can resend in",
    mockHint: "Mock mode — code:",
  },
} as const;

export function PhoneOtpDialog({
  open,
  phone,
  locale,
  onClose,
  onVerified,
}: {
  open: boolean;
  phone: string;
  locale: Locale;
  onClose: () => void;
  onVerified: (proof: { proofId: string; phoneLocal: string; maskedPhone: string }) => void;
}) {
  const copy = COPY[locale];
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [challengeId, setChallengeId] = useState("");
  const [masked, setMasked] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const sentFor = useRef("");
  const verifying = useRef(false);

  const send = async (reason: "open" | "resend") => {
    if (sending.current) return;
    if (reason === "open" && sentFor.current === phone) return;
    sending.current = true;
    if (reason === "open") sentFor.current = phone;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/phone-otp/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, locale }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        challengeId?: string;
        maskedPhone?: string;
        message?: string;
        resendInSec?: number;
        retryAfterSec?: number;
        mock?: boolean;
        devCode?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.challengeId) {
        if (reason === "open") sentFor.current = "";
        setError(payload?.message || copy.sent);
        setSeconds(typeof payload?.retryAfterSec === "number" ? payload.retryAfterSec : 0);
        return;
      }
      setChallengeId(payload.challengeId);
      setMasked(payload.maskedPhone || "");
      setDevCode(payload.mock === true && payload.devCode ? payload.devCode : null);
      setSeconds(payload.resendInSec || 60);
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } finally {
      sending.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      sentFor.current = "";
      setChallengeId("");
      setDigits(["", "", "", "", "", ""]);
      setDevCode(null);
      setError("");
      return;
    }
    void send("open");
    // Auto-send once per open+phone; resend uses the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phone]);

  useEffect(() => {
    if (!open || seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [open, seconds]);

  const confirm = async (codeOverride?: string) => {
    const code = (codeOverride ?? digits.join("")).replace(/\D/g, "");
    if (code.length !== 6 || !challengeId || loading || verifying.current) return;
    verifying.current = true;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/phone-otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, code, locale }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        proofId?: string;
        phoneLocal?: string;
        maskedPhone?: string;
        message?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.proofId || !payload.phoneLocal) {
        setError(payload?.message || copy.confirm);
        return;
      }
      onVerified({
        proofId: payload.proofId,
        phoneLocal: payload.phoneLocal,
        maskedPhone: payload.maskedPhone || masked,
      });
    } finally {
      verifying.current = false;
      setLoading(false);
    }
  };

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) {
      const next = clean.slice(0, 6).split("");
      const filled = [0, 1, 2, 3, 4, 5].map((slot) => next[slot] || "");
      setDigits(filled);
      const joined = filled.join("");
      if (joined.length === 6) {
        void confirm(joined);
        return;
      }
      inputs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) inputs.current[index + 1]?.focus();
    const joined = next.join("");
    if (joined.length === 6) void confirm(joined);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) onClose();
      }}
    >
      <DialogContent
        className="rounded-[18px] border-beige-dark bg-warm-white sm:max-w-md"
        dir={locale === "en" ? "ltr" : "rtl"}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-dark-brown">{copy.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-coffee-light">{copy.sent}</p>
        <p className="text-lg font-bold tracking-wide text-dark-brown" dir="ltr">
          {masked || phone}
        </p>
        {devCode ? (
          <p
            className="rounded-xl border border-dashed border-turquoise/40 bg-turquoise/5 px-3 py-2 text-sm font-semibold text-dark-brown"
            data-testid="otp-mock-code"
            dir="ltr"
          >
            {copy.mockHint} <span className="tracking-[0.35em]">{devCode}</span>
          </p>
        ) : null}
        <div className="flex justify-between gap-2" dir="ltr">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => {
                inputs.current[index] = node;
              }}
              value={digit}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={index === 0 ? 6 : 1}
              disabled={loading || !challengeId}
              aria-label={`OTP digit ${index + 1}`}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !digits[index] && index > 0) {
                  inputs.current[index - 1]?.focus();
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  void confirm();
                }
              }}
              className="h-14 w-12 rounded-xl border border-beige-dark bg-white text-center text-2xl font-bold text-dark-brown outline-none focus:border-turquoise"
            />
          ))}
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          type="button"
          variant="turquoise"
          className="h-12 w-full rounded-xl font-bold"
          disabled={loading || digits.join("").length !== 6}
          onClick={() => void confirm()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.confirm}
        </Button>
        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            className="font-semibold text-dark-brown disabled:text-coffee-light"
            disabled={loading || seconds > 0}
            onClick={() => void send("resend")}
          >
            {seconds > 0 ? `${copy.wait} ${seconds}` : copy.resend}
          </button>
          <button
            type="button"
            className="font-semibold text-red-700"
            onClick={onClose}
            disabled={loading}
          >
            {copy.change}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
