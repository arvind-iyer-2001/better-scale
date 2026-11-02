import type { MetricKey, Reading } from './types';

const DAY = 86_400_000;
const sign = (n: number, d = 1) => `${n > 0 ? '+' : ''}${n.toFixed(d)}`;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const CSV_METRICS: MetricKey[] = [
  'bmi', 'fatPct', 'fatKg', 'subcutPct', 'subcutKg', 'visceral', 'muscleKg', 'musclePct', 'skeletalMuscleKg',
  'waterPct', 'proteinKg', 'boneKg', 'bmr', 'bodyAge', 'idealWeightKg', 'ffmKg',
];

const good = (rs: Reading[]) => rs.filter((r) => !r.flagged);

/** Notification text for the weekly summary: the last 7 days against the 7 before. */
export function weeklySummary(readings: Reading[], now: Date): { title: string; body: string } {
  const t = now.getTime();
  const rs = good(readings);
  const thisWeek = rs.filter((r) => r.ts > t - 7 * DAY && r.ts <= t);
  const lastWeek = rs.filter((r) => r.ts > t - 14 * DAY && r.ts <= t - 7 * DAY);
  if (!thisWeek.length) return { title: 'Your week', body: 'No weigh-ins this week. Step on the scale to keep your trend going.' };
  const avg = mean(thisWeek.map((r) => r.weightKg));
  let body = `Average ${avg.toFixed(1)} kg`;
  if (lastWeek.length) body += ` (${sign(avg - mean(lastWeek.map((r) => r.weightKg)))} vs last week)`;
  body += ` · ${thisWeek.length} weigh-in${thisWeek.length > 1 ? 's' : ''}`;
  return { title: 'Your week', body };
}

/** The next Sunday at hh:mm (local), strictly after `now`. */
export function nextSundayAt(now: Date, hm: string): Date {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  while (d.getDay() !== 0 || d <= now) d.setDate(d.getDate() + 1);
  return d;
}

const cell = (v: string | number | boolean | null | undefined): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Every reading (flagged ones included, marked), oldest first. */
export function toCsv(readings: Reading[]): string {
  const rows = [...readings].sort((a, b) => a.ts - b.ts).map((r) =>
    [new Date(r.ts).toISOString(), r.weightKg, r.impedanceOhm, r.flagged ? 1 : 0, r.flagReason, ...CSV_METRICS.map((k) => r.metrics[k])]
      .map(cell).join(','),
  );
  return [['date', 'weight_kg', 'impedance_ohm', 'flagged', 'flag_reason', ...CSV_METRICS].join(','), ...rows].join('\n') + '\n';
}

/** A short plain-text progress update for the share sheet. */
export function shareText(readings: Reading[], goalKg: number | null, now: Date): string {
  const rs = good(readings).sort((a, b) => a.ts - b.ts);
  const latest = rs[rs.length - 1];
  if (!latest) return 'better-scale: no weigh-ins yet.';
  const parts = [`${latest.weightKg.toFixed(1)} kg`];
  const base = rs.find((r) => r.ts >= now.getTime() - 30 * DAY);
  if (base && base !== latest) parts[0] += ` (${sign(latest.weightKg - base.weightKg)} kg in 30 days)`;
  const fat = latest.metrics.fatPct;
  if (fat !== undefined) parts.push(`body fat ${fat.toFixed(1)}%`);
  if (goalKg !== null && latest.weightKg > goalKg) parts.push(`${(latest.weightKg - goalKg).toFixed(1)} kg to go`);
  return `better-scale: ${parts.join(' · ')}`;
}
