/**
 * Local Firestore rules tests against crispy-d0bf7.production.final.rules.
 * Does not touch production data or publish.
 *
 *   npx tsx scripts/hyp-production-rules-emulator.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

const PROJECT_ID = "crispy-rules-emu";
const rules = readFileSync(
  resolve(process.cwd(), "firestore/crispy-d0bf7.production.final.rules"),
  "utf8"
);

const cashOrder = {
  orderNumber: "MC-TEST-1",
  customerId: "guest-checkout",
  customerName: "Cash Guest",
  items: [{ productId: "p1", productName: "Item", quantity: 1, price: 20 }],
  status: "received",
  subtotal: 20,
  discount: 0,
  delivery: 0,
  total: 20,
  paymentMethod: "cash",
  paymentStatus: "pending",
};

const unpaidHypOrder = {
  ...cashOrder,
  orderNumber: "MC-TEST-HYP",
  paymentMethod: "card",
  paymentStatus: "pending",
  requiresOnlinePayment: true,
  awaitingHypPayment: true,
  paymentFlow: "hyp_online",
};

async function seed(env: RulesTestEnvironment) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc("users/staff-admin").set({ role: "Admin", active: true });
    await db.doc("users/staff-emp").set({ role: "Employee", active: true });
    await db.doc("orders/cash-1").set(cashOrder);
    await db.doc("orders/hyp-unpaid").set(unpaidHypOrder);
    await db.doc("orders/hyp-paid").set({
      ...unpaidHypOrder,
      paymentStatus: "paid",
      awaitingHypPayment: false,
    });
  });
}

async function main() {
  const env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules, host: "127.0.0.1", port: 8080 },
  });

  const results: Array<{ name: string; ok: boolean; error?: string }> = [];
  async function check(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (error) {
      results.push({
        name,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    await seed(env);
    const guest = env.unauthenticatedContext().firestore();
    const staff = env.authenticatedContext("staff-admin").firestore();

    await check("guest cannot create order (closed open create)", async () => {
      await assertFails(guest.collection("orders").add({ ...cashOrder }));
    });

    await check("staff can create cash ticket without paid stamps", async () => {
      await assertSucceeds(staff.collection("orders").add({ ...cashOrder }));
    });

    await check("staff cannot create order stamped paid", async () => {
      await assertFails(
        staff.collection("orders").add({ ...cashOrder, paymentStatus: "paid", paidAt: new Date() })
      );
    });

    await check("staff cannot create hyp_online awaiting ticket", async () => {
      await assertFails(staff.collection("orders").add({ ...unpaidHypOrder }));
    });

    await check("staff can advance cash to preparing", async () => {
      await assertSucceeds(staff.doc("orders/cash-1").update({ status: "preparing" }));
    });

    await check("staff cannot advance unpaid hyp to preparing", async () => {
      await assertFails(staff.doc("orders/hyp-unpaid").update({ status: "preparing" }));
    });

    await check("staff can cancel unpaid hyp", async () => {
      await assertSucceeds(staff.doc("orders/hyp-unpaid").update({ status: "cancelled" }));
    });

    await check("staff cannot forge paymentStatus paid", async () => {
      await assertFails(staff.doc("orders/hyp-unpaid").update({ paymentStatus: "paid" }));
    });

    await check("staff can advance paid hyp to preparing", async () => {
      await assertSucceeds(staff.doc("orders/hyp-paid").update({ status: "preparing" }));
    });

    await check("guest cannot write hypPaymentIntents", async () => {
      await assertFails(guest.doc("hypPaymentIntents/x").set({ orderId: "o1" }));
    });

    await check("guest cannot write phoneOtps", async () => {
      await assertFails(guest.doc("phoneOtps/x").set({ code: "123456" }));
    });

    await check("guest cannot write coupons", async () => {
      await assertFails(guest.doc("coupons/SAVE10").set({ code: "SAVE10" }));
    });

    await check("staff can write products (preserved)", async () => {
      await assertSucceeds(staff.doc("products/p-new").set({ name: "Test", price: 1, active: true }));
    });

    await check("public can read products (preserved)", async () => {
      await assertSucceeds(guest.doc("products/p-new").get());
    });
  } finally {
    await env.cleanup();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify(
      {
        ok: failed.length === 0,
        passed: results.filter((r) => r.ok).length,
        failed: failed.length,
        results,
      },
      null,
      2
    )
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
