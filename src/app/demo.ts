import type { Repo } from '../data/db';
import { ageYears } from '../domain/age';
import { computeMetrics } from '../domain/bodycomp';

const DEMO = 'demo';

/** Demo builds only: 45 days of plausible readings plus one hidden outlier, marked so they can be removed. */
export async function loadDemoData(repo: Repo, add: boolean): Promise<void> {
  await repo.deleteByRawHex(DEMO);
  if (!add) return;
  const p = await repo.getProfile();
  if (!p) return;
  const DAY = 86_400_000;
  const start = new Date();
  start.setHours(7, 20, 0, 0);
  for (let i = 45; i >= 1; i--) {
    const ts = start.getTime() - i * DAY;
    const w = Math.round((130 - (45 - i) * 0.11 + Math.sin(i * 1.7) * 0.5) * 10) / 10;
    const z = 420 - (45 - i) * 0.6 + Math.sin(i * 2.3) * 6;
    const m = computeMetrics({ sex: p.sex, athlete: p.athlete, heightCm: p.heightCm, ageYears: ageYears(p.birthDate, ts) }, w, Math.round(z));
    await repo.insertReading({ ts, rawHex: DEMO, weightKg: w, impedanceOhm: Math.round(z), metrics: m, flagged: false, flagReason: null, confirmed: false, healthSynced: true });
  }
  await repo.insertReading({
    ts: start.getTime() - 3 * DAY, rawHex: DEMO, weightKg: 25.3, impedanceOhm: 384, metrics: { weightKg: 25.3 },
    flagged: true, flagReason: '25.3 kg is 99.6 kg from your recent median of 124.9 kg', confirmed: false, healthSynced: true,
  });
}
