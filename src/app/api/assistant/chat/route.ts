import { NextResponse } from "next/server";
import { z } from "zod";
import { LOCALES } from "@/lib/i18n/types";
import { loadAssistantContext } from "@/lib/assistant/server-data";
import { processMessage, processQuickAction } from "@/lib/assistant/engine";

const bodySchema = z.object({
  message: z.string().max(500).optional().default(""),
  locale: z.enum(LOCALES),
  cartProductIds: z.array(z.string()).optional(),
  cartItems: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().min(1) }))
    .optional(),
  productId: z.string().optional(),
  quickActionId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const ctx = await loadAssistantContext(body.locale);

    if (!ctx.config.enabled) {
      return NextResponse.json(
        {
          message:
            body.locale === "he"
              ? "העוזר אינו פעיל כרגע."
              : body.locale === "ar"
                ? "المساعد غير متاح حالياً."
                : "Assistant is currently disabled.",
          products: [],
          suggestions: [],
        },
        { status: 503 }
      );
    }

    const req = {
      message: body.message,
      locale: body.locale,
      cartProductIds: body.cartProductIds,
      cartItems: body.cartItems,
      productId: body.productId,
      quickActionId: body.quickActionId,
    };

    const response = body.quickActionId
      ? processQuickAction(body.quickActionId, ctx, req)
      : processMessage(req, ctx);

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Assistant request failed";
    console.error("[CHATBOT_API_ERROR]", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
