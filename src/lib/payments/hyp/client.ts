import type { HypClientConfig, HypHttpGet } from "./types";
import { redactSecretsFromUrl } from "./query";

const defaultHttpGet: HypHttpGet = async (url) => {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
  });
  const text = await response.text();
  return { ok: response.ok, text, status: response.status };
};

/**
 * Low-level Hyp Pay HTTP helper. Call only from server code.
 * When `enabled` is false, refuses to hit the network.
 */
export function createHypClient(config: HypClientConfig) {
  const httpGet = config.httpGet ?? defaultHttpGet;

  async function get(pathQuery: string): Promise<{ ok: boolean; text: string; status: number }> {
    if (!config.enabled) {
      return { ok: false, text: "CCode=DISABLED", status: 0 };
    }
    if (!config.masof || !config.key || !config.passp) {
      return { ok: false, text: "CCode=NOT_CONFIGURED", status: 0 };
    }
    const base = config.baseUrl.replace(/\/$/, "");
    const url = pathQuery.startsWith("http")
      ? pathQuery
      : `${base}/?${pathQuery.replace(/^\?/, "")}`;
    try {
      return await httpGet(url);
    } catch {
      return { ok: false, text: "CCode=NETWORK", status: 0 };
    }
  }

  return {
    config,
    get,
    /** Safe URL string for diagnostics — secrets stripped. */
    redact(url: string): string {
      return redactSecretsFromUrl(url);
    },
  };
}

export type HypClient = ReturnType<typeof createHypClient>;
