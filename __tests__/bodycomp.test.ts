import { computeMetrics } from '../src/domain/bodycomp';
import golden from './golden/legs140.json';

type Case = {
  male: boolean; athlete: boolean; heightCm: number; ageYears: number;
  weightX10: number; impedanceOhm: number; expected: Record<string, number>;
};

describe('computeMetrics golden vectors', () => {
  it('matches every golden case exactly', () => {
    const bad: string[] = [];
    (golden as Case[]).forEach((c, i) => {
      const m = computeMetrics(
        { sex: c.male ? 'male' : 'female', athlete: c.athlete, heightCm: c.heightCm, ageYears: c.ageYears },
        c.weightX10 / 10,
        c.impedanceOhm,
      );
      for (const [k, v] of Object.entries(c.expected)) {
        if ((m as Record<string, number>)[k] !== v) bad.push(`case ${i} ${k}: got ${(m as any)[k]} want ${v}`);
      }
    });
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('real weigh-in gives the unadjusted 38.6% body fat, not Cult Connect 34.6', () => {
    const m = computeMetrics({ sex: 'male', athlete: false, heightCm: 180, ageYears: 25 }, 124.7, 416);
    expect(m.fatPct).toBe(38.6);
    expect(m.bmi).toBe(38.4);
    expect(m.bmr).toBe(2382);
  });
});

describe('computeMetrics validity gates', () => {
  const base = { sex: 'male' as const, athlete: false, heightCm: 180, ageYears: 25 };
  const onlyWeightBmi = (m: object) => expect(Object.keys(m).sort()).toEqual(['bmi', 'weightKg']);

  it('null impedance gives weight and BMI only', () => onlyWeightBmi(computeMetrics(base, 124.7, null)));
  it('impedance out of range gives weight and BMI only', () => onlyWeightBmi(computeMetrics(base, 124.7, 150)));
  it('age outside 6..99', () => {
    onlyWeightBmi(computeMetrics({ ...base, ageYears: 5 }, 124.7, 416));
    onlyWeightBmi(computeMetrics({ ...base, ageYears: 100 }, 124.7, 416));
  });
  it('height outside 90..220', () => {
    onlyWeightBmi(computeMetrics({ ...base, heightCm: 89 }, 124.7, 416));
    onlyWeightBmi(computeMetrics({ ...base, heightCm: 221 }, 124.7, 416));
  });
  it('weight outside 10..200 kg', () => {
    onlyWeightBmi(computeMetrics(base, 9.9, 416));
    onlyWeightBmi(computeMetrics(base, 200.5, 416));
  });
});
