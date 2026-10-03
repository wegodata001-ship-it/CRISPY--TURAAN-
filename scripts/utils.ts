import { setLogLevel } from "firebase/app";

setLogLevel("silent");

export function silenceFirebaseLogs() {
  setLogLevel("silent");
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export function isFirestoreDisabledError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("PERMISSION_DENIED") ||
    message.includes("has not been used") ||
    message.includes("Cloud Firestore API")
  );
}

const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";

export const FIRESTORE_ENABLE_URL =
  `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${firebaseProjectId}`;

export const FIREBASE_CONSOLE_URL =
  `https://console.firebase.google.com/project/${firebaseProjectId}/firestore`;
