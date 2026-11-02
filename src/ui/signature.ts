import type { Profile, Reading, Settings } from '../domain/types';

/** Stable fingerprint of what the UI shows, so a poll that found nothing new does not re-render (and re-animate). */
export function dataSignature(
  readings: Reading[], hidden: Reading[], profile: Profile | null, settings: Settings | null, scaleId: string | null,
): string {
  const row = (r: Reading) => `${r.id}:${+r.flagged}${+r.confirmed}:${JSON.stringify(r.metrics)}`;
  return [readings.map(row).join('|'), hidden.map(row).join('|'), JSON.stringify(profile), JSON.stringify(settings), scaleId].join('#');
}
