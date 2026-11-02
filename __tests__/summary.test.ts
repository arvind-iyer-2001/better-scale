import { nextSundayAt, shareText, toCsv, weeklySummary } from '../src/domain/summary';
import type { Reading } from '../src/domain/types';

const DAY = 86_400_000;
const NOW = new Date('2026-11-04T10:00:00'); // Wednesday
const rd = (daysAgo: number, weightKg: number, over: Partial<Reading> = {}): Reading => ({
  id: Math.round(daysAgo * 100 + weightKg), ts: NOW.getTime() - daysAgo * DAY, rawHex: 'cf', weightKg, impedanceOhm: 416,
  metrics: { weightKg, fatPct: weightKg / 4, bmi: 30 }, flagged: false, flagReason: null, confirmed: false, healthSynced: true, ...over,
});

describe('weeklySummary', () => {
  it('compares this week to last week', () => {
    const rs = [rd(10, 126), rd(9, 126), rd(3, 125), rd(1, 124)];
    const s = weeklySummary(rs, NOW);
    expect(s.title).toBe('Your week');
    expect(s.body).toContain('124.5 kg');
    expect(s.body).toContain('-1.5');
    expect(s.body).toContain('2 weigh-ins');
  });

  it('omits the comparison when last week is empty', () => {
    const s = weeklySummary([rd(2, 125)], NOW);
    expect(s.body).toContain('125.0 kg');
    expect(s.body).not.toContain('vs last week');
  });

  it('nudges when there were no weigh-ins this week', () => {
    expect(weeklySummary([rd(20, 125)], NOW).body).toMatch(/no weigh-ins/i);
  });

  it('ignores flagged readings', () => {
    const s = weeklySummary([rd(2, 125), rd(1, 25, { flagged: true })], NOW);
    expect(s.body).toContain('125.0 kg');
    expect(s.body).toContain('1 weigh-in');
  });
});

describe('nextSundayAt', () => {
  it('returns the coming Sunday at the given time', () => {
    const d = nextSundayAt(NOW, '09:00');
    expect(d.getDay()).toBe(0);
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(9);
  });
  it('skips to next week when this Sunday time has passed', () => {
    const sun = new Date('2026-11-08T10:00:00');
    expect(nextSundayAt(sun, '09:00').getDate()).toBe(15);
  });
});

describe('toCsv', () => {
  it('writes a header and one row per reading, including flagged ones', () => {
    const csv = toCsv([rd(1, 125), rd(2, 25, { flagged: true, flagReason: 'off, "way" off' })]);
    const lines = csv.trim().split('\n');
    expect(lines[0].startsWith('date,weight_kg,impedance_ohm,flagged,flag_reason')).toBe(true);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"off, ""way"" off"');
    expect(lines[2]).toContain(',125,');
  });
  it('sorts oldest first', () => {
    const lines = toCsv([rd(1, 125), rd(5, 126)]).trim().split('\n');
    expect(lines[1]).toContain('126');
  });
});

describe('shareText', () => {
  it('summarises the latest reading and the 30-day change', () => {
    const t = shareText([rd(40, 128), rd(25, 127), rd(0, 124.9, { metrics: { weightKg: 124.9, fatPct: 31.2 } })], null, NOW);
    expect(t).toContain('124.9 kg');
    expect(t).toContain('-2.1 kg in 30 days');
    expect(t).toContain('31.2%');
  });
  it('mentions the goal when set', () => {
    expect(shareText([rd(0, 125)], 110, NOW)).toContain('15.0 kg to go');
  });
  it('handles no readings', () => {
    expect(shareText([], null, NOW)).toMatch(/no weigh-ins/i);
  });
});
