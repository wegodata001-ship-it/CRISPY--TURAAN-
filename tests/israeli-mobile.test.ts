import { describe, expect, it } from "vitest";
import { invalidPhoneMessage, parseIsraeliMobile } from "@/lib/phone/israeli-mobile";

describe("israeli mobile validation", () => {
  it("normalizes common Israeli formats", () => {
    expect(parseIsraeliMobile("050-123-4567")?.local).toBe("0501234567");
    expect(parseIsraeliMobile("972501234567")?.e164).toBe("+972501234567");
  });

  it("rejects invalid numbers", () => {
    expect(parseIsraeliMobile("0401234567")).toBeNull();
    expect(parseIsraeliMobile("")).toBeNull();
  });

  it("returns localized invalid-phone copy", () => {
    expect(invalidPhoneMessage("ar")).toContain("05XXXXXXXX");
    expect(invalidPhoneMessage("he")).toContain("05XXXXXXXX");
    expect(invalidPhoneMessage("en")).toContain("05XXXXXXXX");
  });
});
