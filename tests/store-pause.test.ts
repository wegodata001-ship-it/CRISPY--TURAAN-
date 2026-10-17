import { describe, expect, it } from "vitest";
import { DEFAULT_PAUSE_REASON, PAUSE_COPY } from "@/lib/store-pause";

describe("store pause copy", () => {
  it("has a short reason and a message in each language", () => {
    expect(DEFAULT_PAUSE_REASON).toBe("עומס במסעדה");
    for (const locale of ["he", "ar", "en"] as const) {
      expect(PAUSE_COPY[locale].title.length).toBeGreaterThan(4);
      expect(PAUSE_COPY[locale].body.length).toBeGreaterThan(20);
    }
  });
});
