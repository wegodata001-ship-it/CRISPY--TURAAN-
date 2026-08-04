"use client";

import { AssistantProvider } from "@/features/assistant/assistant-context";
import { AssistantDrawer } from "@/features/assistant/assistant-drawer";
import { AssistantFab } from "@/features/assistant/assistant-fab";

export function AssistantWidget() {
  return (
    <AssistantProvider>
      <AssistantFab />
      <AssistantDrawer />
    </AssistantProvider>
  );
}
