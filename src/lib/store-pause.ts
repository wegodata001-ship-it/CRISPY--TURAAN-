import type { Locale } from "@/lib/i18n/types";

export const DEFAULT_PAUSE_REASON = "עומס במסעדה";

export const PAUSE_COPY: Record<
  Locale,
  { title: string; body: string }
> = {
  he: {
    title: "המטבח מלא כרגע",
    body: "יש עומס במסעדה, והצוות עסוק בהזמנות שכבר נכנסו. נפתח שוב להזמנות חדשות ברגע שנתפנה. תודה על הסבלנות — שווה לחכות.",
  },
  ar: {
    title: "المطبخ ممتلئ الآن",
    body: "المطعم مشغول حالياً، والفريق يعمل على الطلبات الموجودة. سنفتح الطلبات الجديدة فور ما يخف الضغط. شكراً لصبركم.",
  },
  en: {
    title: "The kitchen is full right now",
    body: "The restaurant is busy, and the team is finishing the orders already in. New orders will open again as soon as things calm down. Thank you for waiting.",
  },
};
