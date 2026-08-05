"use client";

import { usePathname } from "next/navigation";
import { AssistantProvider } from "@/features/assistant/assistant-context";
import { AssistantDrawer } from "@/features/assistant/assistant-drawer";
import { AssistantFab } from "@/features/assistant/assistant-fab";

export function AssistantWidget() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <AssistantProvider>
      <AssistantFab />
      <AssistantDrawer />
    </AssistantProvider>
  );
}
