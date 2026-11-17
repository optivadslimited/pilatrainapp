import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { duration, easeInOut, ringTiming, useReduceMotion, useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type RingProps = {
  /** From 0 to 1. Changes fill over 600 ms, ease-out. */
  progress: number;
  /** Outer diameter in points. */
  size?: number;
  strokeWidth?: number;
  /** Slowly swells and settles, like a breath. For the plan-building screen. */
  breathing?: boolean;
  /** Sits in the centre, e.g. "2 of 3". */
  children?: ReactNode;
  /** Read by VoiceOver in place of the drawing, e.g. "2 of 3 sessions this week". */
  accessibilityLabel?: string;
};

/** A progress ring. Drawn with SVG and animated on the UI thread. */
export function Ring({
  progress,
  size = 120,
  strokeWidth = 10,
  breathing = false,
  children,
  accessibilityLabel,
}: RingProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();

  const centre = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));

  const fraction = useSharedValue(0);
  const breath = useSharedValue(0);

  useEffect(() => {
    fraction.set(withTiming(clamped, ringTiming));
  }, [clamped, fraction]);

  useEffect(() => {
    if (!breathing) {
      cancelAnimation(breath);
      breath.set(0);
      return;
    }
    breath.set(
      withRepeat(
        withTiming(1, {
          duration: duration.breath / 2,
          easing: easeInOut,
          reduceMotion: ReduceMotion.Never,
        }),
        -1,
        true,
        undefined,
        ReduceMotion.Never,
      ),
    );
    return () => cancelAnimation(breath);
  }, [breathing, breath]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fraction.get()),
  }));

  // Breathing is a gentle swell. With Reduce Motion on it becomes a slow fade instead.
  const breathStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - breath.get() * 0.35 }
      : { transform: [{ scale: 1 + breath.get() * 0.06 }] },
  );

  return (
    <View
      accessible={accessibilityLabel !== undefined}
      accessibilityRole={accessibilityLabel !== undefined ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, breathStyle]}>
        {/* Turned a quarter so the arc starts at twelve o'clock. */}
        <Svg width={size} height={size} style={styles.fromTop}>
          <Circle
            cx={centre}
            cy={centre}
            r={r}
            stroke={colors.hairline}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={centre}
            cy={centre}
            r={r}
            stroke={colors.primary}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={arcProps}
            fill="none"
          />
        </Svg>
      </Animated.View>
      {children ? <View style={[StyleSheet.absoluteFill, styles.centre]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', justifyContent: 'center' },
  fromTop: { transform: [{ rotate: '-90deg' }] },
});
