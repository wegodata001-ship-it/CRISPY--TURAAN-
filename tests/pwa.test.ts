import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PWA_APP_NAME,
  PWA_START_URL,
  PWA_SW_VERSION,
} from "@/lib/pwa/config";

describe("PWA setup", () => {
  it("uses customer menu as start URL", () => {
    expect(PWA_START_URL).toBe("/");
  });

  it("service worker does not cache API routes", () => {
    const sw = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
    expect(sw).toMatch(/isApiRequest/);
    expect(sw).toMatch(/if \(isApiRequest\(url\)\) return/);
    expect(sw).toMatch(PWA_SW_VERSION);
  });

  it("manifest defines standalone app name", async () => {
    const manifest = (await import("@/app/manifest")).default();
    expect(manifest.name).toBe(PWA_APP_NAME);
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
  });

  it("layout registers PWA manager without changing admin routes", () => {
    const layout = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).toMatch(/PwaManager/);
    expect(layout).toMatch(/appleWebApp/);
  });
});
