import Database from 'better-sqlite3';
import { Repo, type Db } from '../src/data/db';
import { captureReading } from '../src/app/capture';
import { ReadingSession } from '../src/domain/session';
import { parseFrame } from '../src/domain/frame';
import type { Profile, Reading } from '../src/domain/types';

function memDb(): Db {
  const d = new Database(':memory:');
  return {
    exec: async (s) => { d.exec(s); },
    run: async (s, p = []) => Number(d.prepare(s).run(...p).lastInsertRowid),
    all: async (s, p = []) => d.prepare(s).all(...p) as any[],
  };
}
const NOW = new Date('2026-11-02T07:30:00');
const DAY = 86_400_000;
const profile: Profile = { sex: 'male', heightCm: 180, birthDate: '2001-03-10', athlete: false, goalWeightKg: null };
const frame = (hex: string) => parseFrame(Uint8Array.from(hex.split(' ').map((h) => parseInt(h, 16))))!;
const sessionWith = (hex: string) => { const s = new ReadingSession(); s.push(frame(hex), NOW.getTime() - 5000); return s; };
const FINAL = 'CF 40 90 B6 30 DC D6 BD 00 00 2E'; // 124.7 kg
const BAG = 'CF 00 8F DD 09 E5 E6 A2 00 00 35'; // real logged frame: 25.25 kg, status 0

const mkSink = () => {
  const seen: Reading[] = [];
  return { seen, flushes: 0, onReading(r: Reading) { seen.push(r); }, async flushHealth() { this.flushes++; } };
};

describe('captureReading', () => {
  let repo: Repo;
  beforeEach(async () => { repo = await Repo.withDb(memDb()); });

  it('returns null when the session has no valid reading', async () => {
    const sink = mkSink();
    expect(await captureReading({ repo, now: () => NOW, sink }, new ReadingSession())).toBeNull();
    expect(sink.flushes).toBe(0);
  });

  it('without a profile stores weight only and does not flag', async () => {
    const sink = mkSink();
    const r = (await captureReading({ repo, now: () => NOW, sink }, sessionWith(FINAL)))!;
    expect(r.metrics).toEqual({ weightKg: 124.7 });
    expect(r.flagged).toBe(false);
    expect((await repo.listReadings())).toHaveLength(1);
  });

  it('computes metrics with a profile, and flushes Health once', async () => {
    await repo.saveProfile(profile);
    const sink = mkSink();
    const r = (await captureReading({ repo, now: () => NOW, sink }, sessionWith(FINAL)))!;
    expect(r.metrics.fatPct).toBe(38.6);
    expect(r.ts).toBe(NOW.getTime() - 5000);
    expect(sink.flushes).toBe(1);
    expect(sink.seen).toHaveLength(1);
  });

  it('flags an outlier: stored, hidden from default list, onReading still called', async () => {
    await repo.saveProfile(profile);
    for (let i = 1; i <= 10; i++) {
      await repo.insertReading({ ts: NOW.getTime() - i * DAY, rawHex: 'x', weightKg: 125 + (i % 3) * 0.2, impedanceOhm: 416,
        metrics: { weightKg: 125 }, flagged: false, flagReason: null, confirmed: false, healthSynced: true });
    }
    const sink = mkSink();
    const r = (await captureReading({ repo, now: () => NOW, sink }, sessionWith(BAG)))!;
    expect(r.flagged).toBe(true);
    expect(r.flagReason).toContain('median');
    expect((await repo.listReadings()).map((x) => x.id)).not.toContain(r.id);
    expect((await repo.listReadings(undefined, true)).map((x) => x.id)).toContain(r.id);
    expect(sink.seen).toHaveLength(1);
    expect(sink.seen[0].flagged).toBe(true);
  });

  it('ignores a second session at the same weight within two minutes (Bluetooth drop mid-weigh-in)', async () => {
    const sink = mkSink();
    const first = (await captureReading({ repo, now: () => NOW, sink }, sessionWith(FINAL)))!;
    const sink2 = mkSink();
    const s2 = new ReadingSession();
    s2.push(frame(FINAL), NOW.getTime() + 40_000);
    const again = await captureReading({ repo, now: () => NOW, sink: sink2 }, s2);
    expect(await repo.listReadings()).toHaveLength(1);
    expect(again!.id).toBe(first.id);
    expect(sink2.seen).toHaveLength(0);
  });

  it('still records the same weight when the earlier reading is more than two minutes old', async () => {
    const sink = mkSink();
    await captureReading({ repo, now: () => NOW, sink }, sessionWith(FINAL));
    const s2 = new ReadingSession();
    s2.push(frame(FINAL), NOW.getTime() + 3 * 60_000);
    await captureReading({ repo, now: () => NOW, sink }, s2);
    expect(await repo.listReadings()).toHaveLength(2);
  });
});
