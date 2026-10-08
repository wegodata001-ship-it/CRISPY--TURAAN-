import { execFileSync } from "node:child_process";
import os from "node:os";

export interface NetworkDiagnostics {
  ethernetAvailable: boolean;
  ethernetIp: string | null;
  wifiSameSubnet: boolean;
  printerIp: string;
  printerMac: string | null;
  routeConflict: boolean;
  warning: string | null;
}

const LAN_PREFIX = "192.168.1.";

export function classifyInterface(name: string): "ethernet" | "wifi" | "other" {
  const n = name.toLowerCase();
  if (/wi-?fi|wlan|wireless|wi fi/.test(n)) return "wifi";
  if (/ethernet|eth\d|local area connection/.test(n) && !/wireless/.test(n)) return "ethernet";
  return "other";
}

function ipv4s() {
  const found: Array<{ name: string; ip: string; kind: "ethernet" | "wifi" | "other" }> = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      const family = String(addr.family) === "IPv4" || String(addr.family) === "4";
      if (!family || addr.internal) continue;
      if (!addr.address.startsWith(LAN_PREFIX)) continue;
      found.push({ name, ip: addr.address, kind: classifyInterface(name) });
    }
  }
  return found;
}

function lookupArpMacs(printerIp: string): string[] {
  try {
    const out = execFileSync("arp", ["-a"], {
      encoding: "utf8",
      timeout: 4000,
      windowsHide: true,
    });
    const re = new RegExp(`${printerIp.replace(/\./g, "\\.")}\\s+([0-9a-fA-F-]{17})`, "gi");
    const macs = new Set<string>();
    for (const match of out.matchAll(re)) {
      if (match[1]) macs.add(match[1].toUpperCase());
    }
    return [...macs];
  } catch {
    return [];
  }
}

export function collectNetworkDiagnostics(printerIp: string): NetworkDiagnostics {
  const ifaces = ipv4s();
  const ethernet = ifaces.find((row) => row.kind === "ethernet") ?? ifaces.find((row) => row.kind !== "wifi");
  const wifiSameSubnet = ifaces.some((row) => row.kind === "wifi");
  const ethernetAvailable = Boolean(ethernet);
  const ethernetIp = ethernet?.ip ?? null;
  const macs = lookupArpMacs(printerIp);
  const routeConflict = wifiSameSubnet || ifaces.length > 1 || macs.length > 1;

  const warnings: string[] = [];
  if (!ethernetAvailable) warnings.push("Ethernet 192.168.1.x not detected.");
  if (wifiSameSubnet) {
    warnings.push(
      "Another 192.168.1.x interface (Wi-Fi) can route to the printer. Use Ethernet. Wi-Fi was not disabled."
    );
  }
  if (macs.length > 1) {
    warnings.push(`Multiple ARP MACs for ${printerIp}: ${macs.join(", ")}`);
  }

  return {
    ethernetAvailable,
    ethernetIp,
    wifiSameSubnet,
    printerIp,
    printerMac: macs[0] ?? null,
    routeConflict,
    warning: warnings.length ? warnings.join(" ") : null,
  };
}

export function preferredLocalAddress(diag: NetworkDiagnostics): string | undefined {
  return diag.ethernetIp || undefined;
}

export function formatStartupDiagnostics(
  diag: NetworkDiagnostics,
  tcp: "PASS" | "FAIL" | "UNKNOWN"
): string[] {
  return [
    `Ethernet available: ${diag.ethernetAvailable ? "YES" : "NO"}`,
    `Local Ethernet IP: ${diag.ethernetIp || "—"}`,
    `Printer IP: ${diag.printerIp}`,
    `Printer MAC: ${diag.printerMac || "—"}`,
    `TCP 9100: ${tcp}`,
    diag.warning ? `NETWORK WARNING: ${diag.warning}` : "Route conflict: NO",
  ];
}
