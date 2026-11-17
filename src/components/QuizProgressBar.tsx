import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { fadeTiming, standardSpring, useReduceMotion, useTheme } from '@/theme';

export type QuizProgressBarProps = {
  /** From 0 to 1. */
  progress: number;
  /** Read by VoiceOver, e.g. "Step 3 of 10". */
  accessibilityLabel: string;
};

const HEIGHT = 4;

/** The thin bar at the top of the quiz. It eases forward on the standard spring. */
export function QuizProgressBar({ progress, accessibilityLabel }: QuizProgressBarProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const clamped = Math.min(1, Math.max(0, progress));
  const fraction = useSharedValue(clamped);

  useEffect(() => {
    fraction.set(
      reduceMotion ? withTiming(clamped, fadeTiming(0)) : withSpring(clamped, standardSpring),
    );
  }, [clamped, fraction, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(1, Math.max(0, fraction.get())) * 100}%`,
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { backgroundColor: colors.hairline }]}>
      <Animated.View style={[styles.fill, { backgroundColor: colors.primary }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    overflow: 'hidden',
    flex: 1,
  },
  fill: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
  },
});
