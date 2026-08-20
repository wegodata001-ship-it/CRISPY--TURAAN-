import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("mobile bottom nav stability", () => {
  it("uses fixed CSS positioning with safe-area and no scroll tracking", () => {
    const nav = readFileSync(resolve(process.cwd(), "src/components/layout/bottom-nav.tsx"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    const layout = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");

    expect(css).toMatch(/--mobile-bottom-nav-height:\s*64px/);
    expect(css).toMatch(/\.mobile-bottom-nav\s*\{/);
    expect(css).toMatch(/position:\s*fixed/);
    expect(css).toMatch(/padding-bottom:\s*env\(safe-area-inset-bottom/);
    expect(css).toMatch(/min-height:\s*100dvh/);

    expect(nav).toMatch(/createPortal/);
    expect(nav).toMatch(/mobile-bottom-nav/);
    expect(nav).not.toMatch(/layoutId/);
    expect(nav).not.toMatch(/framer-motion/);
    expect(nav).not.toMatch(/addEventListener\(\s*["']scroll["']/);
    expect(nav).not.toMatch(/visualViewport|scrollY|innerHeight/);
    expect(nav).not.toMatch(/translateY/);

    expect(layout).toMatch(/viewportFit:\s*"cover"/);
    expect(layout).toMatch(/--mobile-bottom-nav-height/);
    expect(layout).toMatch(/ClientSiteFooter/);
  });
});
