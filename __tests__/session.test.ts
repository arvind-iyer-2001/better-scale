import { parseFrame } from '../src/domain/frame';
import { ReadingSession } from '../src/domain/session';

const fr = (hex: string) => parseFrame(Uint8Array.from(hex.split(' ').map((h) => parseInt(h, 16))))!;
const WEIGHING = 'CF 00 00 E8 30 00 00 00 00 01 16';
const FINAL = 'CF 40 90 B6 30 DC D6 BD 00 00 2E'; // 124.70 kg, 416 ohm, status 0

describe('ReadingSession', () => {
  it('yields exactly one result from a burst of identical frames', () => {
    const s = new ReadingSession();
    for (let i = 0; i < 10; i++) s.push(fr(FINAL), 1000 + i);
    expect(s.result()).toEqual({ weightKg: 124.7, impedanceOhm: 416, rawHex: fr(FINAL).hex, atMs: 1000 });
  });

  it('returns null when only weighing (status 1) frames arrived', () => {
    const s = new ReadingSession();
    s.push(fr(WEIGHING), 1);
    expect(s.result()).toBeNull();
  });

  it('a later status-0 frame replaces the result when weight differs by 0.1 kg or more', () => {
    const s = new ReadingSession();
    s.push(fr('CF 22 90 CA 30 1F 13 B7 00 00 3C'), 1); // 124.9
    s.push(fr(FINAL), 2); // 124.7
    expect(s.result()!.weightKg).toBe(124.7);
  });

  it('keeps the first frame when a later one differs by less than 0.1 kg', () => {
    const s = new ReadingSession();
    s.push(fr(FINAL), 1);
    s.push(fr('CF 40 90 B7 30 DC D6 BD 00 00 2F'), 2); // 124.71
    expect(s.result()!.weightKg).toBe(124.7);
  });

  it('ignores CE frames and frames with a bad checksum', () => {
    const s = new ReadingSession();
    s.push(fr('CE 40 90 B6 30 DC D6 BD 00 00 2F'), 1);
    s.push(fr('CF 40 90 B6 30 DC D6 BD 00 00 2F'), 2);
    expect(s.result()).toBeNull();
  });

  it('a valid weight with invalid impedance still counts, impedance null', () => {
    const s = new ReadingSession();
    s.push(fr('CF 40 90 B6 30 FF FF FF 00 00 66'), 1);
    expect(s.result()).toMatchObject({ weightKg: 124.7, impedanceOhm: null });
  });
});
