import type { Repo } from '../data/db';
import { ageYears } from '../domain/age';
import { computeMetrics } from '../domain/bodycomp';
import { judge } from '../domain/outlier';
import type { ReadingSession } from '../domain/session';
import type { Metrics, Reading } from '../domain/types';

const WINDOW_MS = 28 * 86_400_000;
const DUPLICATE_MS = 120_000; // a Bluetooth drop mid-weigh-in replays the same weigh-in
const DUPLICATE_KG = 0.2;

export type CaptureDeps = {
  repo: Repo;
  now: () => Date;
  sink: { flushHealth(): Promise<void>; onReading(r: Reading): void };
};

/** Turns a finished scale session into a stored Reading. Returns null when the session had no valid reading. */
export async function captureReading(deps: CaptureDeps, session: ReadingSession): Promise<Reading | null> {
  const res = session.result();
  if (!res) return null;
  const { repo, now, sink } = deps;
  const profile = await repo.getProfile();
  const metrics: Metrics = profile
    ? computeMetrics(
        { sex: profile.sex, athlete: profile.athlete, heightCm: profile.heightCm, ageYears: ageYears(profile.birthDate, res.atMs) },
        res.weightKg,
        res.impedanceOhm,
      )
    : { weightKg: res.weightKg };
  const recent = await repo.listReadings(res.atMs - DUPLICATE_MS, true);
  const twin = recent.find((r) => Math.abs(r.weightKg - res.weightKg) <= DUPLICATE_KG && Math.abs(r.ts - res.atMs) <= DUPLICATE_MS);
  if (twin) return twin;
  const history = (await repo.listReadings(now().getTime() - WINDOW_MS)).map((r) => ({ ts: r.ts, weightKg: r.weightKg }));
  const verdict = judge(history, { ts: res.atMs, weightKg: res.weightKg });
  const draft: Omit<Reading, 'id'> = {
    ts: res.atMs, rawHex: res.rawHex, weightKg: res.weightKg, impedanceOhm: res.impedanceOhm, metrics,
    flagged: verdict.flagged, flagReason: verdict.reason, confirmed: false, healthSynced: false,
  };
  const id = await repo.insertReading(draft);
  const reading: Reading = { id, ...draft };
  sink.onReading(reading);
  if (!reading.flagged) await sink.flushHealth();
  return reading;
}
