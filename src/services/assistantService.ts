import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { nowTimestamp } from "@/types/firestore";
import { ServiceError, type ServiceResult, success, failure } from "@/lib/errors";
import {
  ASSISTANT_DOC_ID,
  DEFAULT_ASSISTANT_CONFIG,
  type AssistantConfig,
} from "@/lib/assistant/types";
import { parseAssistantConfig } from "@/lib/assistant/parse-config";

export async function getAssistantConfig(): Promise<AssistantConfig> {
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, COLLECTIONS.assistant, ASSISTANT_DOC_ID));
    if (!snap.exists()) return { ...DEFAULT_ASSISTANT_CONFIG };
    return parseAssistantConfig(snap.data() as Record<string, unknown>);
  } catch (error) {
    throw new ServiceError(
      error instanceof Error ? error.message : "Failed to fetch assistant config",
      "ASSISTANT_CONFIG_READ_FAILED"
    );
  }
}

export function subscribeToAssistantConfig(
  onData: (config: AssistantConfig) => void,
  onError: (error: string) => void
): Unsubscribe {
  try {
    const db = getDb();
    return onSnapshot(
      doc(db, COLLECTIONS.assistant, ASSISTANT_DOC_ID),
      (snap) => {
        onData(parseAssistantConfig(snap.exists() ? (snap.data() as Record<string, unknown>) : undefined));
      },
      (err) => onError(err.message)
    );
  } catch (error) {
    onError(error instanceof Error ? error.message : "Failed to subscribe");
    return () => {};
  }
}

export async function updateAssistantConfig(
  input: Partial<AssistantConfig>
): Promise<ServiceResult<AssistantConfig>> {
  try {
    const db = getDb();
    const ref = doc(db, COLLECTIONS.assistant, ASSISTANT_DOC_ID);
    await setDoc(ref, { ...input, updatedAt: nowTimestamp() }, { merge: true });
    const snap = await getDoc(ref);
    return success(parseAssistantConfig(snap.data() as Record<string, unknown>));
  } catch (error) {
    return failure(error, "Failed to update assistant config");
  }
}

export { DEFAULT_ASSISTANT_CONFIG, ASSISTANT_DOC_ID };
