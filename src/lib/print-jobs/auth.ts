import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function getConfiguredPrintAgentToken(): string {
  return process.env.PRINT_AGENT_TOKEN?.trim() || "";
}

export function isValidPrintAgentToken(provided: string | null | undefined): boolean {
  const expected = getConfiguredPrintAgentToken();
  if (!expected || !provided) return false;
  return timingSafeEqual(sha256(provided), sha256(expected));
}

export function readPrintAgentToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  const custom = request.headers.get("x-print-agent-token")?.trim();
  return custom || null;
}

export function requirePrintAgent(request: NextRequest): true | Response {
  if (!getConfiguredPrintAgentToken()) {
    return Response.json(
      { error: "Print agent is not configured (PRINT_AGENT_TOKEN missing)" },
      { status: 503 }
    );
  }
  if (!isValidPrintAgentToken(readPrintAgentToken(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return true;
}
