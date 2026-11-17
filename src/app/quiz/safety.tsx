import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { afterSafetyCleared } from '@/features/onboarding/flow';
import { useOnboardingStore } from '@/features/onboarding/store';
import { useQuizNavigation } from '@/features/onboarding/useQuizNavigation';
import { track } from '@/lib/analytics';
import { t } from '@/strings';
import { space } from '@/theme';

/**
 * The safety gate. Shown when she picks "Pregnant or postpartum" or "Recent
 * injury or surgery". A full screen with one message and two honest choices.
 *
 * Which of the two answers brought her here is never sent to analytics: only
 * that the gate was shown, and which button she pressed.
 */
export default function SafetyGate() {
  const router = useRouter();
  const { go } = useQuizNavigation();
  const clearGate = useOnboardingStore((state) => state.clearGate);
  const checkFirst = useOnboardingStore((state) => state.checkFirst);

  useEffect(() => {
    track('safety_gate_shown');
  }, []);

  const onCleared = () => {
    track('safety_gate_choice', { choice: 'cleared' });
    clearGate();
    // Replace, so going back from the next question skips this screen.
    go(afterSafetyCleared(), 'replace');
  };

  const onCheckFirst = () => {
    track('safety_gate_choice', { choice: 'check_first' });
    checkFirst();
    router.replace('/holding');
  };

  return (
    <Screen
      edges={['bottom']}
      testID="safety-gate"
      footer={
        <>
          <Button label={t.safety.cleared} onPress={onCleared} testID="safety-cleared" />
          <Button
            label={t.safety.checkFirst}
            variant="secondary"
            onPress={onCheckFirst}
            testID="safety-check-first"
          />
        </>
      }>
      <View style={styles.message}>
        <Text variant="title">{t.safety.title}</Text>
        <Text variant="body" color="textSecondary">
          {t.safety.body}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: {
    flex: 1,
    justifyContent: 'center',
    gap: space.md,
  },
});
