import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Wordmark } from '@/components';
import { launchTarget } from '@/features/onboarding/flow';
import { useOnboardingStore } from '@/features/onboarding/store';
import { duration, fadeTiming, useTheme } from '@/theme';

/** How long the wordmark rests, fully visible, before the first screen. */
const REST_MS = 250;

/**
 * Launch. A Paper screen, identical to the native splash it replaces, on which
 * the wordmark fades in over 400 ms. Then she is sent on:
 *
 *   quiz not finished        → Welcome
 *   said "I'll check first"  → the holding screen
 *   quiz finished            → Today
 *
 * Membership does not change where she lands: without one, Today itself
 * shows her plan with "Continue your plan" on the session.
 */
export default function Launch() {
  const { colors } = useTheme();
  const router = useRouter();
  const opacity = useSharedValue(0);

  useEffect(() => {
    // This screen is now on display, so the native splash can go.
    SplashScreen.hideAsync().catch(() => {});
    opacity.set(withTiming(1, fadeTiming(duration.wordmark)));

    const timer = setTimeout(() => {
      // Read at the moment of routing; persisted state is loaded synchronously from MMKV.
      const target = launchTarget(useOnboardingStore.getState().status);
      if (target === 'home') router.replace('/today');
      else if (target === 'holding') router.replace('/holding');
      else router.replace('/welcome');
    }, duration.wordmark + REST_MS);

    return () => clearTimeout(timer);
  }, [opacity, router]);

  const wordmarkStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="launch">
      <Animated.View style={wordmarkStyle}>
        <Wordmark size={44} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
