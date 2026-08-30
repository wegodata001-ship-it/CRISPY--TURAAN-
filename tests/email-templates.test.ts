import { describe, expect, it } from "vitest";
import {
  renderNewOrderEmail,
  renderOrderCancelledEmail,
  renderOrderUpdatedEmail,
  renderTestEmailHtml,
} from "@/lib/email/templates";
import { getPortalAdminOrderUrl } from "@/lib/email/config";
import { computeSignificantOrderChanges } from "@/lib/email/significant-diff";
import type { Order } from "@/types";

describe("email templates", () => {
  it("renders MISHKAH branding without WEGO", () => {
    const testMail = renderTestEmailHtml();
    expect(testMail.subject).toContain("MISHKAH CAFE");
    expect(testMail.html).toContain("MISHKAH CAFE");
    expect(testMail.html.toLowerCase()).not.toContain("wego");
    expect(testMail.text.toLowerCase()).not.toContain("wego");
  });

  it("renders new order with portal CTA", () => {
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
          modifiers: [{ optionName: "חלב רגיל" }],
        },
      ],
      total: 36,
      paymentMethod: "cash",
      orderType: "pickup",
      status: "pending",
      notes: "בלי קרח",
      viewUrl: "https://portal.mishkatcafe.dev/orders?order=abc",
    });

    expect(mail.subject).toBe("הזמנה חדשה #MC-2026-TEST | MISHKAH CAFE");
    expect(mail.html).toContain("פתיחת ההזמנה");
    expect(mail.html).toContain("portal.mishkatcafe.dev");
    expect(mail.html).not.toContain("/admin");
    expect(mail.html.toLowerCase()).not.toContain("wego");
  });

  it("renders update and cancel subjects", () => {
    const base = {
      orderId: "abc",
      orderNumber: "MC-1",
      createdAt: "2026-08-30T10:15:00.000Z",
      customerName: "A",
      items: [{ productName: "X", quantity: 1, price: 10 }],
      total: 10,
      viewUrl: "https://portal.mishkatcafe.dev/orders?order=abc",
    };
    const updated = renderOrderUpdatedEmail({
      ...base,
      changes: [{ label: "סה״כ", before: "₪10.00", after: "₪20.00" }],
    });
    const cancelled = renderOrderCancelledEmail({
      ...base,
      cancelReason: "customer",
    });
    expect(updated.subject).toContain("עודכנה");
    expect(updated.html).toContain("מה השתנה");
    expect(cancelled.subject).toContain("בוטלה");
    expect(cancelled.html).toContain("הזמנה בוטלה");
  });
});

describe("significant diff", () => {
  it("detects quantity and total changes only", () => {
    const before = {
      id: "1",
      orderNumber: "A",
      customerId: "g",
      customerName: "A",
      status: "pending",
      items: [{ productId: "p", productName: "Cappuccino", quantity: 1, price: 18 }],
      total: 18,
      createdAt: new Date().toISOString(),
    } as Order;
    const after = {
      ...before,
      items: [{ productId: "p", productName: "Cappuccino", quantity: 2, price: 18 }],
      total: 36,
    } as Order;
    const changes = computeSignificantOrderChanges(before, after);
    expect(changes.some((c) => c.label.includes("כמות"))).toBe(true);
    expect(changes.some((c) => c.label.includes("סה"))).toBe(true);
  });
});

describe("portal url", () => {
  it("uses portal host without /admin", () => {
    const url = getPortalAdminOrderUrl("xyz");
    expect(url).toContain("portal.mishkatcafe.dev");
    expect(url).not.toContain("/admin");
  });
});
