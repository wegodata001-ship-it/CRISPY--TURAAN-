/**
 * Live Brevo notification matrix for MISHKAH CAFE.
 * Usage: npm run email:matrix
 * Never prints secrets.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { Timestamp } from "firebase-admin/firestore";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

type Row = { name: string; pass: boolean; detail: string };

async function main() {
  const rows: Row[] = [];
  const { assertBrevoReady, getBrevoConfig, getBusinessAlertRecipients, getPortalAdminOrderUrl } =
    await import("../src/lib/email/config");
  const { getAdminDb } = await import("../src/lib/firebase/admin");
  const { COLLECTIONS } = await import("../src/lib/firebase/collections");
  const {
    notifyNewOrder,
    notifyOrderUpdated,
    notifyOrderCancelled,
    notifyCriticalOrderFailure,
  } = await import("../src/lib/email/notifications");
  const { sendMishkahTestEmail } = await import("../src/lib/email/send");
  const { fingerprintChanges } = await import("../src/lib/email/significant-diff");

  const ready = assertBrevoReady();
  const cfg = getBrevoConfig();
  console.log("=== MISHKAH EMAIL NOTIFICATIONS MATRIX ===");
  console.log(`Sender: ${cfg.senderName} <${cfg.senderEmail}>`);
  console.log(`Reply-To: ${cfg.replyTo}`);
  console.log(`Business recipient: ${getBusinessAlertRecipients().join(", ")}`);
  console.log(`BREVO_API_KEY: ${cfg.apiKey ? "SET" : "MISSING"}`);
  console.log(`Portal link sample: ${getPortalAdminOrderUrl("sample")}`);

  if (!ready.ok) {
    console.error(`CONFIG FAILED: ${ready.error}`);
    process.exitCode = 1;
    return;
  }

  // Auth / sender probe via test email to business inbox only
  const test = await sendMishkahTestEmail(getBusinessAlertRecipients()[0]);
  rows.push({
    name: "BREVO_AUTH",
    pass: test.ok,
    detail: test.ok
      ? `HTTP ${test.statusCode} messageId=${test.messageId ? "YES" : "NO"}`
      : test.error,
  });
  if (!test.ok) {
    printRows(rows);
    process.exitCode = 1;
    return;
  }

  const db = getAdminDb();
  const orderNumber = `MC-${new Date().getFullYear()}-MATRIX`;
  const now = Timestamp.now();
  const orderPayload = {
    orderNumber,
    customerId: "guest",
    customerName: "MATRIX Test Customer",
    customerPhone: "0509998877",
    items: [
      {
        productId: "p1",
        productName: "Cappuccino",
        quantity: 1,
        price: 18,
        basePrice: 16,
        modifiers: [
          {
            groupId: "m",
            groupName: "חלב",
            optionId: "reg",
            optionName: "חלב רגיל",
            priceDelta: 0,
            quantity: 1,
          },
        ],
        notes: "ללא סוכר",
      },
    ],
    status: "pending" as const,
    subtotal: 18,
    discount: 0,
    delivery: 0,
    total: 18,
    paymentMethod: "cash",
    paymentStatus: "pending",
    orderType: "pickup" as const,
    notes: "הזמנת MATRIX",
    createdAt: now,
  };

  const ref = await db.collection(COLLECTIONS.orders).add(orderPayload);
  const orderId = ref.id;
  rows.push({ name: "ORDER_CREATED", pass: true, detail: `${orderId} #${orderNumber}` });

  const n1 = await notifyNewOrder(orderId);
  rows.push({
    name: "NEW_ORDER",
    pass: n1.status === "sent" && Boolean(n1.messageId),
    detail: `${n1.status} messageId=${n1.status === "sent" && n1.messageId ? "YES" : "NO"}`,
  });

  const n2 = await notifyNewOrder(orderId);
  rows.push({
    name: "NEW_ORDER_DUP",
    pass: n2.status === "already_sent",
    detail: n2.status,
  });

  // Significant update
  await ref.update({
    total: 36,
    subtotal: 36,
    items: [
      {
        ...orderPayload.items[0],
        quantity: 2,
        modifiers: [
          {
            groupId: "m",
            groupName: "חלב",
            optionId: "soy",
            optionName: "חלב סויה",
            priceDelta: 2,
            quantity: 1,
          },
        ],
        notes: "חלב סויה, ללא סוכר",
      },
    ],
  });

  const changes = [
    { label: "כמות Cappuccino", before: "1", after: "2" },
    { label: "תוספות Cappuccino", before: "חלב רגיל", after: "חלב סויה" },
    { label: "הערה Cappuccino", before: "ללא סוכר", after: "חלב סויה, ללא סוכר" },
    { label: "סה״כ", before: "₪18.00", after: "₪36.00" },
  ];
  const fp = fingerprintChanges(changes);
  const u1 = await notifyOrderUpdated({ orderId, changes, fingerprint: fp });
  rows.push({
    name: "ORDER_UPDATED",
    pass: u1.status === "sent" && Boolean(u1.messageId),
    detail: `${u1.status} messageId=${u1.status === "sent" && u1.messageId ? "YES" : "NO"}`,
  });

  const u2 = await notifyOrderUpdated({ orderId, changes, fingerprint: fp });
  rows.push({
    name: "ORDER_UPDATED_DUP",
    pass: u2.status === "already_sent",
    detail: u2.status,
  });

  await ref.update({
    status: "cancelled",
    cancelReason: "MATRIX cancel test",
    cancelledAt: Timestamp.now(),
    cancelledBy: "matrix-script",
  });
  const c1 = await notifyOrderCancelled(orderId);
  rows.push({
    name: "ORDER_CANCELLED",
    pass: c1.status === "sent" && Boolean(c1.messageId),
    detail: `${c1.status} messageId=${c1.status === "sent" && c1.messageId ? "YES" : "NO"}`,
  });
  const c2 = await notifyOrderCancelled(orderId);
  rows.push({
    name: "ORDER_CANCELLED_DUP",
    pass: c2.status === "already_sent",
    detail: c2.status,
  });

  // Simulate Brevo failure by temporarily clearing key
  const realKey = process.env.BREVO_API_KEY;
  process.env.BREVO_API_KEY = "";
  const failOrder = await db.collection(COLLECTIONS.orders).add({
    ...orderPayload,
    orderNumber: `${orderNumber}-FAIL`,
    createdAt: Timestamp.now(),
  });
  const f1 = await notifyNewOrder(failOrder.id);
  rows.push({
    name: "BREVO_FAIL_DOES_NOT_MARK_SENT",
    pass: f1.status === "failed",
    detail: f1.status === "failed" ? f1.error : f1.status,
  });
  const failSnap = await failOrder.get();
  const failStatus = failSnap.data()?.notifications?.newOrderEmail?.status;
  const failLegacy = failSnap.data()?.notifications?.newOrderEmailSent;
  rows.push({
    name: "ORDER_SURVIVES_EMAIL_FAIL",
    pass: failSnap.exists && failStatus === "FAILED" && failLegacy !== true,
    detail: `orderExists=${failSnap.exists} status=${failStatus} legacySent=${failLegacy}`,
  });

  // Retry after restoring key
  process.env.BREVO_API_KEY = realKey;
  const f2 = await notifyNewOrder(failOrder.id);
  rows.push({
    name: "RETRY_AFTER_FAILED",
    pass: f2.status === "sent" && Boolean(f2.messageId),
    detail: `${f2.status} messageId=${f2.status === "sent" && f2.messageId ? "YES" : "NO"}`,
  });

  // Portal link check
  const link = getPortalAdminOrderUrl(orderId);
  rows.push({
    name: "PORTAL_LINK",
    pass:
      link.startsWith("https://portal.mishkatcafe.dev") &&
      !link.includes("/admin"),
    detail: link,
  });

  // Critical failure + dedupe
  const critMsg = `MATRIX critical ${Date.now()}`;
  const k1 = await notifyCriticalOrderFailure({
    message: critMsg,
    code: "CHECKOUT_UNEXPECTED",
  });
  const k2 = await notifyCriticalOrderFailure({
    message: critMsg,
    code: "CHECKOUT_UNEXPECTED",
  });
  rows.push({
    name: "CRITICAL_ALERT",
    pass: k1.status === "sent",
    detail: k1.status,
  });
  rows.push({
    name: "CRITICAL_DEDUP",
    pass: k2.status === "already_sent",
    detail: k2.status,
  });

  // Final Firestore status for main order
  const finalSnap = await ref.get();
  const n = finalSnap.data()?.notifications ?? {};
  rows.push({
    name: "FIRESTORE_NEW_SENT",
    pass: n.newOrderEmail?.status === "SENT" && n.newOrderEmailSent === true,
    detail: `new=${n.newOrderEmail?.status} legacy=${n.newOrderEmailSent}`,
  });
  rows.push({
    name: "FIRESTORE_CANCEL_SENT",
    pass: n.orderCancelledEmail?.status === "SENT",
    detail: String(n.orderCancelledEmail?.status),
  });

  // WEGO check in sender
  rows.push({
    name: "NO_WEGO_SENDER",
    pass:
      !cfg.senderEmail.toLowerCase().includes("wego") &&
      !cfg.senderName.toLowerCase().includes("wego"),
    detail: `${cfg.senderName} <${cfg.senderEmail}>`,
  });

  printRows(rows);
  const allPass = rows.every((r) => r.pass);
  console.log(allPass ? "MATRIX: PASS" : "MATRIX: FAIL");
  console.log(`Keep order id: ${orderId}`);
  process.exitCode = allPass ? 0 : 1;
}

function printRows(rows: Row[]) {
  for (const row of rows) {
    console.log(`${row.pass ? "PASS" : "FAIL"} | ${row.name} | ${row.detail}`);
  }
}

main().catch((error) => {
  console.error("FATAL:", error instanceof Error ? error.message : "unknown");
  process.exitCode = 1;
});
