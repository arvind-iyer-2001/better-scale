import * as Notifications from 'expo-notifications';
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
      content: { title: 'Time to weigh in', body: MORNING_BODY, interruptionLevel: 'timeSensitive' },
      trigger: date(d),
    });
  }
  for (const d of plan.followUp) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'No weigh-in yet', body: FOLLOW_UP_BODY, interruptionLevel: 'timeSensitive' },
      trigger: date(d),
    });
  }
}

export function notifyInaccurate(r: Reading): void {
  Notifications.scheduleNotificationAsync({
    content: {
      title: 'That reading looks off',
      body: `${r.weightKg} kg doesn't fit your recent weigh-ins${r.flagReason ? `: ${r.flagReason}` : ''}. Step on again.`,
    },
    trigger: null,
  }).catch(() => {});
}
