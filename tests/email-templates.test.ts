import { describe, expect, it } from "vitest";
import { renderNewOrderEmail, renderTestEmailHtml } from "@/lib/email/templates";

describe("email templates", () => {
  it("renders MISHKAH branding without WEGO", () => {
    const testMail = renderTestEmailHtml();
    expect(testMail.subject).toContain("MISHKAH CAFE");
    expect(testMail.html).toContain("MISHKAH CAFE");
    expect(testMail.html.toLowerCase()).not.toContain("wego");
    expect(testMail.text.toLowerCase()).not.toContain("wego");
  });

  it("renders new order html with items and notes", () => {
    const mail = renderNewOrderEmail({
      orderId: "abc",
      orderNumber: "MC-2026-TEST",
      createdAt: "2026-08-30T10:15:00.000Z",
      customerName: "תסנים",
      customerPhone: "0500000000",
      items: [
        {
          productName: "Cappuccino",
          quantity: 2,
          price: 18,
          modifiers: [{ optionName: "חלב רגיל" }, { optionName: "ללא סוכר" }],
        },
      ],
      total: 36,
      paymentMethod: "cash",
      orderType: "pickup",
      notes: "בלי קרח",
      viewUrl: "https://portal.mishkatcafe.dev/orders",
    });

    expect(mail.subject).toContain("MISHKAH CAFE");
    expect(mail.subject).toContain("MC-2026-TEST");
    expect(mail.html).toContain("Cappuccino");
    expect(mail.html).toContain("חלב רגיל");
    expect(mail.html).toContain("בלי קרח");
    expect(mail.html).toContain("איסוף עצמי");
    expect(mail.html.toLowerCase()).not.toContain("wego");
  });
});
