import { StyleSheet, View } from 'react-native';

import { t } from '@/strings';
import { size, useTheme } from '@/theme';

import { Text } from './Text';

export type MonthGridProps = {
  /** One entry per cell, Monday first. `null` pads the start of the first week. */
  days: ({ date: string; day: number; trained: boolean; isToday: boolean } | null)[];
  /** Read by VoiceOver in place of the grid, e.g. "November 2026. 5 days with a session this month." */
  accessibilityLabel: string;
};

const COLUMNS = 7;

/**
 * A month at a glance: a dot under each day she trained, and today outlined.
 * It is read to VoiceOver as one sentence, not thirty separate days.
 */
export function MonthGrid({ days, accessibilityLabel }: MonthGridProps) {
  const { colors } = useTheme();
  const rows = Array.from({ length: Math.ceil(days.length / COLUMNS) }, (_, row) =>
    Array.from({ length: COLUMNS }, (_, column) => days[row * COLUMNS + column] ?? null),
  );

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View style={styles.row}>
        {t.weekdays.letter.map((letter, index) => (
          <View key={index} style={styles.cell}>
            <Text variant="caption" color="textSecondary" weight="600">
              {letter}
            </Text>
          </View>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((day, column) => (
            <View key={column} style={styles.cell}>
              {day ? (
                <View
                  style={[
                    styles.day,
                    day.isToday && { borderColor: colors.primary, borderWidth: 1.5 },
                  ]}>
                  <Text variant="caption" tabular color={day.trained ? 'text' : 'textSecondary'}>
                    {day.day}
                  </Text>
                  <View style={[styles.dot, day.trained && { backgroundColor: colors.primary }]} />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: {
    flex: 1,
    height: size.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    width: 36,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
