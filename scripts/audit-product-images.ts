import { config } from "dotenv";
config({ path: ".env" });

import { getAdminDb } from "../src/lib/firebase/admin";
import { COLLECTIONS } from "../src/lib/firebase/collections";

type Probe = {
  kind: "product" | "category" | "settings";
  id: string;
  name: string;
  url: string;
  status?: number;
  ok?: boolean;
  reason?: string;
  cors?: string | null;
  doubleEncoded?: boolean;
  contentType?: string | null;
};

function isDoubleEncoded(url: string): boolean {
  return /%25[0-9A-Fa-f]{2}/.test(url);
}

function looksMalformed(url: string): boolean {
  if (!url || url === "undefined" || url === "null") return true;
  if (url.startsWith("blob:")) return true;
  try {
    const parsed = new URL(url, "http://localhost");
    return parsed.protocol !== "http:" && parsed.protocol !== "https:";
  } catch {
    return true;
  }
}

async function probeUrl(url: string): Promise<Pick<Probe, "status" | "ok" | "reason" | "cors" | "contentType">> {
  if (looksMalformed(url)) {
    return { ok: false, reason: "malformed" };
  }
  if (url.startsWith("/")) {
    return { ok: true, reason: "local-path" };
  }
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { Origin: "http://localhost:3000" },
      signal: AbortSignal.timeout(8000),
    });
    const cors = response.headers.get("access-control-allow-origin");
    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        reason: response.status === 403 ? "forbidden-or-token" : response.status === 404 ? "not-found" : `http-${response.status}`,
        cors,
        contentType,
      };
    }
    return { ok: true, status: response.status, cors, contentType };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "fetch-failed" };
  }
}

async function main() {
  const db = getAdminDb();
  const probes: Probe[] = [];

  const products = await db.collection(COLLECTIONS.products).get();
  console.log("products total", products.size);
  let withImage = 0;
  for (const doc of products.docs) {
    const data = doc.data();
    const url = typeof data.image === "string" ? data.image : typeof data.imageUrl === "string" ? data.imageUrl : "";
    if (!url) continue;
    withImage += 1;
    probes.push({
      kind: "product",
      id: doc.id,
      name: data.name_ar || data.name_he || data.name_en || doc.id,
      url,
      doubleEncoded: isDoubleEncoded(url),
    });
  }
  console.log("products with image field", withImage);
  if (products.size && withImage === 0) {
    const sample = products.docs[0]?.data() ?? {};
    console.log("sample product keys", Object.keys(sample));
    console.log("sample image value", sample.image, sample.imageUrl, sample.photo);
  }

  const categories = await db.collection(COLLECTIONS.categories).get();
  for (const doc of categories.docs) {
    const data = doc.data();
    const url = typeof data.image === "string" ? data.image : "";
    if (!url) continue;
    probes.push({
      kind: "category",
      id: doc.id,
      name: data.name_ar || data.name_he || data.name_en || doc.id,
      url,
      doubleEncoded: isDoubleEncoded(url),
    });
  }

  const settings = await db.collection(COLLECTIONS.settings).doc("app").get();
  if (settings.exists) {
    const data = settings.data() ?? {};
    for (const key of ["logoUrl", "storeImageUrl"] as const) {
      const url = typeof data[key] === "string" ? data[key] : "";
      if (!url) continue;
      probes.push({
        kind: "settings",
        id: key,
        name: key,
        url,
        doubleEncoded: isDoubleEncoded(url),
      });
    }
  }

  const unique = [...new Map(probes.map((p) => [p.url, p])).values()];
  console.log(`Checking ${unique.length} unique image URLs (${probes.length} refs)...`);

  for (const item of unique) {
    const result = await probeUrl(item.url);
    Object.assign(item, result);
    const flag = item.ok ? "OK" : "FAIL";
    console.log(
      `[${flag}] ${item.kind} ${item.name} status=${item.status ?? "-"} cors=${item.cors ?? "none"} reason=${item.reason ?? "ok"} doubleEncoded=${Boolean(item.doubleEncoded)}`
    );
    console.log(`  ${item.url.slice(0, 140)}`);
  }

  const failed = unique.filter((p) => !p.ok);
  const corsMissing = unique.filter((p) => p.ok && p.status && !p.cors);
  const doubleEncoded = unique.filter((p) => p.doubleEncoded);

  console.log("\nSUMMARY");
  console.log("total unique", unique.length);
  console.log("ok", unique.filter((p) => p.ok).length);
  console.log("failed", failed.length);
  console.log("ok but no CORS header", corsMissing.length);
  console.log("double encoded", doubleEncoded.length);
  if (failed.length) {
    console.log("failed reasons", Object.fromEntries(
      Object.entries(
        failed.reduce<Record<string, number>>((acc, item) => {
          acc[item.reason ?? "unknown"] = (acc[item.reason ?? "unknown"] ?? 0) + 1;
          return acc;
        }, {})
      )
    ));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
