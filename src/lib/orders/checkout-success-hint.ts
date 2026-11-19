/**
 * Success-screen copy for cash (and post-payment) checkout.
 * Reflects real print enqueue status — never claim print was queued when it was skipped.
 */

export type CheckoutPrintOutcome =
  | { kind: "queued" }
  | { kind: "skipped" }
  | { kind: "unknown" };

export function checkoutPrintOutcomeFromResult(result: {
  printQueued?: boolean;
  printSkipped?: boolean;
}): CheckoutPrintOutcome {
  if (result.printQueued === true) return { kind: "queued" };
  if (result.printSkipped === true) return { kind: "skipped" };
  return { kind: "unknown" };
}

export function checkoutSuccessPrintHint(
  outcome: CheckoutPrintOutcome,
  locale: "ar" | "he" | "en" = "ar"
): string {
  if (outcome.kind === "queued") {
    return locale === "he"
      ? "ההזמנה נשמרה ונשלחה לתור ההדפסה."
      : locale === "en"
        ? "The order was saved and sent to the print queue."
        : "تم حفظ الطلب وإرساله إلى طابور الطباعة.";
  }
  if (outcome.kind === "skipped") {
    return locale === "he"
      ? "ההזמנה נשמרה. ההדפסה האוטומטית כבויה בסביבת הבדיקה."
      : locale === "en"
        ? "The order was saved. Automatic printing is off in this test environment."
        : "تم حفظ الطلب. الطباعة التلقائية معطّلة في بيئة الاختبار.";
  }
  return locale === "he"
    ? "ההזמנה נשמרה."
    : locale === "en"
      ? "The order was saved."
      : "تم حفظ الطلب.";
}
