import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { adminPathFromHost } from "@/lib/domains/host-routing";

export default async function LegacyAiAssistantPage() {
  const host = (await headers()).get("host");
  redirect(adminPathFromHost("assistant", host));
}
