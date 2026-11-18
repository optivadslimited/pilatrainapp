import { Pressable, StyleSheet, View } from 'react-native';

import { size, space, useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text, type TextColor } from './Text';

export type ListRowProps = {
  label: string;
  /** Shown at the end of the row, e.g. the app version. */
  value?: string;
  /** Makes the row tappable and adds a chevron. */
  onPress?: () => void;
  color?: TextColor;
  /** Draws a hairline under the row. On by default. */
  divider?: boolean;
  testID?: string;
};

/** One line in a settings list, as on the You tab. */
export function ListRow({
  label,
  value,
  onPress,
  color = 'text',
  divider = true,
  testID,
}: ListRowProps) {
  const { colors } = useTheme();

  const content = (
    <View
      // A row that cannot be pressed carries the test ID itself.
      testID={onPress ? undefined : testID}
      style={[
        styles.row,
        divider && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.hairline,
        },
      ]}>
      <Text variant="body" color={color} style={styles.label}>
        {label}
      </Text>
      {value ? (
        <Text variant="body" color="textSecondary" tabular>
          {value}
        </Text>
      ) : null}
      {onPress ? <Icon name="chevronRight" size={16} color="textSecondary" /> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: size.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
  },
  label: { flex: 1 },
  pressed: { opacity: 0.6 },
});
