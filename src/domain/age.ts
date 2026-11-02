/** Completed years between birthDate (YYYY-MM-DD, local) and atMs. */
export function ageYears(birthDate: string, atMs: number): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  const at = new Date(atMs);
  let age = at.getFullYear() - y;
  if (at.getMonth() + 1 < m || (at.getMonth() + 1 === m && at.getDate() < d)) age--;
  return age;
}
