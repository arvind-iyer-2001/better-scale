import type { MetricKey } from '../domain/types';
import { theme } from './theme';

export type MetricDef = { key: MetricKey; label: string; unit: string; color: string; decimals: number };

export const METRICS: MetricDef[] = [
  { key: 'weightKg', label: 'Weight', unit: 'kg', color: theme.red, decimals: 1 },
  { key: 'fatPct', label: 'Body fat', unit: '%', color: theme.red, decimals: 1 },
  { key: 'fatKg', label: 'Fat mass', unit: 'kg', color: theme.red, decimals: 1 },
  { key: 'muscleKg', label: 'Muscle', unit: 'kg', color: theme.lime, decimals: 1 },
  { key: 'musclePct', label: 'Muscle rate', unit: '%', color: theme.lime, decimals: 1 },
  { key: 'skeletalMuscleKg', label: 'Skeletal muscle', unit: 'kg', color: theme.lime, decimals: 1 },
  { key: 'ffmKg', label: 'Fat-free mass', unit: 'kg', color: theme.lime, decimals: 1 },
  { key: 'waterPct', label: 'Water', unit: '%', color: theme.cyan, decimals: 1 },
  { key: 'proteinKg', label: 'Protein', unit: 'kg', color: theme.cyan, decimals: 1 },
  { key: 'boneKg', label: 'Bone', unit: 'kg', color: theme.cyan, decimals: 1 },
  { key: 'bmi', label: 'BMI', unit: '', color: theme.amber, decimals: 1 },
  { key: 'visceral', label: 'Visceral fat', unit: '', color: theme.amber, decimals: 0 },
  { key: 'subcutPct', label: 'Subcutaneous fat', unit: '%', color: theme.red, decimals: 1 },
  { key: 'subcutKg', label: 'Subcutaneous fat', unit: 'kg', color: theme.red, decimals: 1 },
  { key: 'bmr', label: 'BMR', unit: 'kcal', color: theme.amber, decimals: 0 },
  { key: 'bodyAge', label: 'Body age', unit: 'y', color: theme.amber, decimals: 0 },
  { key: 'idealWeightKg', label: 'Ideal weight', unit: 'kg', color: theme.lime, decimals: 1 },
];

export const fmt = (v: number | undefined, d: number) => (v === undefined ? '–' : v.toFixed(d));
