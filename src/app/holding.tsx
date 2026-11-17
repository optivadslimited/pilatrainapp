import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, Screen, Text } from '@/components';
import { afterSafetyCleared } from '@/features/onboarding/flow';
import { useOnboardingStore } from '@/features/onboarding/store';
import { useQuizNavigation } from '@/features/onboarding/useQuizNavigation';
import { cancelHoldingReminder, scheduleHoldingReminder } from '@/lib/reminders';
import { t } from '@/strings';
import { space } from '@/theme';

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * The holding screen. She chose "I'll check first" at the safety gate, so her
 * answers are saved and the app waits here, without pressure, until she says
 * she has been cleared. She can ask for one reminder in a week.
 */
export default function Holding() {
  const { go } = useQuizNavigation();
  const clearGate = useOnboardingStore((state) => state.clearGate);
  const reminderAt = useOnboardingStore((state) => state.holdingReminderAt);
  const setHoldingReminder = useOnboardingStore((state) => state.setHoldingReminder);
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const onCleared = () => {
    cancelHoldingReminder();
    clearGate();
    go(afterSafetyCleared(), 'replace');
  };

  // This screen explains the reminder before the system prompt appears.
  const onRemind = async () => {
    setWorking(true);
    setProblem(null);
    const result = await scheduleHoldingReminder();
    setWorking(false);
    if (result.status === 'scheduled') setHoldingReminder(result.at.toISOString());
    else if (result.status === 'denied') setProblem(t.holding.reminderDenied);
    else setProblem(t.holding.reminderUnavailable);
  };

  return (
    <Screen
      testID="holding"
      footer={<Button label={t.holding.cleared} onPress={onCleared} testID="holding-cleared" />}>
      <View style={styles.message}>
        <Text variant="title">{t.holding.title}</Text>
        <Text variant="body" color="textSecondary">
          {t.holding.body}
        </Text>

        <View style={styles.reminder}>
          {reminderAt ? (
            <View style={styles.confirmed} accessible accessibilityLiveRegion="polite">
              <Icon name="bell" size={20} color="primary" />
              <Text variant="callout" color="primary" style={styles.fill}>
                {t.holding.reminderSet(formatDay(reminderAt))}
              </Text>
            </View>
          ) : (
            <>
              <Button
                label={t.holding.remind}
                variant="secondary"
                icon="bell"
                onPress={onRemind}
                loading={working}
                accessibilityHint={t.holding.remindWhy}
                testID="holding-remind"
              />
              <Text variant="caption" color="textSecondary" center accessibilityLiveRegion="polite">
                {problem ?? t.holding.remindWhy}
              </Text>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  message: {
    flex: 1,
    justifyContent: 'center',
    gap: space.md,
  },
  reminder: {
    marginTop: space.md,
    gap: space.xs,
  },
  confirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
});
