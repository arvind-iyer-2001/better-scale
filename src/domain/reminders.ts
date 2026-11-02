import type { Settings } from './types';

export type ReminderPlan = { morning: Date[]; followUp: Date[] };

const DAYS = 7;

const onDay = (base: Date, dayOffset: number, hm: string): Date => {
  const [h, m] = hm.split(':').map(Number);
  // Local wall-clock construction keeps the time stable across DST changes.
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, h, m, 0, 0);
};

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Next 7 days of one-off reminders (so they keep firing if the app is never opened).
 * A reading today (flagged or not) suppresses today's reminders only.
 */
export function planReminders(settings: Settings, now: Date, lastReadingAt: Date | null): ReminderPlan {
  const plan: ReminderPlan = { morning: [], followUp: [] };
  if (!settings.reminderEnabled) return plan;
  const weighedToday = lastReadingAt !== null && sameLocalDay(lastReadingAt, now);
  for (let d = 0; d < DAYS; d++) {
    if (d === 0 && weighedToday) continue;
    const m = onDay(now, d, settings.reminderTime);
    const f = onDay(now, d, settings.cutoffTime);
    if (m > now) plan.morning.push(m);
    if (f > now) plan.followUp.push(f);
  }
  return plan;
}
