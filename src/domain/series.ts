import type { MetricKey, Reading } from './types';

export type Range = '1M' | '3M' | '1Y';
type Pt = { ts: number; value: number };

const DAY = 86_400_000;
const RANGE_DAYS: Record<Range, number> = { '1M': 30, '3M': 90, '1Y': 365 };

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function buildSeries(
  readings: Reading[],
  metric: MetricKey,
  range: Range,
  now: Date,
): { points: Pt[]; avg7: Pt[]; deltaVsAvg7: number | null } {
  const all: Pt[] = readings
    .filter((r) => !r.flagged && r.metrics[metric] !== undefined)
    .map((r) => ({ ts: r.ts, value: r.metrics[metric] as number }))
    .sort((a, b) => a.ts - b.ts);
  const from = now.getTime() - RANGE_DAYS[range] * DAY;
  const points = all.filter((p) => p.ts >= from);
  const avg7 = points.map((p) => ({
    ts: p.ts,
    value: mean(all.filter((q) => q.ts > p.ts - 7 * DAY && q.ts <= p.ts).map((q) => q.value)),
  }));
  let deltaVsAvg7: number | null = null;
  const latest = all[all.length - 1];
  if (latest) {
    const prior = all.filter((q) => q.ts >= latest.ts - 7 * DAY && q.ts < latest.ts);
    if (prior.length) deltaVsAvg7 = Math.round((latest.value - mean(prior.map((q) => q.value))) * 1000) / 1000;
  }
  return { points, avg7, deltaVsAvg7 };
}
