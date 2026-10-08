import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { toIso, toMillis } from "@/lib/print-jobs/time";
import { AGENT_ONLINE_MS, type PrintAgentHeartbeat } from "@/lib/print-jobs/types";

function heartbeatsCol() {
  return getAdminDb().collection(COLLECTIONS.printAgentHeartbeats);
}

export async function upsertAgentHeartbeat(input: {
  agentId: string;
  hostname: string;
  version: string;
  printerConnectionStatus: PrintAgentHeartbeat["printerConnectionStatus"];
  printerIp?: string;
  printerPort?: number;
  ethernetAvailable?: boolean;
  ethernetIp?: string | null;
  wifiSameSubnet?: boolean;
  printerMac?: string | null;
  tcp9100?: PrintAgentHeartbeat["tcp9100"];
  routeConflict?: boolean;
  networkWarning?: string | null;
}): Promise<void> {
  const id = input.agentId.trim() || "default";
  await heartbeatsCol()
    .doc(id)
    .set(
      {
        agentId: id,
        hostname: input.hostname.slice(0, 120),
        version: input.version.slice(0, 40),
        lastSeenAt: FieldValue.serverTimestamp(),
        printerConnectionStatus: input.printerConnectionStatus,
        printerIp: input.printerIp ?? null,
        printerPort: input.printerPort ?? null,
        ethernetAvailable: input.ethernetAvailable ?? null,
        ethernetIp: input.ethernetIp ?? null,
        wifiSameSubnet: input.wifiSameSubnet ?? null,
        printerMac: input.printerMac ?? null,
        tcp9100: input.tcp9100 ?? null,
        routeConflict: input.routeConflict ?? null,
        networkWarning: input.networkWarning?.slice(0, 300) ?? null,
      },
      { merge: true }
    );
}

export function mapHeartbeat(
  id: string,
  data: FirebaseFirestore.DocumentData
): PrintAgentHeartbeat {
  return {
    agentId: typeof data.agentId === "string" ? data.agentId : id,
    hostname: typeof data.hostname === "string" ? data.hostname : "",
    version: typeof data.version === "string" ? data.version : "",
    lastSeenAt: toIso(data.lastSeenAt),
    printerConnectionStatus:
      data.printerConnectionStatus === "connected" ||
      data.printerConnectionStatus === "disconnected"
        ? data.printerConnectionStatus
        : "unknown",
    printerIp: typeof data.printerIp === "string" ? data.printerIp : null,
    printerPort: typeof data.printerPort === "number" ? data.printerPort : null,
    ethernetAvailable: typeof data.ethernetAvailable === "boolean" ? data.ethernetAvailable : null,
    ethernetIp: typeof data.ethernetIp === "string" ? data.ethernetIp : null,
    wifiSameSubnet: typeof data.wifiSameSubnet === "boolean" ? data.wifiSameSubnet : null,
    printerMac: typeof data.printerMac === "string" ? data.printerMac : null,
    tcp9100:
      data.tcp9100 === "PASS" || data.tcp9100 === "FAIL" || data.tcp9100 === "UNKNOWN"
        ? data.tcp9100
        : null,
    routeConflict: typeof data.routeConflict === "boolean" ? data.routeConflict : null,
    networkWarning: typeof data.networkWarning === "string" ? data.networkWarning : null,
  };
}

export async function getLatestHeartbeat(): Promise<PrintAgentHeartbeat | null> {
  try {
    const snap = await heartbeatsCol().orderBy("lastSeenAt", "desc").limit(1).get();
    const doc = snap.docs[0];
    if (!doc) return null;
    return mapHeartbeat(doc.id, doc.data());
  } catch {
    const snap = await heartbeatsCol().limit(5).get();
    const mapped = snap.docs.map((doc) => mapHeartbeat(doc.id, doc.data()));
    return (
      mapped.sort((a, b) => (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? ""))[0] ?? null
    );
  }
}

export function isAgentOnline(heartbeat: PrintAgentHeartbeat | null, now = Date.now()): boolean {
  if (!heartbeat?.lastSeenAt) return false;
  const seen = toMillis(heartbeat.lastSeenAt);
  if (seen == null) return false;
  return now - seen < AGENT_ONLINE_MS;
}
