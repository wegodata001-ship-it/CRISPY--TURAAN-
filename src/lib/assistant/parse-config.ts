import {
  DEFAULT_ASSISTANT_CONFIG,
  type AssistantConfig,
} from "@/lib/assistant/types";

export function parseAssistantConfig(
  data: Record<string, unknown> | undefined
): AssistantConfig {
  if (!data) return { ...DEFAULT_ASSISTANT_CONFIG };

  const greeting =
    (data.greeting as AssistantConfig["greeting"]) ??
    (data.welcomeMessage as AssistantConfig["greeting"]) ??
    DEFAULT_ASSISTANT_CONFIG.greeting;

  const rawActions =
    (data.quickActions as AssistantConfig["quickActions"]) ??
    DEFAULT_ASSISTANT_CONFIG.quickActions;

  return {
    ...DEFAULT_ASSISTANT_CONFIG,
    ...(data as Partial<AssistantConfig>),
    greeting,
    quickActions: rawActions.map((a, i) => ({
      ...a,
      enabled: a.enabled ?? true,
      sortOrder: a.sortOrder ?? i,
    })),
    suggestedQuestions:
      (data.suggestedQuestions as AssistantConfig["suggestedQuestions"]) ??
      DEFAULT_ASSISTANT_CONFIG.suggestedQuestions,
    faq: ((data.faq as AssistantConfig["faq"]) ?? []).map((f, i) => ({
      ...f,
      enabled: f.enabled ?? true,
      sortOrder: f.sortOrder ?? i,
    })),
    featuredProductIds:
      (data.featuredProductIds as string[]) ??
      DEFAULT_ASSISTANT_CONFIG.featuredProductIds,
    links: (data.links as AssistantConfig["links"]) ?? DEFAULT_ASSISTANT_CONFIG.links,
  };
}
