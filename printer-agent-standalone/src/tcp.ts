import net from "node:net";
import { getPrinterHost, getPrinterPort, getPrinterTimeoutMs } from "./env";
import { log } from "./logger";

export class PrinterConnectionError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = "PrinterConnectionError";
  }
}

export interface PrinterTarget {
  host: string;
  port: number;
}

let bindLocalAddress: string | undefined;

export function setPrinterLocalAddress(addr?: string) {
  bindLocalAddress = addr?.trim() || undefined;
}

export async function withPrinterSocket(
  options: {
    host?: string;
    port?: number;
    timeoutMs?: number;
    data?: Buffer;
    localAddress?: string;
  } = {}
): Promise<{ host: string; port: number; bytesSent: number }> {
  const host = options.host ?? getPrinterHost();
  const port = options.port ?? getPrinterPort();
  const timeoutMs = options.timeoutMs ?? getPrinterTimeoutMs();
  const data = options.data;
  const localAddress = options.localAddress ?? bindLocalAddress;

  log.info(
    `[Printer] Connecting to ${host}:${port}${localAddress ? ` via Ethernet ${localAddress}` : ""}`
  );

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    let bytesSent = 0;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.removeAllListeners();
      if (!socket.destroyed) socket.destroy();
      if (error) {
        log.error(`[Printer] Connection failed`, error.message);
        reject(error);
      } else {
        log.info(`[Printer] Socket closed after write flush (physical paper not verified)`);
        resolve({ host, port, bytesSent });
      }
    };

    const timer = setTimeout(() => {
      finish(new PrinterConnectionError("Printer connection timeout", "ETIMEDOUT"));
    }, timeoutMs);

    socket.once("error", (err) => {
      const code = "code" in err && typeof err.code === "string" ? err.code : undefined;
      log.error(`[Printer] ${code ?? "ERROR"}`, err.message);
      finish(new PrinterConnectionError(err.message || "Could not connect to printer", code));
    });

    socket.setNoDelay(true);
    socket.connect({ port, host, localAddress }, () => {
      log.info(`[Printer] Connected`);
      if (!data || data.length === 0) {
        socket.end(() => finish());
        return;
      }
      log.info(`[Printer] Sending ${data.length} bytes`);
      socket.write(data, (writeErr) => {
        if (writeErr) {
          finish(new PrinterConnectionError(writeErr.message || "Failed to send data", "EWRITE"));
          return;
        }
        bytesSent = data.length;
        log.info(`[Printer] Receipt payload flushed to socket`);
        socket.end(() => finish());
      });
    });
  });
}

export async function probePrinterConnection(): Promise<PrinterTarget & { connected: true }> {
  const { host, port } = await withPrinterSocket({ data: undefined });
  return { host, port, connected: true };
}

export async function sendRawToPrinter(
  data: Buffer
): Promise<PrinterTarget & { bytesSent: number }> {
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new PrinterConnectionError("Empty print payload", "EEMPTY");
  }
  const result = await withPrinterSocket({ data });
  return { host: result.host, port: result.port, bytesSent: result.bytesSent };
}
