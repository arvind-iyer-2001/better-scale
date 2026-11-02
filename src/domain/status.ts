export type IssueId = 'health' | 'notifications' | 'expiry';
export type Issue = { id: IssueId; title: string; detail: string };

type Input = {
  health: string | null; // 'authorized' | 'denied' | 'undetermined' | 'unavailable', null while unknown
  notifications: string | null; // 'granted' | 'denied' | 'undetermined', null while unknown
  daysLeft: number | null;
};

const DAY = 86_400_000;

/** Whole days left on a free-account install (7 days from the build time). */
export function daysLeft(builtAt: string | undefined, now: Date): number | null {
  if (!builtAt) return null;
  return Math.ceil((new Date(builtAt).getTime() + 7 * DAY - now.getTime()) / DAY);
}

/** Things that would silently stop the app working. Unknown (still loading) states report nothing. */
export function findIssues(i: Input): Issue[] {
  const out: Issue[] = [];
  if (i.health === 'denied' || i.health === 'undetermined') {
    out.push({ id: 'health', title: 'Apple Health is off', detail: 'Weigh-ins won\'t reach Health. Tap to allow.' });
  }
  if (i.notifications === 'denied' || i.notifications === 'undetermined') {
    out.push({ id: 'notifications', title: 'Notifications are off', detail: 'No reminders or "looks off" alerts. Tap to allow.' });
  }
  if (i.daysLeft !== null && i.daysLeft <= 2) {
    out.push(
      i.daysLeft <= 0
        ? { id: 'expiry', title: 'Install expired', detail: 'Reinstall from Xcode to keep recording.' }
        : { id: 'expiry', title: `Reinstall in ${i.daysLeft} day${i.daysLeft > 1 ? 's' : ''}`, detail: 'The free Apple account install is about to expire.' },
    );
  }
  return out;
}
