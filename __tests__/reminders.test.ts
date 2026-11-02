import { planReminders } from '../src/domain/reminders';
import type { Settings } from '../src/domain/types';

const S: Settings = { reminderTime: '07:00', cutoffTime: '09:30', reminderEnabled: true, weeklySummary: true };
const at = (d: string, hm: string) => new Date(`${d}T${hm}:00`);
const hm = (d: Date) => `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('planReminders', () => {
  it('no reading yet at 06:00: both today, and the next 6 days (7 each)', () => {
    const p = planReminders(S, at('2026-11-02', '06:00'), null);
    expect(p.morning).toHaveLength(7);
    expect(p.followUp).toHaveLength(7);
    expect(hm(p.morning[0])).toBe('11-2 07:00');
    expect(hm(p.followUp[0])).toBe('11-2 09:30');
  });

  it('a reading today suppresses today only', () => {
    const p = planReminders(S, at('2026-11-02', '07:15'), at('2026-11-02', '07:12'));
    expect(hm(p.morning[0])).toBe('11-3 07:00');
    expect(hm(p.followUp[0])).toBe('11-3 09:30');
    expect(p.morning).toHaveLength(6);
  });

  it('at 08:00 with no reading: morning is past, follow-up still ahead', () => {
    const p = planReminders(S, at('2026-11-02', '08:00'), null);
    expect(hm(p.morning[0])).toBe('11-3 07:00');
    expect(hm(p.followUp[0])).toBe('11-2 09:30');
  });

  it('at 10:00 with no reading: both start tomorrow', () => {
    const p = planReminders(S, at('2026-11-02', '10:00'), null);
    expect(hm(p.morning[0])).toBe('11-3 07:00');
    expect(hm(p.followUp[0])).toBe('11-3 09:30');
  });

  it('yesterday 23:50 does not suppress today', () => {
    const p = planReminders(S, at('2026-11-02', '06:00'), at('2026-11-01', '23:50'));
    expect(hm(p.morning[0])).toBe('11-2 07:00');
  });

  it('disabled reminders plan nothing', () => {
    const p = planReminders({ ...S, reminderEnabled: false, weeklySummary: true }, at('2026-11-02', '06:00'), null);
    expect(p).toEqual({ morning: [], followUp: [] });
  });

  it('respects custom times', () => {
    const p = planReminders({ ...S, reminderTime: '06:30', cutoffTime: '10:00' }, at('2026-11-02', '06:00'), null);
    expect(hm(p.morning[0])).toBe('11-2 06:30');
    expect(hm(p.followUp[0])).toBe('11-2 10:00');
  });
});
