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
  DEFAULT_AI_CONFIG,
  type AiAssistantConfig,
} from "@/lib/ai/types";

const AI_DOC_ID = "ai_assistant";

function parseConfig(data: Record<string, unknown> | undefined): AiAssistantConfig {
  if (!data) return { ...DEFAULT_AI_CONFIG };
  return {
    ...DEFAULT_AI_CONFIG,
    ...(data as Partial<AiAssistantConfig>),
    welcomeMessage: {
      ...DEFAULT_AI_CONFIG.welcomeMessage,
      ...(data.welcomeMessage as AiAssistantConfig["welcomeMessage"] | undefined),
    },
    quickActions:
      (data.quickActions as AiAssistantConfig["quickActions"]) ?? DEFAULT_AI_CONFIG.quickActions,
    suggestedQuestions:
      (data.suggestedQuestions as AiAssistantConfig["suggestedQuestions"]) ??
      DEFAULT_AI_CONFIG.suggestedQuestions,
    faq: (data.faq as AiAssistantConfig["faq"]) ?? DEFAULT_AI_CONFIG.faq,
    crossSellRules:
      (data.crossSellRules as AiAssistantConfig["crossSellRules"]) ??
      DEFAULT_AI_CONFIG.crossSellRules,
    featuredProductIds:
      (data.featuredProductIds as string[]) ?? DEFAULT_AI_CONFIG.featuredProductIds,
  };
}

export async function getAiAssistantConfig(): Promise<AiAssistantConfig> {
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, COLLECTIONS.settings, AI_DOC_ID));
    if (!snap.exists()) return { ...DEFAULT_AI_CONFIG };
    return parseConfig(snap.data() as Record<string, unknown>);
  } catch (error) {
    throw new ServiceError(
      error instanceof Error ? error.message : "Failed to fetch AI config",
      "AI_CONFIG_READ_FAILED"
    );
  }
}

export function subscribeToAiAssistantConfig(
  onData: (config: AiAssistantConfig) => void,
  onError: (error: string) => void
): Unsubscribe {
  try {
    const db = getDb();
    return onSnapshot(
      doc(db, COLLECTIONS.settings, AI_DOC_ID),
      (snap) => {
        onData(parseConfig(snap.exists() ? (snap.data() as Record<string, unknown>) : undefined));
      },
      (err) => onError(err.message)
    );
  } catch (error) {
    onError(error instanceof Error ? error.message : "Failed to subscribe");
    return () => {};
  }
}

export async function updateAiAssistantConfig(
  input: Partial<AiAssistantConfig>
): Promise<ServiceResult<AiAssistantConfig>> {
  try {
    const db = getDb();
    const ref = doc(db, COLLECTIONS.settings, AI_DOC_ID);
    await setDoc(ref, { ...input, updatedAt: nowTimestamp() }, { merge: true });
    const snap = await getDoc(ref);
    return success(parseConfig(snap.data() as Record<string, unknown>));
  } catch (error) {
    return failure(error, "Failed to update AI config");
  }
}

export { DEFAULT_AI_CONFIG, AI_DOC_ID };
