import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import {
  duration,
  fadeIn,
  radius,
  screenMargin,
  softShadow,
  space,
  standardSpring,
  useReduceMotion,
  useTheme,
} from '@/theme';

import { Text } from './Text';

/** Where it appears. The top is for screens whose foot is full of buttons. */
type ToastPosition = 'bottom' | 'top';

type ToastState = {
  toast: { id: number; message: string; position: ToastPosition } | null;
  show: (message: string, position?: ToastPosition) => void;
  hide: () => void;
};

const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (message, position = 'bottom') => set({ toast: { id: Date.now(), message, position } }),
  hide: () => set({ toast: null }),
}));

/** High enough to sit above a tab bar or a screen's fixed button, never on top of it. */
const CLEARANCE = 96;

/**
 * Show a short message. It leaves by itself. It sits at the foot of the screen
 * unless `showAtTop` is used, which is for the moment she moves to a screen
 * with several buttons at its foot.
 */
export const toast = {
  show: (message: string) => useToastStore.getState().show(message),
  showAtTop: (message: string) => useToastStore.getState().show(message, 'top'),
  hide: () => useToastStore.getState().hide(),
};

/**
 * Renders the current toast. Mounted once, in the root layout. The message is
 * also announced to VoiceOver.
 */
export function ToastHost() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const current = useToastStore((state) => state.toast);
  const hide = useToastStore((state) => state.hide);

  useEffect(() => {
    if (!current) return;
    AccessibilityInfo.announceForAccessibility(current.message);
    const timer = setTimeout(hide, duration.toast);
    return () => clearTimeout(timer);
  }, [current, hide]);

  if (!current) return null;

  const atTop = current.position === 'top';
  const entering = reduceMotion
    ? fadeIn()
    : (atTop ? FadeInUp : FadeInDown)
        .springify()
        .damping(standardSpring.damping)
        .stiffness(standardSpring.stiffness)
        .mass(standardSpring.mass);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        atTop
          ? { justifyContent: 'flex-start', paddingTop: insets.top + space.sm }
          : { paddingBottom: insets.bottom + CLEARANCE },
      ]}>
      <Animated.View
        key={current.id}
        entering={entering}
        exiting={FadeOut.duration(duration.fade).reduceMotion(ReduceMotion.Never)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        testID="toast"
        style={[styles.toast, softShadow, { backgroundColor: colors.surfaceDark }]}>
        <Text variant="callout" color="onDark" center>
          {current.message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: screenMargin,
  },
  toast: {
    borderRadius: radius.card,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    maxWidth: 420,
  },
});
