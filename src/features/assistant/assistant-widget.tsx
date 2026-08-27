"use client";

import { useHideCustomerChrome } from "@/hooks/useAdminPath";
import { AssistantProvider } from "@/features/assistant/assistant-context";
import { AssistantDrawer } from "@/features/assistant/assistant-drawer";
import { AssistantFab } from "@/features/assistant/assistant-fab";

export function AssistantWidget() {
  const hideChrome = useHideCustomerChrome();
  if (hideChrome) return null;

  return (
    <AssistantProvider>
      <AssistantFab />
      <AssistantDrawer />
    </AssistantProvider>
  );
}
