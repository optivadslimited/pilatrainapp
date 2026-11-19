import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Photo, Text, toast } from '@/components';
import { standInPhotos } from '@/config/photos';
import { accountsAvailable } from '@/features/account/account';
import { QUESTIONS } from '@/features/onboarding/questions';
import { useOnboardingStore } from '@/features/onboarding/store';
import { track } from '@/lib/analytics';
import { t } from '@/strings';
import { screenMargin, space, useTheme } from '@/theme';

/**
 * Welcome. A photo fills the top 60% of the screen: the instructor's once it
 * exists, a stand-in until then. The headline, one line and two actions sit
 * beneath it.
 */
export default function Welcome() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const start = useOnboardingStore((state) => state.start);

  const buildPlan = () => {
    track('onboarding_started');
    start();
    router.push({ pathname: '/quiz/[step]', params: { step: QUESTIONS[0].id } });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="welcome">
      {/* TODO(owner): instructor hero photo, 3:4, warm daylight, neutral clothing, a real room.
          A stand-in is shown until then: it is not the instructor (src/config/photos.ts). */}
      <Photo
        source={standInPhotos.welcome}
        label={t.welcome.photoLabel}
        alt={t.welcome.photoAlt}
        borderRadius={0}
        style={styles.photo}
        testID="welcome-photo"
      />

      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <View style={styles.copy}>
          <Text variant="display">{t.welcome.headline}</Text>
          <Text variant="body" color="textSecondary">
            {t.welcome.line}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button label={t.welcome.primary} onPress={buildPlan} testID="welcome-build-plan" />
          <Button
            label={t.welcome.signIn}
            variant="text"
            onPress={() =>
              accountsAvailable ? router.push('/sign-in') : toast.show(t.account.unavailable)
            }
            testID="welcome-sign-in"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // The photo takes what the content leaves: 60% of the screen at default text
  // sizes, a little less when Dynamic Type makes the copy taller.
  photo: { flex: 1 },
  content: {
    minHeight: '40%',
    paddingHorizontal: screenMargin,
    paddingTop: space.lg,
    justifyContent: 'space-between',
    gap: space.lg,
  },
  copy: { gap: space.xs },
  actions: { gap: space.xxs },
});
