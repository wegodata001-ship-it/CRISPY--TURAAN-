import { describe, expect, it } from "vitest";
import { crispyApkUrl, isTrustedCrispyApkUrl } from "@/lib/android-app/release";

describe("crispy apk update url", () => {
  it("trusts only the approved https path", () => {
    expect(isTrustedCrispyApkUrl(crispyApkUrl())).toBe(true);
    expect(
      isTrustedCrispyApkUrl("https://almostafachicken.com/downloads/crispy-printer/CRISPY-Printer.apk")
    ).toBe(true);
  });

  it("rejects other hosts, paths, and query strings", () => {
    expect(isTrustedCrispyApkUrl("http://almostafachicken.com/downloads/crispy-printer/CRISPY-Printer.apk")).toBe(false);
    expect(isTrustedCrispyApkUrl("https://evil.example/downloads/crispy-printer/CRISPY-Printer.apk")).toBe(false);
    expect(isTrustedCrispyApkUrl("https://portal.almostafachicken.com/downloads/crispy-printer/CRISPY-Printer.apk")).toBe(false);
    expect(isTrustedCrispyApkUrl("https://almostafachicken.com/downloads/crispy-printer/other.apk")).toBe(false);
    expect(
      isTrustedCrispyApkUrl(
        "https://almostafachicken.com/downloads/crispy-printer/CRISPY-Printer.apk?redirect=https://evil.example/a.apk"
      )
    ).toBe(false);
  });
});
