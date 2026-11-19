import type { NativeStackNavigationOptions } from 'expo-router';
import { useState, type ReactNode } from 'react';
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

/**
 * The inside of a sheet: Paper, a title row, the 24-point margin, an optional
 * fixed footer.
 *
 * How it is laid out is dictated by the native sheet. On iOS the sheet takes
 * the ScrollView it finds and sizes it to fill the whole sheet, whatever
 * else is beside it. So the footer is not stacked under the scroll area: it
 * is an opaque bar laid over the bottom of it, and the content is padded by
 * the bar's height so its last line can always be scrolled clear.
 */
export function Sheet({ title, children, footer, onClose, scroll = true, testID }: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);

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

  // Room for the footer bar, so nothing ends up underneath it.
  const clearFooter = footer ? { paddingBottom: footerHeight + space.lg } : null;

  return (
    // `collapsable={false}` keeps this view in the native hierarchy. Flattened
    // away, the native sheet mistakes its children for a header and a list
    // and sizes the ScrollView to nothing: a blank sheet.
    <View
      collapsable={false}
      style={[styles.sheet, { backgroundColor: colors.background }]}
      testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, clearFooter]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, clearFooter]}>{body}</View>
      )}
      {footer ? (
        <View
          onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, space.md),
            },
          ]}>
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: screenMargin,
    paddingTop: space.sm,
    gap: space.xs,
  },
});
