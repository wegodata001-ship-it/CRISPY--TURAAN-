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

  it("manifest defines standalone app name", () => {
    expect(PWA_APP_NAME).toBe("CRISPY");
    const manifestSource = readFileSync(
      resolve(process.cwd(), "src/app/manifest.ts"),
      "utf8"
    );
    expect(manifestSource).toMatch(/name: PWA_APP_NAME/);
    expect(manifestSource).toMatch(/display: "standalone"/);
    expect(manifestSource).toMatch(/start_url: PWA_START_URL/);
  });

  it("layout registers PWA manager without changing admin routes", () => {
    const layout = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");
    const metadata = readFileSync(resolve(process.cwd(), "src/lib/domains/surface-metadata.ts"), "utf8");
    expect(layout).toMatch(/PwaManager/);
    expect(layout).toMatch(/getSurfaceMetadata/);
    expect(metadata).toMatch(/appleWebApp/);
  });
});
