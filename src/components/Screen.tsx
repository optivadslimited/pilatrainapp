import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { screenMargin, space, useTheme } from '@/theme';

export type ScreenProps = {
  children: ReactNode;
  /** Scrolls the content. The footer stays fixed. */
  scroll?: boolean;
  /** Fixed to the bottom, above the home indicator. For the primary button. */
  footer?: ReactNode;
  /** Which safe-area edges to pad. Defaults to top and bottom. */
  edges?: readonly Edge[];
  /** Drops the 24-point side margin, for full-bleed content. */
  bleed?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The frame of every screen: Paper background, safe areas, the 24-point side
 * margin, and an optional fixed footer that moves with the keyboard.
 */
export function Screen({
  children,
  scroll = false,
  footer,
  edges = ['top', 'bottom'],
  bleed = false,
  contentStyle,
  testID,
}: ScreenProps) {
  const { colors } = useTheme();
  const margin = bleed ? 0 : screenMargin;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]} testID={testID}>
      <SafeAreaView edges={edges} style={styles.fill}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {scroll ? (
            <ScrollView
              style={styles.fill}
              contentContainerStyle={[
                { paddingHorizontal: margin, paddingBottom: space.lg },
                contentStyle,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.fill, { paddingHorizontal: margin }, contentStyle]}>
              {children}
            </View>
          )}
          {footer ? (
            <View style={[styles.footer, { paddingHorizontal: screenMargin }]}>{footer}</View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: {
    paddingTop: space.sm,
    paddingBottom: space.md,
    gap: space.xs,
  },
});
