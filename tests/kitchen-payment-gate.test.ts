import { describe, expect, it } from "vitest";
import { newOrderPrintJobId } from "@/lib/print-jobs/ids";
import {
  mayReleaseOrderToKitchen,
  orderKitchenPrintBlockReason,
} from "@/lib/print-jobs/payment-gate";
import { isAndroidPrintAgent, kitchenClaimBlockReason } from "@/lib/printer/destination";
import { isClaimablePrintStatus } from "@/lib/print-jobs/hold";

type Order = {
  id: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
};

type Job = {
  id: string;
  orderId: string;
  type: "NEW_ORDER" | "REPRINT";
  status: "PENDING" | "PRINTING" | "FAILED" | "PRINTED";
  lastError: string | null;
};

/**
 * In-memory kitchen pipeline with Hyp payment gate.
 * No Firebase / Hyp / TCP.
 */
function kitchenPipeline(hypPaymentsEnabled: boolean) {
  const orders = new Map<string, Order>();
  const jobs = new Map<string, Job>();
  const printedOrderIds: string[] = [];

  function placeOrder(order: Order) {
    orders.set(order.id, order);
  }

  function enqueueNew(orderId: string) {
    const order = orders.get(orderId);
    const block = orderKitchenPrintBlockReason(order, { hypPaymentsEnabled });
    if (block) return { status: "skipped" as const, reason: block };
    const id = newOrderPrintJobId(orderId);
    if (jobs.has(id)) return { status: "already_exists" as const, id };
    jobs.set(id, { id, orderId, type: "NEW_ORDER", status: "PENDING", lastError: null });
    return { status: "created" as const, id };
  }

  function enqueueReprint(orderId: string) {
    const order = orders.get(orderId);
    const block = orderKitchenPrintBlockReason(order, { hypPaymentsEnabled });
    if (block) return { status: "skipped" as const, reason: block };
    const id = `REPRINT_${orderId}_${jobs.size + 1}`;
    jobs.set(id, { id, orderId, type: "REPRINT", status: "PENDING", lastError: null });
    return { status: "created" as const, id };
  }

  function retryFailed(jobId: string) {
    const job = jobs.get(jobId);
    if (!job) return { status: "skipped" as const, reason: "job_not_found" };
    if (job.status !== "FAILED") return { status: "skipped" as const, reason: "not_failed" };
    const block = orderKitchenPrintBlockReason(orders.get(job.orderId), { hypPaymentsEnabled });
    if (block) return { status: "skipped" as const, reason: block };
    job.status = "PENDING";
    job.lastError = null;
    return { status: "created" as const, id: jobId };
  }

  function claim(agentId: string) {
    if (!isAndroidPrintAgent(agentId)) return { job: null, reason: "agent_not_allowed" as const };
    const heartbeat = {
      printerIp: "192.168.1.80",
      printerPort: 9100,
      printerConnectionStatus: "connected",
    };
    const blocked = kitchenClaimBlockReason(heartbeat);
    if (blocked) return { job: null, reason: blocked };

    for (const job of jobs.values()) {
      if (!isClaimablePrintStatus(job.status)) continue;
      const paymentBlock = orderKitchenPrintBlockReason(orders.get(job.orderId), {
        hypPaymentsEnabled,
      });
      if (paymentBlock) {
        job.status = "FAILED";
        job.lastError = paymentBlock;
        return { job: null, reason: paymentBlock };
      }
      job.status = "PRINTING";
      return { job, reason: null };
    }
    return { job: null, reason: "empty" as const };
  }

  function markPrinted(jobId: string) {
    const job = jobs.get(jobId);
    if (!job || job.status !== "PRINTING") return false;
    job.status = "PRINTED";
    printedOrderIds.push(job.orderId);
    return true;
  }

  function markOrderPaid(orderId: string) {
    const order = orders.get(orderId);
    if (!order) return;
    order.paymentStatus = "paid";
  }

  function advanceStatus(orderId: string, status: string) {
    const order = orders.get(orderId);
    if (!order) return;
    order.status = status;
  }

  return {
    placeOrder,
    enqueueNew,
    enqueueReprint,
    retryFailed,
    claim,
    markPrinted,
    markOrderPaid,
    advanceStatus,
    jobs,
    printedOrderIds,
  };
}

