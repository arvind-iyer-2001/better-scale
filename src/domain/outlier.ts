const WINDOW_MS = 28 * 86_400_000;
const MIN_READINGS = 3;
const Z_LIMIT = 3.5;
const MIN_DELTA_KG = 1.5;

type Point = { ts: number; weightKg: number };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** history: readings the caller considers trustworthy (not flagged, or user-confirmed). */
export function judge(history: Point[], candidate: Point): { flagged: boolean; reason: string | null } {
  const recent = history.filter((p) => p.ts >= candidate.ts - WINDOW_MS && p.ts < candidate.ts);
  if (recent.length < MIN_READINGS) return { flagged: false, reason: null };
  const weights = recent.map((p) => p.weightKg);
  const med = median(weights);
  const mad = median(weights.map((w) => Math.abs(w - med)));
  const delta = Math.abs(candidate.weightKg - med);
  if (delta < MIN_DELTA_KG) return { flagged: false, reason: null };
  const z = mad === 0 ? Infinity : (0.6745 * delta) / mad;
  if (z <= Z_LIMIT) return { flagged: false, reason: null };
  return {
    flagged: true,
    reason: `${candidate.weightKg} kg is ${delta.toFixed(1)} kg from your recent median of ${med.toFixed(1)} kg`,
  };
}
