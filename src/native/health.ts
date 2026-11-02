import {
  AuthorizationStatus,
  authorizationStatusFor,
  isHealthDataAvailable,
  isProtectedDataAvailableAsync,
  requestAuthorization,
  saveQuantitySample,
} from '@kingstinct/react-native-healthkit';
import type { HealthSink } from '../domain/healthsync';
import type { Reading } from '../domain/types';

const BODY_MASS = 'HKQuantityTypeIdentifierBodyMass' as const;
const BODY_FAT = 'HKQuantityTypeIdentifierBodyFatPercentage' as const;
const BMI = 'HKQuantityTypeIdentifierBodyMassIndex' as const;
const LEAN = 'HKQuantityTypeIdentifierLeanBodyMass' as const;

/** Must be called from the UI: the permission sheet cannot be shown from a background launch. */
export async function requestHealthAccess(): Promise<void> {
  await requestAuthorization({ toShare: [BODY_MASS, BODY_FAT, BMI, LEAN], toRead: [BODY_MASS] });
}

export async function healthAccessState(): Promise<'unavailable' | 'denied' | 'authorized' | 'undetermined'> {
  if (!(await isHealthDataAvailable())) return 'unavailable';
  const s = authorizationStatusFor(BODY_MASS);
  if (s === AuthorizationStatus.sharingAuthorized) return 'authorized';
  if (s === AuthorizationStatus.sharingDenied) return 'denied';
  return 'undetermined';
}

export const healthSink: HealthSink = {
  async isWritable() {
    if (!(await isHealthDataAvailable())) return false;
    if (!(await isProtectedDataAvailableAsync())) return false; // phone locked
    return authorizationStatusFor(BODY_MASS) === AuthorizationStatus.sharingAuthorized;
  },
  async write(r: Reading) {
    const at = new Date(r.ts);
    const m = r.metrics;
    await saveQuantitySample(BODY_MASS, 'kg', r.weightKg, at, at);
    if (m.bmi !== undefined) await saveQuantitySample(BMI, 'count', m.bmi, at, at);
    if (m.fatPct !== undefined) await saveQuantitySample(BODY_FAT, '%', m.fatPct / 100, at, at);
    if (m.ffmKg !== undefined) await saveQuantitySample(LEAN, 'kg', m.ffmKg, at, at);
  },
};
