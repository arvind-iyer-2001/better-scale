import { CaptureCoordinator } from '../src/app/coordinator';
import { parseFrame } from '../src/domain/frame';
import type { ReadingSession } from '../src/domain/session';

const fr = (hex: string) => parseFrame(Uint8Array.from(hex.split(' ').map((h) => parseInt(h, 16))))!;
const FINAL = 'CF 40 90 B6 30 DC D6 BD 00 00 2E';
const WEIGHING = 'CF 00 00 E8 30 00 00 00 00 01 16';

describe('CaptureCoordinator', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const make = () => {
    const done: ReadingSession[] = [];
    return { done, c: new CaptureCoordinator(async (s) => { done.push(s); }, 3000) };
  };

  it('finishes once, 3 s after the first valid frame, ignoring the burst', () => {
    const { c, done } = make();
    c.onFrame(fr(WEIGHING), 0);
    for (let i = 0; i < 10; i++) c.onFrame(fr(FINAL), 1000 + i);
    expect(done).toHaveLength(0);
    jest.advanceTimersByTime(3000);
    expect(done).toHaveLength(1);
    expect(done[0].result()!.weightKg).toBe(124.7);
  });

  it('ignores valid frames after finishing until the next disconnect', () => {
    const { c, done } = make();
    c.onFrame(fr(FINAL), 0);
    jest.advanceTimersByTime(3000);
    c.onFrame(fr(FINAL), 9000);
    jest.advanceTimersByTime(10000);
    expect(done).toHaveLength(1);
  });

  it('finishes immediately on disconnect when a valid reading is pending', () => {
    const { c, done } = make();
    c.onFrame(fr(FINAL), 0);
    c.onDisconnect();
    expect(done).toHaveLength(1);
    jest.advanceTimersByTime(5000);
    expect(done).toHaveLength(1);
  });

  it('a disconnect with nothing valid finishes nothing, and a new weigh-in works after it', () => {
    const { c, done } = make();
    c.onFrame(fr(WEIGHING), 0);
    c.onDisconnect();
    expect(done).toHaveLength(0);
    c.onFrame(fr(FINAL), 20000);
    jest.advanceTimersByTime(3000);
    expect(done).toHaveLength(1);
  });

  it('a disconnect after an already-finished weigh-in does not finish twice', () => {
    const { c, done } = make();
    c.onFrame(fr(FINAL), 0);
    jest.advanceTimersByTime(3000);
    c.onDisconnect();
    expect(done).toHaveLength(1);
  });

  it('starts a new weigh-in when a weighing (status 1) frame follows a finished one', () => {
    const { c, done } = make();
    c.onFrame(fr(FINAL), 0);
    jest.advanceTimersByTime(3000);
    expect(done).toHaveLength(1);
    c.onFrame(fr(WEIGHING), 20000); // user stepped off and on again
    c.onFrame(fr('CF 22 90 CA 30 1F 13 B7 00 00 3C'), 25000); // 124.9 kg
    jest.advanceTimersByTime(3000);
    expect(done).toHaveLength(2);
    expect(done[1].result()!.weightKg).toBe(124.9);
  });
});
