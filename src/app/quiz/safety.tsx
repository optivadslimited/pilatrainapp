import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { afterSafetyCleared } from '@/features/onboarding/flow';
import { useOnboardingStore } from '@/features/onboarding/store';
import { useQuizNavigation } from '@/features/onboarding/useQuizNavigation';
import { t } from '@/strings';
import { space } from '@/theme';

/**
 * The safety gate. Shown when she picks "Pregnant or postpartum" or "Recent
 * injury or surgery". A full screen with one message and two honest choices.
 *
 * Nothing about this screen is sent to analytics: it only ever appears after an
 * answer about pregnancy or injury, so even "the gate was shown" would say more
 * than the single yes-or-no flag analytics is allowed.
 */
export default function SafetyGate() {
  const router = useRouter();
  const { go } = useQuizNavigation();
  const clearGate = useOnboardingStore((state) => state.clearGate);
  const checkFirst = useOnboardingStore((state) => state.checkFirst);

  const onCleared = () => {
    clearGate();
    // Replace, so going back from the next question skips this screen.
    go(afterSafetyCleared(), 'replace');
  };

  const onCheckFirst = () => {
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
