import { daysLeft, findIssues } from '../src/domain/status';

const ok = { health: 'authorized', notifications: 'granted', daysLeft: 5 } as const;

describe('findIssues', () => {
  it('reports nothing when everything is fine', () => {
    expect(findIssues(ok)).toEqual([]);
  });

  it('reports nothing while states are still unknown', () => {
    expect(findIssues({ health: null, notifications: null, daysLeft: null })).toEqual([]);
  });

  it('flags Health that is off or not yet asked', () => {
    expect(findIssues({ ...ok, health: 'denied' }).map((i) => i.id)).toEqual(['health']);
    expect(findIssues({ ...ok, health: 'undetermined' }).map((i) => i.id)).toEqual(['health']);
  });

  it('flags notifications that are off', () => {
    expect(findIssues({ ...ok, notifications: 'denied' }).map((i) => i.id)).toEqual(['notifications']);
  });

  it('flags an install that expires within 2 days, and one already expired', () => {
    expect(findIssues({ ...ok, daysLeft: 2 })[0].id).toBe('expiry');
    expect(findIssues({ ...ok, daysLeft: 3 })).toEqual([]);
    expect(findIssues({ ...ok, daysLeft: 0 })[0].title).toMatch(/expired/i);
  });

  it('orders Health, notifications, expiry', () => {
    const ids = findIssues({ health: 'denied', notifications: 'denied', daysLeft: 1 }).map((i) => i.id);
    expect(ids).toEqual(['health', 'notifications', 'expiry']);
  });
});

describe('daysLeft', () => {
  it('counts whole days remaining in the 7-day install', () => {
    const built = '2026-11-02T00:00:00.000Z';
    expect(daysLeft(built, new Date('2026-11-03T12:00:00Z'))).toBe(6);
    expect(daysLeft(built, new Date('2026-11-10T00:00:00Z'))).toBeLessThanOrEqual(0);
  });
  it('is null without a build date', () => {
    expect(daysLeft(undefined, new Date())).toBeNull();
  });
});
