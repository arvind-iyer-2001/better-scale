// TypeScript port of re/cultconnect/port/bh_legs140.py (foot-to-foot model).
// Every float operation is rounded to float32 with Math.fround to match the reference.
// Personal-use only: replace with a clean-room or licensed implementation before release.
import type { Metrics } from './types';

const f = Math.fround;
const mul = (a: number, b: number) => f(a * b);
const add = (a: number, b: number) => f(a + b);
const sub = (a: number, b: number) => f(a - b);
const div = (a: number, b: number) => f(a / b);
const u16 = (x: number) => x & 0xffff;
const tr = Math.trunc;
const s8 = (x: number) => {
  const v = x & 0xff;
  return v >= 128 ? v - 256 : v;
};

type Input = { sex: 'male' | 'female'; athlete: boolean; heightCm: number; ageYears: number };

/** Outputs keyed by the vendor's output-short index, in vendor fixed-point units. */
function legs(female: boolean, athlete: boolean, h: number, age: number, W: number, z: number) {
  const out: Record<number, number> = {};
  const H2 = h * h;
  const bmi10 = u16(Math.floor((W * 10000) / H2));
  out[6] = bmi10;
  const fH2 = f(H2), fW = f(W), fAge = f(age), fz = f(z);
  out[0x14] = u16(tr(mul(fH2, f(0.022))));

  // fat-free mass estimate (kg)
  let ffm = mul(fW, f(0.032));
  ffm = add(ffm, div(mul(fH2, f(9.058)), f(10000.0)));
  ffm = add(ffm, f(12.226));
  ffm = add(ffm, mul(fz, f(-0.0068)));
  ffm = add(ffm, mul(fAge, f(-0.0542)));
  let a = female ? f(9.25) : f(0.8);
  const b = female ? f(7.25) : f(0.8);
  if (age > 0x31) a = b;
  const adj = sub(ffm, a);
  let lean: number;
  if (female) {
    let t = mul(adj, f(1.02));
    if (W >= 500) t = adj;
    let s = mul(t, f(0.96));
    if (W < 0x259) s = t;
    let t2 = mul(s, f(1.03));
    if (h < 0xa1) t2 = s;
    lean = t2;
  } else {
    lean = mul(adj, f(0.98));
    if (W > 0x261) lean = adj;
  }
  let fatKg = sub(div(fW, f(10.0)), lean);
  if (athlete) {
    const [k, c] = female ? [f(0.992), f(-1.5)] : [f(0.778), f(-0.93)];
    fatKg = add(mul(fatKg, k), c);
  }
  let pct = div(mul(fatKg, f(10000.0)), fW);
  if (pct > f(750.0)) pct = f(750.0);
  if (pct <= f(50.0)) pct = f(50.0);
  const fat10 = tr(pct);
  out[1] = fat10;
  const fatkg10 = Math.floor((fat10 * W) / 1000);
  out[0] = u16(fatkg10);

  // water
  const base = u16(tr(((1000 - fat10) * 7) / 10));
  let mult = 98;
  if (base < 0x1f5) mult = 102;
  const prod = mult * base;
  let water = Math.floor(prod / 100);
  if (athlete) {
    const [k, c] = female ? [f(0.985), f(9.0)] : [f(0.996), f(4.0)];
    water = tr(add(mul(k, f(u16(Math.floor(prod / 100)))), c));
  }
  if (u16(water) < 0x15e) water = 0x15e;
  out[0x15] = u16(water);

  // bone
  let bone = Math.max(0, tr(sub(mul(ffm, f(0.5158)), female ? f(2.4569) : f(1.802))));
  bone += bone > 0x16 ? 1 : -1;
  if (athlete) {
    let d = 2;
    if ((bone & 0xff) > 0x1d) d = 3;
    if ((bone & 0xff) < 0x14) d = 1;
    bone += d;
  }
  out[0x12] = bone & 0xff;

  // body age (native)
  const fb = f(bmi10);
  const a1 = Math.max(tr(add(add(fAge, f(28.428)), mul(fb, f(-0.1428)))), age - 5);
  const A = Math.min(s8(a1), age + 5);
  const b1 = Math.max(tr(add(add(mul(fb, f(0.1724)), fAge), f(-34.931))), age - 8);
  const B = Math.min(s8(b1), age + 8);
  const [wA, wB] = bmi10 > 0x1d ? [f(0.4), f(0.6)] : [f(0.6), f(0.4)];
  let ba = tr(add(mul(wA, f(A & 0xff)), mul(wB, f(B & 0xff))));
  if (ba < 7) ba = 6;
  if (ba > 0x62) ba = 99;
  out[0xb] = ba;

  // BMR
  const [cAge, cH, c0, cW] = female
    ? [f(6.204), f(0.3934), f(864.6), f(1.0204)]
    : [f(8.976), f(0.726), f(877.8), f(1.4916)];
  let bmr = tr(sub(sub(add(mul(cW, fW), c0), mul(cH, f(h))), mul(cAge, fAge)));
  if (athlete) bmr = tr(add(mul(f(bmr), f(1.16)), f(-149.0)));
  if (bmr < 0x1f5) bmr = 500;
  out[9] = u16(bmr);

  // visceral fat
  const fh = f(h);
  let v: number;
  if (female) {
    if (add(mul(fh, f(5.0)), f(-130.0)) < fW) {
      const den = add(add(mul(fh, f(1.45)), mul(fH2, f(0.1158))), f(-120.0));
      v = add(add(div(mul(fW, f(50)), den), f(-6.0)), mul(fAge, f(0.07)));
    } else {
      let t = div(mul(add(mul(fh, f(-0.0024)), f(0.691)), fW), f(10.0));
      t = add(t, mul(fh, f(-0.027)));
      t = add(t, mul(fAge, f(0.07)));
      v = add(t, f(-10.5));
    }
  } else if (fh < add(mul(fW, f(0.16)), f(63.0))) {
    const den = add(add(mul(fH2, f(0.0826)), mul(fh, f(-0.4))), f(48.0));
    v = add(add(div(mul(fW, f(30.5)), den), f(-2.9)), mul(fAge, f(0.15)));
  } else {
    let t = div(mul(add(mul(fh, f(-0.0015)), f(0.765)), fW), f(10.0));
    t = add(t, mul(fh, f(-0.143)));
    t = add(t, mul(fAge, f(0.15)));
    v = add(t, f(-5.0));
  }
  if (athlete) {
    if (v >= f(2.0)) {
      if (v >= f(10.0)) v = mul(v, v >= f(20.0) ? f(0.85) : f(0.8));
      else v = add(v, f(-2.0));
    } else v = f(1.0);
  }
  out[0x18] = v < f(1.0) ? 1 : v > f(50.0) ? 50 : tr(v);

  // lean / muscle / protein / skeletal / subcutaneous
  const ffm10 = W - fatkg10;
  out[0xc] = u16(ffm10);
  const musc = u16(ffm10 - (bone & 0xff));
  out[0x20] = musc;
  out[0x1f] = u16(tr(div(mul(f(musc), f(1000.0)), fW)));
  const w16 = u16(water);
  let s = add(add(add(mul(fz, f(0.031)), mul(fb, f(0.94))), mul(fAge, f(1.049))), f(-210.772));
  let prot = tr(
    sub(add(f(1000 - fat10), mul(f(w16), f(-1.08))), div(mul(f(bone & 0xff), f(1000.0)), fW)),
  );
  if (prot < 0x15) prot = 0x14;
  if (u16(prot) > 299) prot = 300;
  out[0x1d] = u16(prot);
  out[0x1a] = u16(tr(add(mul(f(u16(Math.floor((w16 * W) / 1000))), f(0.832)), f(-27.354))));
  if (s <= f(10.0)) s = f(10.0);
  if (s > f(300.0)) s = f(300.0);
  s = add(f(u16(Math.floor((fat10 * W) / 1000))), div(mul(s, f(-9.4)), f(34.0)));
  if (athlete) s = mul(s, f(0.85));
  let subc = tr(div(mul(s, f(1000.0)), fW));
  if (subc < 11) subc = 10;
  if (u16(subc) > 599) subc = 600;
  out[0xe] = u16(subc);
  out[0xd] = u16(Math.floor((u16(subc) * W) / 1000));
  return out;
}