describe("orderKitchenPrintBlockReason", () => {
  it("allows legacy card pending when Hyp is disabled", () => {
    expect(
      mayReleaseOrderToKitchen(
        { status: "received", paymentMethod: "card", paymentStatus: "pending" },
        { hypPaymentsEnabled: false }
      )
    ).toBe(true);
  });

  it("blocks unpaid card when Hyp is enabled even after kitchen status changes", () => {
    for (const status of ["received", "preparing", "ready"]) {
      expect(
        orderKitchenPrintBlockReason(
          { status, paymentMethod: "card", paymentStatus: "pending" },
          { hypPaymentsEnabled: true }
        )
      ).toBe("awaiting_card_payment");
    }
  });

  it("blocks stamped requiresOnlinePayment even when Hyp env flag is off", () => {
    expect(
      orderKitchenPrintBlockReason(
        {
          status: "received",
          paymentMethod: "card",
          paymentStatus: "pending",
          requiresOnlinePayment: true,
        },
        { hypPaymentsEnabled: false }
      )
    ).toBe("awaiting_card_payment");
  });
});

describe("kitchen pipeline payment gate (mock)", () => {
  it("Hyp OFF: cash and card both enqueue and print once", () => {
    const pipe = kitchenPipeline(false);
    pipe.placeOrder({
      id: "o-cash",
      status: "received",
      paymentMethod: "cash",
      paymentStatus: "pending",
    });
    pipe.placeOrder({
      id: "o-card",
      status: "received",
      paymentMethod: "card",
      paymentStatus: "pending",
    });

    expect(pipe.enqueueNew("o-cash").status).toBe("created");
    expect(pipe.enqueueNew("o-cash").status).toBe("already_exists");
    expect(pipe.enqueueNew("o-card").status).toBe("created");

    const first = pipe.claim("crispy-android-tablet");
    expect(first.job?.orderId).toBe("o-cash");
    pipe.markPrinted(first.job!.id);
    const second = pipe.claim("crispy-android-tablet");
    expect(second.job?.orderId).toBe("o-card");
    pipe.markPrinted(second.job!.id);
    expect(pipe.printedOrderIds).toEqual(["o-cash", "o-card"]);
  });

  it("Hyp ON: unpaid card never reaches Android; paid card prints; retries stay blocked", () => {
    const pipe = kitchenPipeline(true);
    pipe.placeOrder({
      id: "card-1",
      status: "received",
      paymentMethod: "card",
      paymentStatus: "pending",
    });

    expect(pipe.enqueueNew("card-1")).toEqual({
      status: "skipped",
      reason: "awaiting_card_payment",
    });
    expect(pipe.enqueueReprint("card-1").status).toBe("skipped");

    // Simulate a stale PENDING job created before payment (race) — claim must still refuse.
    pipe.jobs.set("NEW_ORDER_card-1", {
      id: "NEW_ORDER_card-1",
      orderId: "card-1",
      type: "NEW_ORDER",
      status: "PENDING",
      lastError: null,
    });
    expect(pipe.claim("crispy-android-tablet").reason).toBe("awaiting_card_payment");
    expect(pipe.jobs.get("NEW_ORDER_card-1")?.status).toBe("FAILED");
    expect(pipe.retryFailed("NEW_ORDER_card-1")).toEqual({
      status: "skipped",
      reason: "awaiting_card_payment",
    });

    // Status changes must not bypass the gate.
    pipe.advanceStatus("card-1", "preparing");
    expect(pipe.enqueueNew("card-1").status).toBe("skipped");
    expect(pipe.retryFailed("NEW_ORDER_card-1").status).toBe("skipped");

    pipe.markOrderPaid("card-1");
    // Existing failed job can be retried only after trusted paid status.
    expect(pipe.retryFailed("NEW_ORDER_card-1").status).toBe("created");
    const claimed = pipe.claim("crispy-android-tablet");
    expect(claimed.job?.orderId).toBe("card-1");
    pipe.markPrinted(claimed.job!.id);
    expect(pipe.printedOrderIds).toEqual(["card-1"]);

    // Duplicate NEW_ORDER id stays unique — no second kitchen ticket for same order.
    expect(pipe.enqueueNew("card-1").status).toBe("already_exists");
  });

  it("Hyp ON: cash pending still prints; failed card never prints", () => {
    const pipe = kitchenPipeline(true);
    pipe.placeOrder({
      id: "cash-1",
      status: "received",
      paymentMethod: "cash",
      paymentStatus: "pending",
    });
    pipe.placeOrder({
      id: "card-fail",
      status: "received",
      paymentMethod: "card",
      paymentStatus: "failed",
    });
    expect(pipe.enqueueNew("cash-1").status).toBe("created");
    expect(pipe.enqueueNew("card-fail").reason).toBe("payment_not_collectable");
    const claimed = pipe.claim("crispy-android-tablet");
    expect(claimed.job?.orderId).toBe("cash-1");
  });
});
