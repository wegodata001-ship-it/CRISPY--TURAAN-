import { afterEach, describe, expect, it } from "vitest";
import { printAgentAuthStatus } from "@/lib/print-jobs/auth";
import { classifyPrintFailure } from "@/lib/print-jobs/failure";
import { isClaimablePrintStatus } from "@/lib/print-jobs/hold";
import { newOrderPrintJobId } from "@/lib/print-jobs/ids";
import { wrapRasterReceipt } from "@/lib/printer/raster";
import { isAndroidPrintAgent, kitchenClaimBlockReason } from "@/lib/printer/destination";

/**
 * In-memory stand-in for Checkout → PrintJob → Agent → printer.
 * No Firebase writes and no TCP to 192.168.1.80.
 */
type Job = {
  id: string;
  orderId: string;
  status: "PENDING" | "PRINTING" | "SENT" | "FAILED";
  flushed: boolean;
};

const ticket = wrapRasterReceipt(Buffer.from([0x1d, 0x76, 0x30, 0x00, 0x01, 0x00, 0x01, 0x00, 0x80]));

function pipeline() {
  const jobs = new Map<string, Job>();
  const printer: Buffer[] = [];

  function enqueue(orderId: string) {
    const id = newOrderPrintJobId(orderId);
    const existing = jobs.get(id);
    if (existing) return { status: "already_exists" as const, id };
    jobs.set(id, { id, orderId, status: "PENDING", flushed: false });
    return { status: "created" as const, id };
  }

  function claim(agentId: string, heartbeat: { printerIp: string; printerPort: number; printerConnectionStatus: string }) {
    if (!isAndroidPrintAgent(agentId)) return { job: null, reason: "agent_not_allowed" as const };
    const blocked = kitchenClaimBlockReason(heartbeat);
    if (blocked) return { job: null, reason: blocked };
    const job = [...jobs.values()].find((item) => isClaimablePrintStatus(item.status));
    if (!job) return { job: null, reason: "empty" as const };
    job.status = "PRINTING";
    return { job, reason: null };
  }

  function deliver(job: Job, mode: "ok" | "connect" | "partial") {
    if (job.flushed) return job.status;
    if (mode === "connect") {
      expect(classifyPrintFailure("printer_connect: connection refused")).toBe("retry_offline");
      job.status = "PENDING";
      return job.status;
    }
    printer.push(Buffer.from(ticket));
    job.flushed = true;
    if (mode === "partial") {
      expect(classifyPrintFailure("printer_partial: connection reset")).toBe("partial_send");
      job.status = "FAILED";
      return job.status;
    }
    job.status = "SENT";
    return job.status;
  }

  return { jobs, printer, enqueue, claim, deliver };
}

const online = {
  printerIp: "192.168.1.80",
  printerPort: 9100,
  printerConnectionStatus: "connected",
};

describe("mock kitchen print pipeline", () => {
  const previousToken = process.env.PRINT_AGENT_TOKEN;

  afterEach(() => {
    if (previousToken === undefined) delete process.env.PRINT_AGENT_TOKEN;
    else process.env.PRINT_AGENT_TOKEN = previousToken;
  });

  it("creates one job, the agent receives it, and the mock printer receives one ticket", () => {
    const kitchen = pipeline();
    const created = kitchen.enqueue("order-1");
    expect(created.status).toBe("created");
    const claimed = kitchen.claim("crispy-android-tablet", online);
    expect(claimed.job?.id).toBe("NEW_ORDER_order-1");
    expect(kitchen.deliver(claimed.job!, "ok")).toBe("SENT");
    expect(kitchen.printer).toHaveLength(1);
    expect(kitchen.printer[0]?.includes(Buffer.from([0x1d, 0x56, 0x00]))).toBe(true);
    expect(kitchen.claim("crispy-android-tablet", online).job).toBeNull();
    expect(kitchen.deliver(claimed.job!, "ok")).toBe("SENT");
    expect(kitchen.printer).toHaveLength(1);
  });

  it("keeps the job when the printer is offline, then sends it once after reconnect", () => {
    const kitchen = pipeline();
    kitchen.enqueue("order-2");
    const offline = kitchen.claim("crispy-android-tablet", {
      ...online,
      printerConnectionStatus: "disconnected",
    });
    expect(offline.reason).toBe("printer_offline");
    expect(kitchen.printer).toHaveLength(0);
    expect(kitchen.jobs.get("NEW_ORDER_order-2")?.status).toBe("PENDING");

    const again = kitchen.claim("crispy-android-tablet", online);
    expect(kitchen.deliver(again.job!, "connect")).toBe("PENDING");
    expect(kitchen.printer).toHaveLength(0);

    const third = kitchen.claim("crispy-android-tablet", online);
    expect(kitchen.deliver(third.job!, "ok")).toBe("SENT");
    expect(kitchen.printer).toHaveLength(1);
  });

  it("does not print again when the socket drops mid-send", () => {
    const kitchen = pipeline();
    kitchen.enqueue("order-3");
    const claimed = kitchen.claim("crispy-android-tablet", online);
    expect(kitchen.deliver(claimed.job!, "partial")).toBe("FAILED");
    expect(kitchen.claim("crispy-android-tablet", online).job).toBeNull();
    expect(kitchen.printer).toHaveLength(1);
  });

  it("rejects a bad token and an agent that is not the CRISPY tablet", () => {
    process.env.PRINT_AGENT_TOKEN = "crispy-test-token";
    expect(printAgentAuthStatus("wrong-token")).toBe(401);
    expect(printAgentAuthStatus("crispy-test-token")).toBe(200);
    expect(printAgentAuthStatus("")).toBe(401);

    const kitchen = pipeline();
    kitchen.enqueue("order-4");
    expect(kitchen.claim("crispy-kitchen-pc", online).reason).toBe("agent_not_allowed");
    expect(kitchen.printer).toHaveLength(0);
    expect(kitchen.jobs.get("NEW_ORDER_order-4")?.status).toBe("PENDING");
  });

  it("returns already_exists for a second enqueue of the same order", () => {
    const kitchen = pipeline();
    kitchen.enqueue("order-5");
    expect(kitchen.enqueue("order-5").status).toBe("already_exists");
    expect(kitchen.jobs.size).toBe(1);
  });
});
