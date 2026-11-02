import { dataSignature } from '../src/ui/signature';
import type { Reading } from '../src/domain/types';

const rd = (id: number, over: Partial<Reading> = {}): Reading => ({
  id, ts: id, rawHex: '', weightKg: 125, impedanceOhm: 416, metrics: { weightKg: 125 }, flagged: false, flagReason: null,
  confirmed: false, healthSynced: false, ...over,
});
const profile = { sex: 'male' as const, heightCm: 180, birthDate: '2001-03-10', athlete: false, goalWeightKg: null };
const settings = { reminderTime: '07:00', cutoffTime: '09:30', reminderEnabled: true, weeklySummary: true };

describe('dataSignature', () => {
  it('is identical for equal data in fresh arrays', () => {
    expect(dataSignature([rd(1), rd(2)], [], profile, settings, 'x')).toBe(dataSignature([rd(1), rd(2)], [], profile, settings, 'x'));
  });
  it('changes when a reading is added, flagged, confirmed, or the profile, settings or scale change', () => {
    const base = dataSignature([rd(1)], [], profile, settings, 'x');
    expect(dataSignature([rd(1), rd(2)], [], profile, settings, 'x')).not.toBe(base);
    expect(dataSignature([], [rd(1, { flagged: true })], profile, settings, 'x')).not.toBe(base);
    expect(dataSignature([rd(1, { confirmed: true })], [], profile, settings, 'x')).not.toBe(base);
    expect(dataSignature([rd(1)], [], { ...profile, heightCm: 170 }, settings, 'x')).not.toBe(base);
    expect(dataSignature([rd(1)], [], profile, { ...settings, reminderTime: '06:00' }, 'x')).not.toBe(base);
    expect(dataSignature([rd(1)], [], profile, settings, 'y')).not.toBe(base);
  });
  it('changes when recomputed metrics change', () => {
    expect(dataSignature([rd(1, { metrics: { weightKg: 125, fatPct: 38 } })], [], profile, settings, 'x'))
      .not.toBe(dataSignature([rd(1, { metrics: { weightKg: 125, fatPct: 39 } })], [], profile, settings, 'x'));
  });
});
