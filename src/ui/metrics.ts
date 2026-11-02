import type { MetricKey } from '../domain/types';
import { theme } from './theme';

export type MetricDef = { key: MetricKey; label: string; unit: string; color: string; decimals: number; about: string };

export const METRICS: MetricDef[] = [
  { key: 'weightKg', label: 'Weight', unit: 'kg', color: theme.red, decimals: 1, about: 'Your total body weight from the scale.' },
  { key: 'fatPct', label: 'Body fat', unit: '%', color: theme.red, decimals: 1, about: 'The share of your weight that is fat, estimated from how easily a tiny current passes through your body. This is the raw model value, so it can read a few points higher than the scale maker\'s own app, which adjusts it down.' },
  { key: 'fatKg', label: 'Fat mass', unit: 'kg', color: theme.red, decimals: 1, about: 'The weight of body fat: your weight times body fat percent.' },
  { key: 'muscleKg', label: 'Muscle', unit: 'kg', color: theme.lime, decimals: 1, about: 'Estimated muscle mass, including skeletal and smooth muscle.' },
  { key: 'musclePct', label: 'Muscle rate', unit: '%', color: theme.lime, decimals: 1, about: 'Muscle mass as a share of your body weight.' },
  { key: 'skeletalMuscleKg', label: 'Skeletal muscle', unit: 'kg', color: theme.lime, decimals: 1, about: 'Muscle attached to your skeleton, the muscle you train and move with.' },
  { key: 'ffmKg', label: 'Fat-free mass', unit: 'kg', color: theme.lime, decimals: 1, about: "Fat-free mass: everything that isn't fat, meaning muscle, water, bone and organs." },
  { key: 'waterPct', label: 'Water', unit: '%', color: theme.cyan, decimals: 1, about: 'The share of your weight that is water. It swings with hydration, so day-to-day changes are mostly noise.' },
  { key: 'proteinKg', label: 'Protein', unit: 'kg', color: theme.cyan, decimals: 1, about: 'Estimated protein mass, mostly found in muscle.' },
  { key: 'boneKg', label: 'Bone', unit: 'kg', color: theme.cyan, decimals: 1, about: 'Estimated bone mineral mass. It changes very slowly.' },
  { key: 'bmi', label: 'BMI', unit: '', color: theme.amber, decimals: 1, about: "Weight divided by height squared. A rough screen that can't tell muscle from fat." },
  { key: 'visceral', label: 'Visceral fat', unit: '', color: theme.amber, decimals: 0, about: 'Fat stored around your organs, on a scale of 1 to 50. Lower is better.' },
  { key: 'subcutPct', label: 'Subcutaneous fat', unit: '%', color: theme.red, decimals: 1, about: 'Fat stored under the skin, as a share of your body weight.' },
  { key: 'subcutKg', label: 'Subcutaneous fat', unit: 'kg', color: theme.red, decimals: 1, about: 'The weight of fat stored under the skin.' },
  { key: 'bmr', label: 'BMR', unit: 'kcal', color: theme.amber, decimals: 0, about: 'Calories your body burns at rest in a day, estimated from your profile and weight.' },
  { key: 'bodyAge', label: 'Body age', unit: 'y', color: theme.amber, decimals: 0, about: 'The age your body composition resembles, from a formula using BMI and age. Treat it as a rough guide, not a diagnosis.' },
  { key: 'idealWeightKg', label: 'Ideal weight', unit: 'kg', color: theme.lime, decimals: 1, about: "A reference weight for your height, from the scale's formula." },
];

export const fmt = (v: number | undefined, d: number) => (v === undefined ? '–' : v.toFixed(d));
