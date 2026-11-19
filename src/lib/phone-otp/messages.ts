export type OtpErrorCode =
  | "INVALID_PHONE"
  | "PHONE_NOT_ALLOWED"
  | "RESEND_WAIT"
  | "RATE_LIMIT"
  | "INVALID_CODE"
  | "EXPIRED"
  | "TOO_MANY_ATTEMPTS"
  | "SUPERSEDED"
  | "PHONE_NOT_VERIFIED"
  | "PHONE_MISMATCH"
  | "SEND_FAILED"
  | "DELIVERY_FAILED"
  | "NOT_CONFIGURED";

export const OTP_ERROR_TEXT: Record<OtpErrorCode, { ar: string; he: string; en: string }> = {
  INVALID_PHONE: {
    ar: "أدخل رقم هاتف إسرائيلي بصيغة 05XXXXXXXX",
    he: "יש להזין מספר ישראלי בפורמט 05XXXXXXXX",
    en: "Enter an Israeli mobile number as 05XXXXXXXX",
  },
  PHONE_NOT_ALLOWED: {
    ar: "هذا الرقم غير مسموح لإرسال رمز التحقق في وضع التجربة",
    he: "מספר זה אינו מורשה לשליחת קוד אימות במצב בדיקה",
    en: "This phone number is not allowed for verification SMS in staging",
  },
  RESEND_WAIT: {
    ar: "يمكن طلب رمز جديد بعد انتهاء المؤقت",
    he: "אפשר לבקש קוד חדש אחרי סיום הטיימר",
    en: "You can request a new code when the timer ends",
  },
  RATE_LIMIT: {
    ar: "تم إيقاف الإرسال مؤقتاً لحماية الحساب. حاول لاحقاً",
    he: "השליחה הושהתה זמנית. נסו שוב מאוחר יותר",
    en: "Sending is temporarily paused. Try again later",
  },
  INVALID_CODE: {
    ar: "رمز التحقق غير صحيح",
    he: "קוד האימות שגוי",
    en: "The verification code is incorrect",
  },
  EXPIRED: {
    ar: "انتهت صلاحية رمز التحقق",
    he: "פג תוקף קוד האימות",
    en: "The verification code has expired",
  },
  TOO_MANY_ATTEMPTS: {
    ar: "تم تجاوز عدد المحاولات. اطلب رمزاً جديداً",
    he: "חרגתם ממספר הניסיונות. בקשו קוד חדש",
    en: "Too many attempts. Request a new code",
  },
  SUPERSEDED: {
    ar: "تم إلغاء هذا الرمز. استخدم الرمز الأخير الذي أُرسل",
    he: "הקוד הזה בוטל. השתמשו בקוד האחרון שנשלח",
    en: "This code was replaced. Use the latest code",
  },
  PHONE_NOT_VERIFIED: {
    ar: "يجب تأكيد رقم الهاتف قبل إرسال الطلب",
    he: "יש לאמת את הטלפון לפני שליחת ההזמנה",
    en: "Verify the phone number before placing the order",
  },
  PHONE_MISMATCH: {
    ar: "رقم الهاتف لا يطابق الرقم الذي تم التحقق منه",
    he: "מספר הטלפון לא תואם למספר שאומת",
    en: "The phone number does not match the verified number",
  },
  SEND_FAILED: {
    ar: "تعذر إرسال الرسالة. حاول مرة أخرى",
    he: "לא הצלחנו לשלוח את ההודעה. נסו שוב",
    en: "The message could not be sent. Try again",
  },
  DELIVERY_FAILED: {
    ar: "لم يؤكد مزود الرسائل تسليم الرمز",
    he: "ספק ההודעות לא אישר את מסירת הקוד",
    en: "The SMS provider did not confirm delivery",
  },
  NOT_CONFIGURED: {
    ar: "إرسال الرسائل غير مُعد على الخادم",
    he: "שליחת ההודעות לא הוגדרה בשרת",
    en: "SMS sending is not configured on the server",
  },
};
