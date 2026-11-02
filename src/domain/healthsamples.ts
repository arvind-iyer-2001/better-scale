import type { Reading } from './types';

export type SampleType = 'bodyMass' | 'bmi' | 'bodyFat' | 'leanMass';
export type HealthSample = { type: SampleType; unit: 'kg' | '%' | 'count'; value: number; syncId: string };

/**
 * Samples to write for a reading. Each carries a stable sync id so a retried write replaces the earlier
 * sample instead of adding a duplicate; types the user has not authorised are skipped, not failed.
 */
export function planSamples(r: Reading, isAuthorized: (t: SampleType) => boolean): HealthSample[] {
  const m = r.metrics;
  const all: (HealthSample | null)[] = [
    { type: 'bodyMass', unit: 'kg', value: r.weightKg, syncId: '' },
    m.bmi !== undefined ? { type: 'bmi', unit: 'count', value: m.bmi, syncId: '' } : null,
    m.fatPct !== undefined ? { type: 'bodyFat', unit: '%', value: m.fatPct / 100, syncId: '' } : null,
    m.ffmKg !== undefined ? { type: 'leanMass', unit: 'kg', value: m.ffmKg, syncId: '' } : null,
  ];
  return all
    .filter((s): s is HealthSample => s !== null && isAuthorized(s.type))
    .map((s) => ({ ...s, syncId: `better-scale-${r.id}-${s.type}` }));
}
