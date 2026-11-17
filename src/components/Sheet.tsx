import type { NativeStackNavigationOptions } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/strings';
import { lightColors, radius, screenMargin, space, useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

/**
 * Modals are sheets with detents. A sheet is a route presented by the native
 * stack, so it gets the system's own physics, grabber and swipe-to-dismiss.
 *
 * In a layout:
 *   <Stack.Screen name="class/[id]" options={sheetOptions([0.6, 1])} />
 * In the route file, wrap the content in <Sheet>.
 *
 * @param detents Heights the sheet can rest at, as fractions of the screen,
 *   smallest first. Or 'fitToContents'.
 */
export function sheetOptions(
  detents: number[] | 'fitToContents' = [0.5, 1],
): NativeStackNavigationOptions {
  return {
    presentation: 'formSheet',
    sheetAllowedDetents: detents,
    sheetGrabberVisible: true,
    sheetCornerRadius: radius.sheet,
    headerShown: false,
    contentStyle: { backgroundColor: lightColors.background },
  };
}

export type SheetProps = {
  title?: string;
  children: ReactNode;
  /** Fixed to the bottom of the sheet. For its primary button. */
  footer?: ReactNode;
  /** Shows a close button. Swiping down always works too. */
  onClose?: () => void;
  /** Scrolls the content. On by default. */
  scroll?: boolean;
  testID?: string;
};

/** The inside of a sheet: Paper, a title row, the 24-point margin, an optional fixed footer. */
export function Sheet({ title, children, footer, onClose, scroll = true, testID }: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const body = (
    <>
      {title || onClose ? (
        <View style={styles.header}>
          <View style={styles.title}>{title ? <Text variant="heading">{title}</Text> : null}</View>
          {onClose ? (
            <IconButton
              icon="close"
              accessibilityLabel={t.common.close}
              onPress={onClose}
              testID="sheet-close"
            />
          ) : null}
        </View>
      ) : null}
      {children}
    </>
  );

  return (
    <View style={[styles.sheet, { backgroundColor: colors.background }]} testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{body}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  fill: { flex: 1 },
  content: {
    paddingHorizontal: screenMargin,
    // Clears the grabber.
    paddingTop: space.xl,
    paddingBottom: space.lg,
    gap: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  title: { flex: 1 },
  footer: {
    paddingHorizontal: screenMargin,
    paddingTop: space.sm,
    gap: space.xs,
  },
});
