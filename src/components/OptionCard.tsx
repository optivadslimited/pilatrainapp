import { StyleSheet, View } from 'react-native';

import { selectionTap } from '@/lib/haptics';
import { radius, space, useTheme } from '@/theme';

import { PressableScale } from './PressableScale';
import { SelectionMark } from './SelectionMark';
import { Text } from './Text';

export type OptionCardProps = {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** `single`: one of many (a radio). `multi`: any of many (a checkbox). */
  mode?: 'single' | 'multi';
  disabled?: boolean;
  testID?: string;
};

/**
 * One answer in the quiz. Settles to 0.98 on press, and gives a light tap
 * when it becomes selected.
 */
export function OptionCard({
  label,
  description,
  selected,
  onPress,
  mode = 'single',
  disabled = false,
  testID,
}: OptionCardProps) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={() => {
        if (!selected) selectionTap();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole={mode === 'single' ? 'radio' : 'checkbox'}
      accessibilityLabel={description ? `${label}. ${description}` : label}
      accessibilityState={mode === 'single' ? { selected, disabled } : { checked: selected, disabled }}
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.selectedTint : colors.surface,
          borderColor: selected ? colors.primary : colors.surface,
        },
      ]}>
      <View style={styles.text}>
        <Text variant="body" weight="500">
          {label}
        </Text>
        {description ? (
          <Text variant="callout" color="textSecondary">
            {description}
          </Text>
        ) : null}
      </View>
      <SelectionMark selected={selected} shape={mode === 'single' ? 'round' : 'square'} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 64,
    borderRadius: radius.card,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  text: { flex: 1, gap: space.xxs },
});
