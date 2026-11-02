import type { Frame } from './frame';

export type SessionResult = { weightKg: number; impedanceOhm: number | null; rawHex: string; atMs: number };

const MIN_KG = 10;
const MAX_KG = 400;

/** One weigh-in: the first valid status-0 frame, replaced by a later one if the weight moved by 0.1 kg or more. */
export class ReadingSession {
  private best: SessionResult | null = null;

  push(frame: Frame, nowMs: number): void {
    if (frame.kind !== 'cf' || frame.status !== 0 || !frame.checksumOk) return;
    const w = frame.weightKg;
    if (w === null || w < MIN_KG || w > MAX_KG) return;
    const next: SessionResult = { weightKg: w, impedanceOhm: frame.impedanceOhm, rawHex: frame.hex, atMs: nowMs };
    if (!this.best) {
      this.best = next;
    } else if (Math.round(Math.abs(w - this.best.weightKg) * 100) >= 10) {
      this.best = { ...next, atMs: this.best.atMs };
    } else if (this.best.impedanceOhm === null && next.impedanceOhm !== null) {
      this.best = { ...next, atMs: this.best.atMs };
    }
  }

  result(): SessionResult | null {
    return this.best;
  }
}
