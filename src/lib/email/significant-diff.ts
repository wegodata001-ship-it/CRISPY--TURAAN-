import type { Order, OrderItem } from "@/types";

export type OrderChange = {
  label: string;
  before: string;
  after: string;
};

function itemSignature(item: OrderItem): string {
  const mods = (item.modifiers ?? [])
    .map((m) => `${m.optionName}×${m.quantity}`)
    .sort()
    .join("|");
  const notes = [item.notes, ...(item.kitchenNotes ?? [])].filter(Boolean).join("|");
  return `${item.productId}:${item.productName}:${item.quantity}:${item.price}:${mods}:${notes}`;
}

function formatItems(items: OrderItem[]): string {
  return items
    .map((item) => {
      const mods = (item.modifiers ?? []).map((m) => m.optionName).join(", ");
      return `${item.quantity}× ${item.productName}${mods ? ` (${mods})` : ""}`;
    })
    .join(" · ");
}

/** Portable fingerprint — safe for browser + Node (no secrets). */
export function fingerprintString(raw: string): string {
  let hash = 5381;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  let hash2 = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash2 = (hash2 << 5) - hash2 + raw.charCodeAt(i);
    hash2 |= 0;
  }
  return `${(hash >>> 0).toString(16)}${(hash2 >>> 0).toString(16)}`.slice(0, 24);
}

/** Business-significant fields only — ignore status transitions like preparing/ready. */
export function computeSignificantOrderChanges(
  before: Order,
  after: Order
): OrderChange[] {
  const changes: OrderChange[] = [];

  if (before.customerName !== after.customerName) {
    changes.push({
      label: "שם לקוח",
      before: before.customerName || "—",
      after: after.customerName || "—",
    });
  }
  if ((before.customerPhone ?? "") !== (after.customerPhone ?? "")) {
    changes.push({
      label: "טלפון",
      before: before.customerPhone || "—",
      after: after.customerPhone || "—",
    });
  }
  if ((before.notes ?? "").trim() !== (after.notes ?? "").trim()) {
    changes.push({
      label: "הערת הזמנה",
      before: before.notes?.trim() || "—",
      after: after.notes?.trim() || "—",
    });
  }
  if (Number(before.total) !== Number(after.total)) {
    changes.push({
      label: "סה״כ",
      before: `₪${Number(before.total).toFixed(2)}`,
      after: `₪${Number(after.total).toFixed(2)}`,
    });
  }
  if ((before.paymentMethod ?? "") !== (after.paymentMethod ?? "")) {
    changes.push({
      label: "אמצעי תשלום",
      before: before.paymentMethod || "—",
      after: after.paymentMethod || "—",
    });
  }
  if ((before.orderType ?? "") !== (after.orderType ?? "")) {
    changes.push({
      label: "סוג הזמנה",
      before: before.orderType || "—",
      after: after.orderType || "—",
    });
  }

  const beforeSig = before.items.map(itemSignature).sort().join("\n");
  const afterSig = after.items.map(itemSignature).sort().join("\n");
  if (beforeSig !== afterSig) {
    const beforeByKey = new Map(
      before.items.map((item) => [`${item.productId}:${item.productName}`, item])
    );
    const afterByKey = new Map(
      after.items.map((item) => [`${item.productId}:${item.productName}`, item])
    );
    const keys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);
    let detailed = false;
    for (const key of keys) {
      const b = beforeByKey.get(key);
      const a = afterByKey.get(key);
      if (!b && a) {
        detailed = true;
        changes.push({
          label: `נוסף: ${a.productName}`,
          before: "—",
          after: `${a.quantity}×`,
        });
        continue;
      }
      if (b && !a) {
        detailed = true;
        changes.push({
          label: `הוסר: ${b.productName}`,
          before: `${b.quantity}×`,
          after: "—",
        });
        continue;
      }
      if (b && a && itemSignature(b) !== itemSignature(a)) {
        detailed = true;
        if (b.quantity !== a.quantity) {
          changes.push({
            label: `כמות ${a.productName}`,
            before: String(b.quantity),
            after: String(a.quantity),
          });
        }
        const bMods = (b.modifiers ?? []).map((m) => m.optionName).join(", ") || "—";
        const aMods = (a.modifiers ?? []).map((m) => m.optionName).join(", ") || "—";
        if (bMods !== aMods) {
          changes.push({
            label: `תוספות ${a.productName}`,
            before: bMods,
            after: aMods,
          });
        }
        const bNotes = [b.notes, ...(b.kitchenNotes ?? [])].filter(Boolean).join(", ") || "—";
        const aNotes = [a.notes, ...(a.kitchenNotes ?? [])].filter(Boolean).join(", ") || "—";
        if (bNotes !== aNotes) {
          changes.push({
            label: `הערה ${a.productName}`,
            before: bNotes,
            after: aNotes,
          });
        }
      }
    }

    if (!detailed) {
      changes.push({
        label: "פריטי הזמנה",
        before: formatItems(before.items) || "—",
        after: formatItems(after.items) || "—",
      });
    }
  }

  return changes;
}

export function fingerprintChanges(changes: OrderChange[]): string {
  return fingerprintString(JSON.stringify(changes));
}

export function fingerprintCritical(input: {
  message: string;
  code?: string;
}): string {
  return fingerprintString(`${input.code ?? ""}|${input.message}`);
}
