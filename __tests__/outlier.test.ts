import { judge } from '../src/domain/outlier';

const DAY = 86_400_000;
const T0 = new Date('2026-11-02T07:00:00').getTime();
const steady = (n: number, base = 125) =>
  Array.from({ length: n }, (_, i) => ({ ts: T0 - (n - i) * DAY, weightKg: base + (i % 3 === 0 ? 0.3 : i % 3 === 1 ? -0.2 : 0.1) }));

describe('judge', () => {
  it('does not judge with fewer than 5 readings', () => {
    expect(judge(steady(4), { ts: T0, weightKg: 25.3 }).flagged).toBe(false);
  });

  it('flags a 25 kg reading against steady 125 kg history', () => {
    const r = judge(steady(10), { ts: T0, weightKg: 25.3 });
    expect(r.flagged).toBe(true);
    expect(r.reason).toContain('median');
  });

  it('flags a 3 kg jump', () => {
    expect(judge(steady(10), { ts: T0, weightKg: 128.2 }).flagged).toBe(true);
  });

  it('does not flag a 1 kg difference even when modified z is high (1.5 kg floor)', () => {
    const flat = Array.from({ length: 10 }, (_, i) => ({ ts: T0 - (10 - i) * DAY, weightKg: 125 }));
    expect(judge(flat, { ts: T0, weightKg: 126 }).flagged).toBe(false);
  });

  it('flags a big jump when history is identical (MAD = 0, no division by zero)', () => {
    const flat = Array.from({ length: 10 }, (_, i) => ({ ts: T0 - (10 - i) * DAY, weightKg: 125 }));
    expect(judge(flat, { ts: T0, weightKg: 130 }).flagged).toBe(true);
  });

  it('does not flag a reading on a slow 10 kg loss trend', () => {
    const slope = Array.from({ length: 28 }, (_, i) => ({ ts: T0 - (28 - i) * DAY, weightKg: 135 - i * (10 / 28) }));
    expect(judge(slope, { ts: T0, weightKg: 125 }).flagged).toBe(false);
  });

  it('ignores history older than 28 days', () => {
    const old = Array.from({ length: 10 }, (_, i) => ({ ts: T0 - (60 + i) * DAY, weightKg: 125 }));
    expect(judge(old, { ts: T0, weightKg: 25 }).flagged).toBe(false);
  });
});
