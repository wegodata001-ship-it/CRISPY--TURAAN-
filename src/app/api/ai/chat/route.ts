import { NextResponse } from "next/server";
import { z } from "zod";
import { LOCALES } from "@/lib/i18n/types";
import { loadAiMenuContext } from "@/lib/ai/server-data";
import { processAiMessage, processQuickAction } from "@/lib/ai/menu-engine";

const bodySchema = z.object({
  message: z.string().max(500).optional().default(""),
  locale: z.enum(LOCALES),
  cartProductIds: z.array(z.string()).optional(),
  lastAddedCategoryId: z.string().optional(),
  quickActionId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const ctx = await loadAiMenuContext(body.locale);

    if (!ctx.config.enabled) {
      return NextResponse.json(
        { message: "AI Assistant is currently disabled.", products: [], suggestions: [], showHandoff: true },
        { status: 503 }
      );
    }

    const response = body.quickActionId
      ? processQuickAction(body.quickActionId, ctx, { cartProductIds: body.cartProductIds })
      : processAiMessage(
          {
            message: body.message,
            locale: body.locale,
            cartProductIds: body.cartProductIds,
            lastAddedCategoryId: body.lastAddedCategoryId,
          },
          ctx
        );

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
