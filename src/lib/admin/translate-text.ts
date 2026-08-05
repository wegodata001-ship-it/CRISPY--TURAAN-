export type TranslateTarget = "ar" | "en";

export async function translateFromHebrew(
  text: string,
  target: TranslateTarget
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!text.trim()) {
    return { ok: false, error: "empty" };
  }

  try {
    const res = await fetch("/api/admin/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target }),
    });

    const data = (await res.json()) as { translated?: string; error?: string };
    if (!res.ok || !data.translated) {
      return { ok: false, error: data.error ?? "failed" };
    }
    return { ok: true, text: data.translated };
  } catch {
    return { ok: false, error: "network" };
  }
}

export async function translateProductFields(sourceHe: string): Promise<{
  ar: string | null;
  en: string | null;
  errors: string[];
}> {
  const [arResult, enResult] = await Promise.all([
    translateFromHebrew(sourceHe, "ar"),
    translateFromHebrew(sourceHe, "en"),
  ]);

  const errors: string[] = [];
  if (!arResult.ok) errors.push("ar");
  if (!enResult.ok) errors.push("en");

  return {
    ar: arResult.ok ? arResult.text : null,
    en: enResult.ok ? enResult.text : null,
    errors,
  };
}