export function computeMetrics(p: Input, weightKg: number, impedanceOhm: number | null): Metrics {
  const W = Math.round(weightKg * 10);
  const h = p.heightCm;
  const bmi = h > 0 ? u16(Math.floor((W * 10000) / (h * h))) / 10 : 0;
  const basic: Metrics = { weightKg: W / 10, bmi };
  const ok =
    impedanceOhm !== null && impedanceOhm >= 200 && impedanceOhm <= 1200 &&
    p.ageYears >= 6 && p.ageYears <= 99 &&
    h >= 90 && h <= 220 &&
    W >= 100 && W <= 2000;
  if (!ok) return basic;
  const o = legs(p.sex === 'female', p.athlete, h, p.ageYears, W, impedanceOhm as number);
  return {
    weightKg: W / 10,
    bmi: o[6] / 10,
    fatPct: o[1] / 10,
    fatKg: o[0] / 10,
    subcutPct: o[0xe] / 10,
    subcutKg: o[0xd] / 10,
    visceral: o[0x18],
    muscleKg: o[0x20] / 10,
    musclePct: o[0x1f] / 10,
    skeletalMuscleKg: o[0x1a] / 10,
    waterPct: o[0x15] / 10,
    proteinKg: (W * o[0x1d]) / 10000,
    boneKg: o[0x12] / 10,
    bmr: o[9],
    bodyAge: o[0xb],
    idealWeightKg: o[0x14] / 10,
    ffmKg: o[0xc] / 10,
  };
}
