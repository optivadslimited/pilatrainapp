import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '@/strings';

/**
 * Local notifications. We only ever ask for permission after one of our own
 * screens has explained why, never at launch.
 *
 * Three things are scheduled, all on the phone itself:
 *  - the optional "remind me in a week" on the holding screen;
 *  - one reminder on each of her Pilates days, if she said yes to them;
 *  - one notice two days before her free week ends.
 *
 * What to schedule, and when, is decided in features/reminders/schedule.ts,
 * where it is tested. This file only talks to the system.
 *
 * NOT YET RUN ON A DEVICE: the web preview has no notifications.
 */
export type ReminderResult =
  { status: 'scheduled'; at: Date } | { status: 'denied' } | { status: 'unavailable' };

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

const HOLDING_REMINDER_ID = 'holding-reminder';
const WEEK_SECONDS = 7 * 24 * 60 * 60;

/** Where notification permission stands, without asking. */
export async function notificationPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'unavailable';
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    return current.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** Shows the system prompt if it has not been answered. The caller has already explained why. */
export async function requestNotificationPermission(): Promise<PermissionState> {
  const current = await notificationPermission();
  if (current !== 'undetermined') return current;
  try {
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: false, allowBadge: false },
    });
    return asked.granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** One notification, at a moment in time. */
export type ScheduledReminder = { id: string; at: Date; title: string; body: string };

/**
 * Replaces every scheduled notification whose id starts with `prefix` with
 * the ones given. Passing none clears them. Does nothing without permission.
 */
export async function replaceReminders(
  prefix: string,
  reminders: readonly ScheduledReminder[],
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      existing
        .filter((item) => item.identifier.startsWith(prefix))
        .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    );
    if (reminders.length === 0 || (await notificationPermission()) !== 'granted') return;

    for (const reminder of reminders) {
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: { title: reminder.title, body: reminder.body, sound: false },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.at },
      });
    }
  } catch {
    // A reminder that could not be set is not worth interrupting her for.
  }
}

/**
 * Schedules one notification a week from now. Shows the system permission
 * prompt first if needed; the caller has already explained why on screen.
 */
export async function scheduleHoldingReminder(now: Date = new Date()): Promise<ReminderResult> {
  if (Platform.OS === 'web') return { status: 'unavailable' };

  try {
    const permission = await requestNotificationPermission();
    if (permission === 'unavailable') return { status: 'unavailable' };
    if (permission !== 'granted') return { status: 'denied' };

    await Notifications.cancelScheduledNotificationAsync(HOLDING_REMINDER_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: HOLDING_REMINDER_ID,
      content: {
        title: t.holding.notificationTitle,
        body: t.holding.notificationBody,
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: WEEK_SECONDS,
      },
    });

    return { status: 'scheduled', at: new Date(now.getTime() + WEEK_SECONDS * 1000) };
  } catch {
    return { status: 'unavailable' };
  }
}

/** Cancels the holding reminder, once she is cleared and no longer needs it. */
export async function cancelHoldingReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(HOLDING_REMINDER_ID).catch(() => {});
}
