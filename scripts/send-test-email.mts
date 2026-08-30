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

  const results: Array<{ to: string; ok: boolean; error?: string }> = [];

  for (const to of recipients) {
    const result = await sendMishkahTestEmail(to);
    results.push({
      to,
      ok: result.ok,
      error: result.ok ? undefined : result.error,
    });
    if (result.ok) {
      console.log(`SENT -> ${to}${result.messageId ? ` (id: ${result.messageId})` : ""}`);
    } else {
      console.error(`FAILED -> ${to}: ${result.error}`);
    }
  }

  const allOk = results.every((r) => r.ok);
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
