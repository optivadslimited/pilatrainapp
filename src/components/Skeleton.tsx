import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { duration, easeInOut, radius, useTheme } from '@/theme';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  /** Width divided by height, as an alternative to a fixed height. */
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A quiet Sand block that stands in for content while it loads. It breathes
 * in opacity, slowly. No shimmer and no gradient.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.input,
  aspectRatio,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const breath = useSharedValue(0);

  useEffect(() => {
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
  }, [breath]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: 1 - breath.get() * 0.45 }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height: aspectRatio ? undefined : height,
          aspectRatio,
          borderRadius,
          backgroundColor: colors.surface,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
