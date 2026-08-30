/**
 * Safe Brevo test email sender for MISHKAH CAFE.
 * Usage: npm run email:test
 *
 * Never prints BREVO_API_KEY or other secrets.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { assertBrevoReady, getBrevoConfig, getMishkahNotificationEmails } =
    await import("../src/lib/email/config");
  const { sendMishkahTestEmail } = await import("../src/lib/email/send");

  const ready = assertBrevoReady();
  const cfg = getBrevoConfig();
  const recipients = getMishkahNotificationEmails().recipients;

  console.log("=== MISHKAH CAFE — Brevo email test ===");
  console.log(`MAIL_PROVIDER: ${process.env.MAIL_PROVIDER ?? "(unset)"}`);
  console.log(`Sender name: ${cfg.senderName}`);
  console.log(`Sender email: ${cfg.senderEmail || "(missing)"}`);
  console.log(`Reply-To: ${cfg.replyTo || "(none)"}`);
  console.log(`BREVO_API_KEY: ${cfg.apiKey ? "SET" : "MISSING"}`);
  console.log(`Recipients: ${recipients.join(", ")}`);

  if (!ready.ok) {
    console.error(`CONFIG FAILED: ${ready.error}`);
    process.exitCode = 1;
    return;
  }

  let anyMessageId = false;
  const results: Array<{
    to: string;
    ok: boolean;
    statusCode?: number;
    messageId?: string;
    error?: string;
  }> = [];

  for (const to of recipients) {
    const result = await sendMishkahTestEmail(to);
    if (result.ok) {
      anyMessageId = anyMessageId || Boolean(result.messageId);
      results.push({
        to,
        ok: true,
        statusCode: result.statusCode,
        messageId: result.messageId,
      });
      console.log(
        `SENT -> ${to} | HTTP ${result.statusCode} | messageId=${result.messageId ? "YES" : "NO"} | sender accepted`
      );
    } else {
      results.push({
        to,
        ok: false,
        statusCode: result.statusCode,
        error: result.error,
      });
      console.error(
        `FAILED -> ${to} | HTTP ${result.statusCode ?? "n/a"} | ${result.error}`
      );
    }
  }

  const allOk = results.every((r) => r.ok);
  console.log(`Brevo messageId present: ${anyMessageId ? "YES" : "NO"}`);
  console.log(allOk ? "RESULT: PASS" : "RESULT: FAIL");
  process.exitCode = allOk ? 0 : 1;
}

main().catch((error) => {
  console.error(
    "FATAL:",
    error instanceof Error ? error.message : "unknown error"
  );
  process.exitCode = 1;
});
