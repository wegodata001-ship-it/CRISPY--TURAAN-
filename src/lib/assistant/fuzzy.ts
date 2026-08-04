/** Normalize text for fuzzy matching across he/ar/en */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }
  return dp[m]![n]!;
}

export function fuzzyScore(query: string, target: string): number {
  const q = normalizeText(query);
  const t = normalizeText(target);
  if (!q || !t) return 0;
  if (t.includes(q)) return 1;
  if (q.includes(t)) return 0.85;

  const qTokens = q.split(" ").filter(Boolean);
  let tokenScore = 0;
  for (const token of qTokens) {
    if (token.length < 2) continue;
    if (t.includes(token)) {
      tokenScore += 0.4;
      continue;
    }
    const tTokens = t.split(" ").filter(Boolean);
    for (const tt of tTokens) {
      if (tt.includes(token) || token.includes(tt)) {
        tokenScore += 0.35;
        break;
      }
      const maxLen = Math.max(token.length, tt.length);
      if (maxLen <= 12) {
        const dist = levenshtein(token, tt);
        if (dist <= Math.floor(maxLen * 0.35)) {
          tokenScore += 0.3 * (1 - dist / maxLen);
        }
      }
    }
  }
  if (tokenScore > 0) return Math.min(tokenScore, 0.95);

  const maxLen = Math.max(q.length, t.length);
  if (maxLen <= 20) {
    const dist = levenshtein(q, t);
    if (dist <= Math.floor(maxLen * 0.3)) return 0.5 * (1 - dist / maxLen);
  }
  return 0;
}

export function matchesAny(text: string, keywords: string[]): boolean {
  const norm = normalizeText(text);
  return keywords.some((kw) => {
    const k = normalizeText(kw);
    return norm.includes(k) || fuzzyScore(norm, k) >= 0.5;
  });
}
