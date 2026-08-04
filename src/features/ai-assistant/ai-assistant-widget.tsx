"use client";

import { AiAssistantProvider } from "@/features/ai-assistant/ai-assistant-context";
import { AiAssistantDrawer } from "@/features/ai-assistant/ai-assistant-drawer";
import { AiAssistantFab } from "@/features/ai-assistant/ai-assistant-fab";

export function AiAssistantWidget() {
  return (
    <AiAssistantProvider>
      <AiAssistantFab />
      <AiAssistantDrawer />
    </AiAssistantProvider>
  );
}
