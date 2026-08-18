import { notFound } from "next/navigation";
import { PdfSmokeClient } from "./pdf-smoke-client";

export default function PdfSmokePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PdfSmokeClient />;
}
