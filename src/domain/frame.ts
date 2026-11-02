export type Frame = {
  hex: string;
  weightKg: number | null;
  impedanceOhm: number | null;
  status: number;
  checksumOk: boolean;
  kind: 'cf' | 'ce';
};

const Z_MIN = 200;
const Z_MAX = 1200;

/** u = b5 | b6<<8 | b7<<16. Returns ohms, or null when absent or outside 200..1200. */
export function decodeImpedance(u: number): number | null {
  if (u === 0xffffff) return null;
  const d = ((u & 0xf00) | ((u >> 16) & 0xff)) - ((u & 0xff) * 4 + ((u >> 12) & 0xf));
  const z = Math.trunc(d / 2);
  return z >= Z_MIN && z <= Z_MAX ? z : null;
}

export function parseFrame(bytes: Uint8Array): Frame | null {
  if (bytes.length < 11) return null;
  const b0 = bytes[0];
  if (b0 !== 0xcf && b0 !== 0xce) return null;
  const f = bytes.subarray(0, 11);
  let x = 0;
  for (let i = 0; i < 10; i++) x ^= f[i];
  const w = f[3] | (f[4] << 8);
  const u = f[5] | (f[6] << 8) | (f[7] << 16);
  return {
    hex: Array.from(f, (b) => b.toString(16).padStart(2, '0')).join(' '),
    weightKg: w === 0xffff ? null : w / 100,
    impedanceOhm: decodeImpedance(u),
    status: f[9],
    checksumOk: x === f[10],
    kind: b0 === 0xcf ? 'cf' : 'ce',
  };
}
