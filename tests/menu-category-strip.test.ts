import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("menu category strip mobile UX", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/features/catalog/menu-category-strip.tsx"),
    "utf8"
  );

  it("does not use horizontal overflow scroll on compact layout", () => {
    expect(source).not.toMatch(/overflow-x-auto/);
    expect(source).not.toMatch(/snap-x/);
    expect(source).toMatch(/grid-cols-2/);
    expect(source).toMatch(/catalog\.showAll/);
    expect(source).toMatch(/catalog\.showLess/);
  });

  it("keeps desktop wrap path and avoids LTR direction hacks", () => {
    expect(source).toMatch(/flex-wrap/);
    expect(source).not.toMatch(/direction:\s*ltr/);
    expect(source).not.toMatch(/dir=["']ltr["']/);
  });
});
