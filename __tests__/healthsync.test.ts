import Database from 'better-sqlite3';
import { Repo, type Db } from '../src/data/db';
import { flushPending, type HealthSink } from '../src/domain/healthsync';
import type { Reading } from '../src/domain/types';

function memDb(): Db {
  const d = new Database(':memory:');
  return {
    exec: async (s) => { d.exec(s); },
    run: async (s, p = []) => Number(d.prepare(s).run(...p).lastInsertRowid),
    all: async (s, p = []) => d.prepare(s).all(...p) as any[],
  };
}
const mk = (ts: number, over: Partial<Reading> = {}): Omit<Reading, 'id'> => ({
  ts, rawHex: 'x', weightKg: 125, impedanceOhm: 416, metrics: { weightKg: 125 }, flagged: false, flagReason: null,
  confirmed: false, healthSynced: false, ...over,
});

describe('flushPending', () => {
  let repo: Repo;
  beforeEach(async () => { repo = await Repo.withDb(memDb()); });

  it('writes all unsynced readings and marks them synced', async () => {
    for (const t of [1, 2, 3]) await repo.insertReading(mk(t));
    const written: number[] = [];
    const sink: HealthSink = { isWritable: async () => true, write: async (r) => { written.push(r.ts); } };
    expect(await flushPending(repo, sink)).toEqual({ written: 3, deferred: 0 });
    expect(written).toEqual([1, 2, 3]);
    expect(await repo.unsynced()).toHaveLength(0);
  });

  it('defers everything without throwing when the sink is not writable', async () => {
    for (const t of [1, 2, 3]) await repo.insertReading(mk(t));
    const sink: HealthSink = { isWritable: async () => false, write: async () => { throw new Error('should not be called'); } };
    expect(await flushPending(repo, sink)).toEqual({ written: 0, deferred: 3 });
    expect(await repo.unsynced()).toHaveLength(3);
  });

  it('stops at the first write error and leaves the rest unsynced', async () => {
    for (const t of [1, 2, 3]) await repo.insertReading(mk(t));
    let n = 0;
    const sink: HealthSink = { isWritable: async () => true, write: async () => { if (++n === 2) throw new Error('denied'); } };
    expect(await flushPending(repo, sink)).toEqual({ written: 1, deferred: 2 });
    expect((await repo.unsynced()).map((r) => r.ts)).toEqual([2, 3]);
  });

  it('never writes flagged readings', async () => {
    await repo.insertReading(mk(1, { flagged: true, flagReason: 'x' }));
    await repo.insertReading(mk(2));
    const written: number[] = [];
    const sink: HealthSink = { isWritable: async () => true, write: async (r) => { written.push(r.ts); } };
    await flushPending(repo, sink);
    expect(written).toEqual([2]);
  });

  it('does not throw when isWritable itself throws', async () => {
    await repo.insertReading(mk(1));
    const sink: HealthSink = { isWritable: async () => { throw new Error('boom'); }, write: async () => {} };
    expect(await flushPending(repo, sink)).toEqual({ written: 0, deferred: 1 });
  });
});
