import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { radius, ringTiming, space, useTheme } from '@/theme';

import { Text } from './Text';

export type BarChartProps = {
  bars: {
    /** Under the bar, e.g. "W1". */
    label: string;
    value: number;
    /** Read by VoiceOver, e.g. "Week 1: 2 of 3". */
    spoken: string;
    /** The current period is labelled in Ink; the others in Slate. */
    isCurrent?: boolean;
  }[];
  /** A line across the chart: what she planned. */
  target: number;
  /** Captions the line, e.g. "Your plan: 3 a week". */
  targetLabel: string;
  /** Height of the bars' area in points. */
  height?: number;
};

/**
 * A small bar chart: a few bars against one target line. One colour, no
 * gridlines. Bars rise over 600 ms, ease-out, like the rings.
 */
export function BarChart({ bars, target, targetLabel, height = 112 }: BarChartProps) {
  const { colors } = useTheme();
  const top = Math.max(target, ...bars.map((bar) => bar.value), 1);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={[targetLabel, ...bars.map((bar) => bar.spoken)].join('. ')}
      style={styles.chart}>
      <Text variant="caption" color="textSecondary">
        {targetLabel}
      </Text>

      <View style={[styles.plot, { height }]}>
        {target > 0 ? (
          <View
            style={[
              styles.target,
              { bottom: (target / top) * height, borderColor: colors.textSecondary },
            ]}
          />
        ) : null}
        {bars.map((bar) => (
          <View key={bar.label} style={styles.column}>
            <Bar fraction={bar.value / top} height={height} />
          </View>
        ))}
      </View>

      <View style={styles.labels}>
        {bars.map((bar) => (
          <View key={bar.label} style={styles.column}>
            <Text variant="caption" weight="600" tabular>
              {bar.value}
            </Text>
            <Text variant="caption" color={bar.isCurrent ? 'text' : 'textSecondary'}>
              {bar.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Bar({ fraction, height }: { fraction: number; height: number }) {
  const { colors } = useTheme();
  const grown = useSharedValue(0);

  useEffect(() => {
    grown.set(withTiming(Math.min(1, Math.max(0, fraction)), ringTiming));
  }, [fraction, grown]);

  const barStyle = useAnimatedStyle(() => ({ height: grown.get() * height }));

  return (
    <>
      {/* A faint base, so an empty week still reads as a week. */}
      <View style={[styles.base, { backgroundColor: colors.hairline }]} />
      <Animated.View style={[styles.bar, { backgroundColor: colors.primary }, barStyle]} />
    </>
  );
}

const BAR_WIDTH = 28;

const styles = StyleSheet.create({
  chart: { gap: space.xs },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: BAR_WIDTH,
    borderTopLeftRadius: radius.input / 2,
    borderTopRightRadius: radius.input / 2,
  },
  base: {
    position: 'absolute',
    bottom: 0,
    width: BAR_WIDTH,
    height: 2,
  },
  target: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  labels: { flexDirection: 'row' },
});
