import { planSamples } from '../src/domain/healthsamples';
import type { Reading } from '../src/domain/types';

const rd = (over: Partial<Reading> = {}): Reading => ({
  id: 7, ts: 1000, rawHex: '', weightKg: 124.7, impedanceOhm: 416,
  metrics: { weightKg: 124.7, bmi: 38.4, fatPct: 38.6, ffmKg: 76.6 }, flagged: false, flagReason: null,
  confirmed: false, healthSynced: false, ...over,
});

describe('planSamples', () => {
  it('plans four samples with stable sync ids and fat as a fraction', () => {
    const s = planSamples(rd(), () => true);
    expect(s.map((x) => x.type)).toEqual(['bodyMass', 'bmi', 'bodyFat', 'leanMass']);
    expect(s.map((x) => x.syncId)).toEqual(['better-scale-7-bodyMass', 'better-scale-7-bmi', 'better-scale-7-bodyFat', 'better-scale-7-leanMass']);
    expect(s.find((x) => x.type === 'bodyFat')).toMatchObject({ unit: '%', value: 0.386 });
    expect(s.find((x) => x.type === 'bodyMass')).toMatchObject({ unit: 'kg', value: 124.7 });
  });

  it('skips types the user has not authorised instead of failing', () => {
    const s = planSamples(rd(), (t) => t === 'bodyMass' || t === 'leanMass');
    expect(s.map((x) => x.type)).toEqual(['bodyMass', 'leanMass']);
  });

  it('a weight-only reading plans body mass only', () => {
    expect(planSamples(rd({ metrics: { weightKg: 124.7 } }), () => true).map((x) => x.type)).toEqual(['bodyMass']);
  });

  it('sync ids are the same on every call (retries replace, not duplicate)', () => {
    expect(planSamples(rd(), () => true)).toEqual(planSamples(rd(), () => true));
  });
});
