export type PrintFailureDisposition = "retry_offline" | "partial_send" | "retry_limited";

/**
 * Connect failures stay in the queue.
 * A socket that dies after bytes were written is not auto-printed again.
 */
export function classifyPrintFailure(message: string): PrintFailureDisposition {
  const text = message.toLowerCase();
  if (text.includes("printer_partial")) return "partial_send";
  if (text.includes("printer_connect")) return "retry_offline";
  if (
    /econnreset|epipe|broken pipe|connection reset|connection aborted|software caused connection abort/.test(
      text
    )
  ) {
    return "partial_send";
  }
  if (
    /timeout|timed out|etimedout|econnrefused|ehostunreach|enetunreach|enetdown|connection refused|failed to connect|connection failed|printer connection|network is unreachable|no route to host|host is unreachable/.test(
      text
    )
  ) {
    return "retry_offline";
  }
  return "retry_limited";
}
