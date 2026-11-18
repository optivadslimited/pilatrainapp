import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, Screen, Text, toast } from '@/components';
import { useContinue } from '@/features/onboarding/useContinue';
import { useOnboardingStore } from '@/features/onboarding/store';
import { useCurrentPlan } from '@/features/plan/queries';
import { useReminderStore } from '@/features/reminders/store';
import { reminderTime } from '@/features/reminders/sync';
import { track } from '@/lib/analytics';
import { formatTime, weekdayList } from '@/lib/format';
import { requestNotificationPermission } from '@/lib/reminders';
import { useGoBack } from '@/lib/useGoBack';
import { t } from '@/strings';
import { radius, space, useTheme } from '@/theme';

/**
 * The reminder question, on a screen of its own: "Want a nudge on your
 * Pilates days?" It shows the days and the time she chose, so she knows
 * exactly what she is saying yes to. "Yes, remind me" opens the system
 * prompt; "Not now" moves on, and it is never asked again unless she turns
 * reminders on herself on the You tab.
 */
export default function Reminders() {
  const { colors } = useTheme();
  const next = useContinue();
  const goBack = useGoBack('/today');
  const { then } = useLocalSearchParams<{ then?: string }>();
  const plan = useCurrentPlan().data;
  const answers = useOnboardingStore((state) => state.answers);
  const setEnabled = useReminderStore((state) => state.setEnabled);
  const markAsked = useReminderStore((state) => state.markAsked);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    track('push_prompt_shown');
  }, []);

  const weekdays = plan?.profile.weekdays ?? answers.weekdays ?? [];
  const leave = () => (then === 'continue' ? next.home() : goBack());

  const yes = async () => {
    if (busy) return;
    setBusy(true);
    const permission = await requestNotificationPermission();
    setBusy(false);

    if (permission === 'granted') {
      setEnabled(true);
      track('push_enabled');
      toast.show(t.reminders.on);
    } else {
      setEnabled(false);
      toast.show(
        permission === 'denied' ? t.holding.reminderDenied : t.holding.reminderUnavailable,
      );
    }
    leave();
  };

  const notNow = () => {
    markAsked();
    leave();
  };

  return (
    <Screen
      testID="reminders"
      footer={
        <>
          <Button label={t.reminders.yes} onPress={yes} loading={busy} testID="reminders-yes" />
          <Button
            label={t.common.notNow}
            variant="text"
            onPress={notNow}
            disabled={busy}
            testID="reminders-not-now"
          />
        </>
      }>
      <View style={styles.copy}>
        <Icon name="bell" size={28} color="primary" />
        <Text variant="display">{t.reminders.title}</Text>
        <Text variant="body" color="textSecondary">
          {t.reminders.body}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Row label={t.reminders.days} value={weekdayList(weekdays)} testID="reminders-days" />
        <View style={[styles.rule, { backgroundColor: colors.hairline }]} />
        <Row label={t.reminders.time} value={formatTime(reminderTime())} testID="reminders-time" />
      </View>
    </Screen>
  );
}

function Row({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="body" color="textSecondary" style={styles.fill}>
        {label}
      </Text>
      <Text variant="body" weight="600" tabular testID={testID}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  copy: { gap: space.sm, paddingTop: space.xxl },
  card: {
    marginTop: space.xl,
    borderRadius: radius.card,
    paddingHorizontal: space.md,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  rule: { height: StyleSheet.hairlineWidth },
});
