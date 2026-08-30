/**
 * End-to-end new-order email check (checkout-equivalent payload).
 * 1) Creates a TEST order in Firestore (same shape as checkout)
 * 2) Calls notifyNewOrderEmail
 * 3) Calls notify again — must be ALREADY_SENT
 * 4) Prints notification status (no secrets)
 *
 * Usage: npx tsx scripts/email-new-order-e2e.mts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { Timestamp } from "firebase-admin/firestore";

loadEnv({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { getAdminDb } = await import("../src/lib/firebase/admin");
  const { COLLECTIONS } = await import("../src/lib/firebase/collections");
  const { notifyNewOrderEmail } = await import("../src/lib/email/notify-new-order");
  const { assertBrevoReady, getBrevoConfig } = await import("../src/lib/email/config");

  const ready = assertBrevoReady();
  const cfg = getBrevoConfig();
  console.log("=== MISHKAH CAFE — new order email e2e ===");
  console.log(`Sender: ${cfg.senderName} <${cfg.senderEmail}>`);
  console.log(`BREVO_API_KEY: ${cfg.apiKey ? "SET" : "MISSING"}`);
  if (!ready.ok) {
    console.error(`CONFIG FAILED: ${ready.error}`);
    process.exitCode = 1;
    return;
  }

  const db = getAdminDb();
  const year = new Date().getFullYear();
  const orderNumber = `MC-${year}-EMAILTEST`;
  const now = Timestamp.now();

  const orderPayload = {
    orderNumber,
    customerId: "guest",
    customerName: "TEST EMAIL Customer",
    customerPhone: "0501234567",
    items: [
      {
        productId: "email-test-product",
        productName: "Cappuccino TEST",
        quantity: 2,
        price: 18,
        basePrice: 16,
        modifiers: [
          {
            groupId: "milk",
            groupName: "חלב",
            optionId: "regular",
            optionName: "חלב רגיל",
            priceDelta: 0,
            quantity: 1,
          },
          {
            groupId: "sugar",
            groupName: "סוכר",
            optionId: "none",
            optionName: "ללא סוכר",
            priceDelta: 0,
            quantity: 1,
          },
        ],
        notes: "הערת פריט TEST",
        kitchenNotes: ["בלי קצף"],
      },
      {
        productId: "email-test-croissant",
        productName: "Croissant TEST",
        quantity: 1,
        price: 14,
        basePrice: 14,
      },
    ],
    status: "pending",
    subtotal: 50,
    discount: 0,
    delivery: 0,
    total: 50,
    paymentMethod: "cash",
    paymentStatus: "pending",
    orderType: "pickup",
    notes: "הזמנת TEST לבדיקת מערכת המיילים\nאיסוף עצמי מהעסק",
    createdAt: now,
  };

  const ref = await db.collection(COLLECTIONS.orders).add(orderPayload);
  const orderId = ref.id;
  console.log(`Order created: ${orderId} (#${orderNumber})`);

  const first = await notifyNewOrderEmail(orderId);
  console.log(`Notify #1: ${first.status}${first.status === "sent" ? ` messageId=${first.messageId ? "YES" : "NO"}` : ""}${first.status === "failed" ? ` error=${first.error}` : ""}`);

  const second = await notifyNewOrderEmail(orderId);
  console.log(
    `Notify #2: ${second.status === "already_sent" ? "ALREADY_SENT" : second.status}`
  );

  const snap = await ref.get();
  const data = snap.data() as {
    notifications?: {
      newOrderEmail?: { status?: string; messageId?: string };
      newOrderEmailSent?: boolean;
    };
  };
  const emailStatus = data.notifications?.newOrderEmail?.status ?? "MISSING";
  const legacySent = data.notifications?.newOrderEmailSent === true;
  const hasMessageId = Boolean(data.notifications?.newOrderEmail?.messageId);

  console.log(`Firestore notifications.newOrderEmail.status: ${emailStatus}`);
  console.log(`Firestore notifications.newOrderEmailSent: ${legacySent}`);
  console.log(`Firestore messageId: ${hasMessageId ? "YES" : "NO"}`);

  const pass =
    first.status === "sent" &&
    second.status === "already_sent" &&
    emailStatus === "SENT" &&
    legacySent;

  console.log(pass ? "E2E RESULT: PASS" : "E2E RESULT: FAIL");
  console.log(`Keep order id for inbox check: ${orderId}`);
  process.exitCode = pass ? 0 : 1;
}

main().catch((error) => {
  console.error("FATAL:", error instanceof Error ? error.message : "unknown");
  process.exitCode = 1;
});
