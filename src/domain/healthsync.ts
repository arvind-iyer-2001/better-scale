import type { Repo } from '../data/db';
import type { Reading } from './types';

export interface HealthSink {
  isWritable(): Promise<boolean>;
  write(r: Reading): Promise<void>;
}

/** Writes unsynced, unflagged readings to Health in time order. Never throws; leaves failures unsynced. */
export async function flushPending(repo: Repo, sink: HealthSink): Promise<{ written: number; deferred: number }> {
  const pending = await repo.unsynced();
  if (pending.length === 0) return { written: 0, deferred: 0 };
  let writable = false;
  try { writable = await sink.isWritable(); } catch { writable = false; }
  if (!writable) return { written: 0, deferred: pending.length };
  let written = 0;
  for (const r of pending) {
    try {
      await sink.write(r);
      await repo.markSynced(r.id);
      written++;
    } catch {
      break;
    }
  }
  return { written, deferred: pending.length - written };
}
