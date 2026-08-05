import { NextResponse } from "next/server";

type TargetLang = "ar" | "en";

const LANGPAIR: Record<TargetLang, string> = {
  ar: "he|ar",
  en: "he|en",
};

async function translateViaMyMemory(text: string, target: TargetLang): Promise<string | null> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.slice(0, 500));
  url.searchParams.set("langpair", LANGPAIR[target]);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number;
  };

  if (data.responseStatus !== 200) return null;
  const translated = data.responseData?.translatedText?.trim();
  if (!translated || translated.toUpperCase() === text.toUpperCase()) return null;
  return translated;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; target?: TargetLang };
    const text = body.text?.trim();
    const target = body.target;

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }
    if (target !== "ar" && target !== "en") {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    const translated = await translateViaMyMemory(text, target);
    if (!translated) {
      return NextResponse.json({ error: "Translation failed" }, { status: 502 });
    }

    return NextResponse.json({ translated });
  } catch {
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
