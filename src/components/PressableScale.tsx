import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { duration, fadeTiming, pressedScale, useReduceMotion } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * The press feedback shared by every tappable card: it settles to 0.98 over
 * 120 ms and returns on release. With Reduce Motion on, the scale is replaced
 * by a soft dip in opacity. Runs on the UI thread.
 */
export function PressableScale({
  style,
  children,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReduceMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const amount = pressed.get();
    return reduceMotion
      ? { opacity: 1 - amount * 0.2 }
      : { transform: [{ scale: 1 - amount * (1 - pressedScale) }] };
  });

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        pressed.set(withTiming(1, fadeTiming(duration.press)));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.set(withTiming(0, fadeTiming(duration.press)));
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}
