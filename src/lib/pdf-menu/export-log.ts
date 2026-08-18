export function logPdfStage(stage: string, extra?: Record<string, unknown>): void {
  console.info("[PDF_EXPORT]", stage, extra ?? {});
}

export function logPdfExportFailure(error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[PDF_EXPORT_FAILED]", {
    error,
    message: err.message,
    stack: err.stack,
  });
}
