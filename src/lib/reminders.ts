import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '@/strings';

/**
 * Local notifications. We only ever ask for permission after one of our own
 * screens has explained why, never at launch.
 *
 * Milestone 1 uses this for a single thing: the optional "remind me in a
 * week" on the holding screen. Session reminders arrive in a later milestone.
 */
export type ReminderResult =
  { status: 'scheduled'; at: Date } | { status: 'denied' } | { status: 'unavailable' };

const HOLDING_REMINDER_ID = 'holding-reminder';
const WEEK_SECONDS = 7 * 24 * 60 * 60;

/** Asks for notification permission if it has not been decided yet. */
async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: false, allowBadge: false },
  });
  return asked.granted;
}

/**
 * Schedules one notification a week from now. Shows the system permission
 * prompt first if needed; the caller has already explained why on screen.
 */
export async function scheduleHoldingReminder(now: Date = new Date()): Promise<ReminderResult> {
  if (Platform.OS === 'web') return { status: 'unavailable' };

  try {
    if (!(await ensurePermission())) return { status: 'denied' };

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
