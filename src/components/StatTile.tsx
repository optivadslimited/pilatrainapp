import { StyleSheet, View } from 'react-native';

import { radius, space, useTheme } from '@/theme';

import { Text } from './Text';

export type StatTileProps = {
  /** The figure, already formatted, e.g. "12" or "240". */
  value: string;
  /** What it counts, e.g. "Sessions completed". */
  label: string;
  testID?: string;
};

/** One statistic on the Progress tab. The figure is set in tabular numerals. */
export function StatTile({ value, label, testID }: StatTileProps) {
  const { colors } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${value} ${label}`}
      testID={testID}
      style={[styles.tile, { backgroundColor: colors.surface }]}>
      <Text tabular weight="600" style={styles.value}>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: radius.card,
    padding: space.md,
    gap: space.xxs,
  },
  // Display size, in the system font so the numerals are truly tabular.
  value: { fontSize: 34, lineHeight: 38 },
});
