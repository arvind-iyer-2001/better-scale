import Database from 'better-sqlite3';
import { Repo, type Db } from '../src/data/db';
import { ageYears } from '../src/domain/age';
import type { Profile, Reading } from '../src/domain/types';

function memDb(): Db {
  const d = new Database(':memory:');
  return {
    exec: async (sql) => { d.exec(sql); },
    run: async (sql, p = []) => Number(d.prepare(sql).run(...p).lastInsertRowid),
    all: async (sql, p = []) => d.prepare(sql).all(...p) as any[],
  };
}

const profile: Profile = { sex: 'male', heightCm: 180, birthDate: '2001-03-10', athlete: false, goalWeightKg: null };
const mk = (ts: number, weightKg = 125, over: Partial<Reading> = {}): Omit<Reading, 'id'> => ({
  ts, rawHex: 'cf', weightKg, impedanceOhm: 416, metrics: { weightKg }, flagged: false, flagReason: null,
  confirmed: false, healthSynced: false, ...over,
});

describe('ageYears', () => {
  it('counts completed years at the reading time', () => {
    expect(ageYears('2001-03-10', new Date('2026-03-09T12:00:00').getTime())).toBe(24);
    expect(ageYears('2001-03-10', new Date('2026-03-10T12:00:00').getTime())).toBe(25);
  });
});

describe('Repo', () => {
  let repo: Repo;
  beforeEach(async () => { repo = await Repo.withDb(memDb()); });

  it('inserts and lists a reading', async () => {
    const id = await repo.insertReading(mk(1000, 124.7));
    const [r] = await repo.listReadings();
    expect(r.id).toBe(id);
    expect(r.weightKg).toBe(124.7);
    expect(r.metrics).toEqual({ weightKg: 124.7 });
  });

  it('hides flagged readings by default and shows them after confirm', async () => {
    const id = await repo.insertReading(mk(1000, 25, { flagged: true, flagReason: 'off median' }));
    expect(await repo.listReadings()).toHaveLength(0);
    expect(await repo.listReadings(undefined, true)).toHaveLength(1);
    await repo.confirmReading(id);
    const [r] = await repo.listReadings();
    expect(r.confirmed).toBe(true);
    expect(r.flagged).toBe(false);
  });

  it('filters by sinceTs', async () => {
    await repo.insertReading(mk(1000));
    await repo.insertReading(mk(5000));
    expect((await repo.listReadings(2000)).map((r) => r.ts)).toEqual([5000]);
  });

  it('unsynced excludes flagged and synced readings', async () => {
    const a = await repo.insertReading(mk(1000));
    await repo.insertReading(mk(2000, 25, { flagged: true, flagReason: 'x' }));
    const c = await repo.insertReading(mk(3000));
    await repo.markSynced(c);
    expect((await repo.unsynced()).map((r) => r.id)).toEqual([a]);
  });

  it('setFlag toggles the flag', async () => {
    const id = await repo.insertReading(mk(1000));
    await repo.setFlag(id, true, 'why');
    expect(await repo.listReadings()).toHaveLength(0);
    await repo.setFlag(id, false, null);
    expect(await repo.listReadings()).toHaveLength(1);
  });

  it('recomputeAll changes body fat when height changes', async () => {
    const ts = new Date('2026-11-02T07:00:00').getTime();
    await repo.insertReading(mk(ts, 124.7));
    await repo.recomputeAll(profile);
    const fat1 = (await repo.listReadings())[0].metrics.fatPct;
    await repo.recomputeAll({ ...profile, heightCm: 170 });
    const fat2 = (await repo.listReadings())[0].metrics.fatPct;
    expect(fat1).toBe(38.6);
    expect(fat2).not.toBe(fat1);
  });

  it('round-trips profile and settings, with defaults', async () => {
    expect(await repo.getProfile()).toBeNull();
    expect(await repo.getSettings()).toEqual({ reminderTime: '07:00', cutoffTime: '09:30', reminderEnabled: true, weeklySummary: true });
    await repo.saveProfile(profile);
    await repo.saveSettings({ reminderTime: '06:30', cutoffTime: '10:00', reminderEnabled: false, weeklySummary: true });
    expect(await repo.getProfile()).toEqual(profile);
    expect((await repo.getSettings()).reminderTime).toBe('06:30');
  });

  it('recomputeAll is all-or-nothing', async () => {
    const inner = memDb();
    let updates = 0;
    const flaky: Db = {
      exec: inner.exec,
      all: inner.all,
      run: async (sql, p) => {
        if (sql.startsWith('UPDATE readings SET metrics') && ++updates === 2) throw new Error('disk full');
        return inner.run(sql, p);
      },
    };
    const repo = await Repo.withDb(flaky);
    await repo.insertReading(mk(1_000_000_000_000, 125));
    await repo.insertReading(mk(1_000_000_100_000, 126));
    await expect(repo.recomputeAll(profile)).rejects.toThrow('disk full');
    const metrics = (await repo.listReadings()).map((r) => r.metrics);
    expect(metrics).toEqual([{ weightKg: 125 }, { weightKg: 126 }]);
  });
});
