import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { agentHome } from "./env";

const SENSITIVE = /PRINT_AGENT_TOKEN|Bearer\s+[A-Za-z0-9._~+/-]+=*|FIREBASE_ADMIN|PRIVATE_KEY/gi;

function redact(value: string): string {
  return value.replace(SENSITIVE, "[redacted]");
}

function stamp(): string {
  return new Date().toISOString();
}

function write(level: string, args: unknown[]): void {
  const message = args
    .map((arg) => (typeof arg === "string" ? arg : arg instanceof Error ? arg.message : JSON.stringify(arg)))
    .join(" ");
  const line = `${stamp()} [${level}] ${redact(message)}`;
  console.log(line);
  try {
    const dir = resolve(agentHome(), "logs");
    mkdirSync(dir, { recursive: true });
    appendFileSync(resolve(dir, "print-agent.log"), `${line}\n`, "utf8");
  } catch {
    // never crash the agent because of logging
  }
}

export const log = {
  info: (...args: unknown[]) => write("INFO", args),
  error: (...args: unknown[]) => write("ERROR", args),
};
