const THRESHOLD_MS = 1000;

export interface PerfMetric {
  label: string;
  durationMs: number;
  slow: boolean;
}

const metrics: PerfMetric[] = [];

export function markStart(label: string): () => void {
  const start = performance.now();
  return () => {
    const durationMs = Math.round(performance.now() - start);
    const entry: PerfMetric = { label, durationMs, slow: durationMs > THRESHOLD_MS };
    metrics.push(entry);
    if (process.env.NODE_ENV === "development" && entry.slow) {
      // eslint-disable-next-line no-console
      console.warn(`[perf] ${label} took ${durationMs}ms (> ${THRESHOLD_MS}ms)`);
    }
  };
}

export async function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const end = markStart(label);
  try {
    return await fn();
  } finally {
    end();
  }
}

export function getPerfMetrics(): PerfMetric[] {
  return [...metrics];
}

export function clearPerfMetrics(): void {
  metrics.length = 0;
}
