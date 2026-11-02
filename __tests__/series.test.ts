import { buildSeries } from '../src/domain/series';
import type { Reading } from '../src/domain/types';

const DAY = 86_400_000;
const NOW = new Date('2026-11-02T12:00:00');
const rd = (daysAgo: number, weightKg: number, over: Partial<Reading> = {}): Reading => ({
  id: Math.round(daysAgo * 10 + weightKg), ts: NOW.getTime() - daysAgo * DAY, rawHex: '', weightKg, impedanceOhm: 416,
  metrics: { weightKg, fatPct: weightKg / 3 }, flagged: false, flagReason: null, confirmed: false, healthSynced: true, ...over,
});

describe('buildSeries', () => {
  it('cuts the range', () => {
    const rs = [rd(100, 130), rd(20, 126), rd(2, 125)];
    expect(buildSeries(rs, 'weightKg', '1M', NOW).points.map((p) => p.value)).toEqual([126, 125]);
    expect(buildSeries(rs, 'weightKg', '3M', NOW).points.map((p) => p.value)).toEqual([126, 125]);
    expect(buildSeries(rs, 'weightKg', '1Y', NOW).points.map((p) => p.value)).toEqual([130, 126, 125]);
  });

  it('computes the 7-day trailing average at each point', () => {
    const rs = [rd(8, 130), rd(6, 128), rd(4, 126), rd(0, 124)];
    const { avg7 } = buildSeries(rs, 'weightKg', '1M', NOW);
    expect(avg7.map((p) => p.value)).toEqual([130, 129, 128, 126]); // (130) (130,128) (130,128,126) (128,126,124)
  });

  it('deltaVsAvg7 is latest minus the average of the prior 7 days', () => {
    const rs = [rd(6, 128), rd(3, 126), rd(0, 124)];
    expect(buildSeries(rs, 'weightKg', '1M', NOW).deltaVsAvg7).toBe(-3);
  });

  it('deltaVsAvg7 is null with no prior data', () => {
    expect(buildSeries([rd(0, 124)], 'weightKg', '1M', NOW).deltaVsAvg7).toBeNull();
    expect(buildSeries([rd(20, 124), rd(0, 125)], 'weightKg', '1M', NOW).deltaVsAvg7).toBeNull();
  });

  it('excludes flagged-unconfirmed readings and includes confirmed ones', () => {
    const rs = [rd(2, 25, { flagged: true }), rd(1, 124, { confirmed: true }), rd(0, 125)];
    expect(buildSeries(rs, 'weightKg', '1M', NOW).points.map((p) => p.value)).toEqual([124, 125]);
  });

  it('skips readings that lack the metric', () => {
    const rs = [rd(2, 125, { metrics: { weightKg: 125 } }), rd(0, 124)];
    expect(buildSeries(rs, 'fatPct', '1M', NOW).points).toHaveLength(1);
  });
});
