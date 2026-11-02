import { decodeImpedance, parseFrame } from '../src/domain/frame';

const bytes = (hex: string) => Uint8Array.from(hex.split(' ').map((h) => parseInt(h, 16)));

describe('parseFrame', () => {
  it('parses the final frame of a real weigh-in', () => {
    const f = parseFrame(bytes('CF 40 90 B6 30 DC D6 BD 00 00 2E'))!;
    expect(f.weightKg).toBe(124.7);
    expect(f.impedanceOhm).toBe(416);
    expect(f.status).toBe(0);
    expect(f.checksumOk).toBe(true);
    expect(f.kind).toBe('cf');
  });

  it('parses a second real frame', () => {
    const f = parseFrame(bytes('CF 22 90 CA 30 1F 13 B7 00 00 3C'))!;
    expect(f.weightKg).toBe(124.9);
    expect(f.impedanceOhm).toBe(413);
  });

  it('weighing frame has weight, no impedance, status 1', () => {
    const f = parseFrame(bytes('CF 00 00 E8 30 00 00 00 00 01 16'))!;
    expect(f.weightKg).toBe(125.2);
    expect(f.impedanceOhm).toBeNull();
    expect(f.status).toBe(1);
  });

  it('early frame has valid checksum', () => {
    expect(parseFrame(bytes('CF 36 90 B6 30 00 03 3E 00 00 D2'))!.checksumOk).toBe(true);
  });

  it('flags a bad checksum', () => {
    expect(parseFrame(bytes('CF 40 90 B6 30 DC D6 BD 00 00 2F'))!.checksumOk).toBe(false);
  });

  it('weight 0xFFFF is invalid', () => {
    const f = parseFrame(bytes('CF 00 00 FF FF 00 00 00 00 01 31'))!;
    expect(f.weightKg).toBeNull();
  });

  it('marks CE frames', () => {
    expect(parseFrame(bytes('CE 00 00 00 00 00 00 00 00 01 CF'))!.kind).toBe('ce');
  });

  it('returns null for short or unknown frames', () => {
    expect(parseFrame(bytes('CF 40 90 B6 30 DC D6 BD 00 00'))).toBeNull();
    expect(parseFrame(bytes('AA 40 90 B6 30 DC D6 BD 00 00 2E'))).toBeNull();
  });
});

describe('decodeImpedance', () => {
  it('returns null for the no-reading marker', () => {
    expect(decodeImpedance(0xffffff)).toBeNull();
  });

  it('decodes the occult research samples (b5,b6,b7 little-endian)', () => {
    const u = (b5: number, b6: number, b7: number) => b5 | (b6 << 8) | (b7 << 16);
    expect(decodeImpedance(u(0x32, 0x33, 0xdf))).toBe(394);
    expect(decodeImpedance(u(0xfc, 0xf6, 0xe3))).toBe(370);
    expect(decodeImpedance(u(0xba, 0xb5, 0xd1))).toBe(367);
  });

  it('returns null when outside 200..1200 ohm', () => {
    expect(decodeImpedance(0)).toBeNull();
  });
});
