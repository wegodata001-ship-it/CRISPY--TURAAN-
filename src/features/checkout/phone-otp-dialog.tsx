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
  },
  he: {
    title: "אימות מספר טלפון",
    sent: "שלחנו קוד אימות לטלפון",
    confirm: "אישור הקוד",
    resend: "שליחה מחדש",
    change: "שינוי מספר הטלפון",
    wait: "אפשר לשלוח שוב בעוד",
  },
  en: {
    title: "Confirm your phone",
    sent: "We sent a verification code to your phone",
    confirm: "Confirm code",
    resend: "Resend code",
    change: "Change phone number",
    wait: "You can resend in",
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
  onVerified: (proof: { proofId: string; maskedPhone: string }) => void;
}) {
  const copy = COPY[locale];
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [challengeId, setChallengeId] = useState("");
  const [masked, setMasked] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const sending = useRef(false);
  const sentFor = useRef("");

  const send = async () => {
    if (sending.current) return;
    sending.current = true;
    setLoading(true);
    setError("");
    setMessage("");
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
    } | null;
    sending.current = false;
    setLoading(false);
    if (!response.ok || !payload?.ok || !payload.challengeId) {
      setError(payload?.message || COPY.ar.sent);
      setSeconds(payload?.retryAfterSec || 0);
      return;
    }
    setChallengeId(payload.challengeId);
    setMasked(payload.maskedPhone || "");
    setSeconds(payload.resendInSec || 60);
    setDigits(["", "", "", "", "", ""]);
    setTimeout(() => inputs.current[0]?.focus(), 50);
  };

  useEffect(() => {
    if (!open) {
      sentFor.current = "";
      return;
    }
    if (sentFor.current === phone) return;
    sentFor.current = phone;
    void send();
    // Send once per open. Resend uses the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phone]);

  useEffect(() => {
    if (!open || seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [open, seconds]);

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) {
      const next = clean.slice(0, 6).split("");
      const filled = [0, 1, 2, 3, 4, 5].map((slot) => next[slot] || "");
      setDigits(filled);
      inputs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) inputs.current[index + 1]?.focus();
  };

  const confirm = async () => {
    const code = digits.join("");
    if (code.length !== 6 || !challengeId || loading) return;
    setLoading(true);
    setError("");
    const response = await fetch("/api/phone-otp/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ challengeId, code, locale }),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      proofId?: string;
      maskedPhone?: string;
      message?: string;
    } | null;
    setLoading(false);
    if (!response.ok || !payload?.ok || !payload.proofId) {
      setError(payload?.message || COPY.ar.confirm);
      return;
    }
    onVerified({ proofId: payload.proofId, maskedPhone: payload.maskedPhone || masked });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !loading) onClose(); }}>
      <DialogContent className="sm:max-w-md" dir={locale === "en" ? "ltr" : "rtl"}>
        <DialogHeader>
          <DialogTitle className="text-xl text-[#171717]">{copy.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#70665D]">{copy.sent}</p>
        <p className="text-lg font-bold tracking-wide text-[#171717]" dir="ltr">{masked || phone}</p>
        <div className="flex justify-between gap-2" dir="ltr">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => { inputs.current[index] = node; }}
              value={digit}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={index === 0 ? 6 : 1}
              disabled={loading || !challengeId}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
              }}
              className="h-14 w-12 rounded-xl border border-[#E7D7C3] bg-[#FFF4E2] text-center text-2xl font-bold text-[#171717] outline-none focus:border-[#D71920]"
            />
          ))}
        </div>
        {error ? <p className="text-sm text-[#A90F16]">{error}</p> : null}
        {message ? <p className="text-sm text-[#2E9B55]">{message}</p> : null}
        <Button
          type="button"
          className="h-12 rounded-xl bg-[#D71920] text-white hover:bg-[#A90F16]"
          disabled={loading || digits.join("").length !== 6}
          onClick={() => void confirm()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.confirm}
        </Button>
        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            className="font-semibold text-[#171717] disabled:text-[#70665D]"
            disabled={loading || seconds > 0}
            onClick={() => void send()}
          >
            {seconds > 0 ? `${copy.wait} ${seconds}` : copy.resend}
          </button>
          <button type="button" className="font-semibold text-[#A90F16]" onClick={onClose} disabled={loading}>
            {copy.change}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
