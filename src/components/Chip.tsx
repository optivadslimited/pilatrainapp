import { Pressable, StyleSheet, View } from 'react-native';

import { radius, size, space, useTheme } from '@/theme';

import { Text } from './Text';

export type ChipProps = {
  label: string;
  /** Mist tint and Moss text. */
  selected?: boolean;
  /** Makes the chip a filter you can tap. Without it the chip is a plain label. */
  onPress?: () => void;
  testID?: string;
};

const VISUAL_HEIGHT = 36;
/** Extends the tappable area to the 44-point minimum without changing the look. */
const HIT_SLOP = (size.touchTarget - VISUAL_HEIGHT) / 2;

/** A small label: a plan summary ("20 min") or a filter in the class library. */
export function Chip({ label, selected = false, onPress, testID }: ChipProps) {
  const { colors } = useTheme();

  const body = (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.selectedTint : colors.surface,
          borderColor: selected ? colors.primary : colors.surface,
        },
      ]}>
      <Text variant="callout" weight="500" color={selected ? 'primary' : 'text'}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      testID={testID}
      style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: VISUAL_HEIGHT,
    borderRadius: radius.chip,
    borderWidth: 1,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  pressed: { opacity: 0.7 },
});
