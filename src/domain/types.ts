export type MetricKey =
  | 'weightKg' | 'bmi' | 'fatPct' | 'fatKg' | 'subcutPct' | 'subcutKg'
  | 'visceral' | 'muscleKg' | 'musclePct' | 'skeletalMuscleKg' | 'waterPct'
  | 'proteinKg' | 'boneKg' | 'bmr' | 'bodyAge' | 'idealWeightKg' | 'ffmKg';

export type Metrics = Partial<Record<MetricKey, number>>;

export type Profile = {
  sex: 'male' | 'female';
  heightCm: number;
  birthDate: string; // YYYY-MM-DD
  athlete: boolean;
  goalWeightKg: number | null;
};

export type Settings = {
  reminderTime: string; // HH:MM local
  cutoffTime: string; // HH:MM local
  reminderEnabled: boolean;
};

export type Reading = {
  id: number;
  ts: number; // epoch ms
  rawHex: string;
  weightKg: number;
  impedanceOhm: number | null;
  metrics: Metrics;
  flagged: boolean;
  flagReason: string | null;
  confirmed: boolean;
  healthSynced: boolean;
};
