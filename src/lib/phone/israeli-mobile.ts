/**
 * Israeli mobile parsing for checkout (no SMS / OTP).
 */

export type IsraeliMobile = {
  local: string;
  e164: string;
};

export function parseIsraeliMobile(input: string): IsraeliMobile | null {
  const compact = input.trim().replace(/[^\d+]/g, "");
  let local = "";
  if (/^05\d{8}$/.test(compact)) local = compact;
  else if (/^\+9725\d{8}$/.test(compact)) local = `0${compact.slice(4)}`;
  else if (/^9725\d{8}$/.test(compact)) local = `0${compact.slice(3)}`;
  if (!/^05\d{8}$/.test(local)) return null;
  return { local, e164: `+972${local.slice(1)}` };
}

export function invalidPhoneMessage(locale: "ar" | "he" | "en"): string {
  if (locale === "he") return "יש להזין מספר ישראלי בפורמט 05XXXXXXXX";
  if (locale === "en") return "Enter an Israeli mobile number as 05XXXXXXXX";
  return "أدخل رقم هاتف إسرائيلي بصيغة 05XXXXXXXX";
}
