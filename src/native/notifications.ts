import * as Notifications from 'expo-notifications';
import { log } from './log';
import type { ReminderPlan } from '../domain/reminders';
import type { Reading } from '../domain/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const MORNING_BODY = 'Go to the toilet first, then weigh in.';
const FOLLOW_UP_BODY = "Didn't catch your weigh-in. Open the app once so it can reconnect.";

export async function requestNotificationAccess(): Promise<boolean> {
  return (await Notifications.requestPermissionsAsync()).status === 'granted';
}

export async function notificationAccessState(): Promise<'granted' | 'denied' | 'undetermined'> {
  const p = await Notifications.getPermissionsAsync();
  return p.status === 'granted' ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

/** Fires in a few seconds, so permission and banner display can be checked on the spot. */
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Test notification', body: 'If you can read this, notifications work.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  });
}

// Calendar triggers are floating local times on iOS, so reminders follow the phone across time zones.
const date = (d: Date) =>
  ({
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(),
    repeats: false,
  }) as const;

/** Replaces every scheduled reminder with the plan. */
export async function applyPlan(plan: ReminderPlan): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const d of plan.morning) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Time to weigh in', body: MORNING_BODY },
      trigger: date(d),
    });
  }
  for (const d of plan.followUp) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'No weigh-in yet', body: FOLLOW_UP_BODY },
      trigger: date(d),
    });
  }
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await log(`reminders scheduled: ${pending.length} (permission ${(await Notifications.getPermissionsAsync()).status})`);
}

export function notifyInaccurate(r: Reading): void {
  Notifications.scheduleNotificationAsync({
    content: {
      title: 'That reading looks off',
      body: `${r.weightKg} kg doesn't fit your recent weigh-ins${r.flagReason ? `: ${r.flagReason}` : ''}. Step on again.`,
    },
    trigger: null,
  }).catch((e) => log(`notifyInaccurate failed: ${e?.message ?? e}`));
}
