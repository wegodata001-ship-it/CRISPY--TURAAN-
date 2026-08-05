import { Timestamp } from "firebase/firestore";

/** Firestore-native values that must pass through unchanged */
function isFirestoreLeaf(value: unknown): boolean {
  return (
    value instanceof Timestamp ||
    value instanceof Date ||
    value === null ||
    typeof value !== "object"
  );
}

/**
 * Recursively removes `undefined` from objects and arrays before Firestore writes.
 * Arrays drop undefined elements; nested objects omit undefined keys entirely.
 */
export function sanitizeFirestoreData<T>(data: T): T {
  if (data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestoreData(item)) as T;
  }

  if (isFirestoreLeaf(data)) {
    return data;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value === undefined) continue;
    result[key] = sanitizeFirestoreData(value);
  }
  return result as T;
}

/** Debug helper — lists dot-paths of undefined values in an object tree */
export function findUndefinedPaths(value: unknown, path = ""): string[] {
  if (value === undefined) {
    return path ? [path] : ["(root)"];
  }
  if (value === null || typeof value !== "object" || value instanceof Timestamp || value instanceof Date) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => findUndefinedPaths(item, path ? `${path}[${i}]` : `[${i}]`));
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, v]) => {
    const next = path ? `${path}.${key}` : key;
    return findUndefinedPaths(v, next);
  });
}
