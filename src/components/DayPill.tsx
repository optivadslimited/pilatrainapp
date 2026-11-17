import { StyleSheet, View } from 'react-native';

import { selectionTap } from '@/lib/haptics';
import { radius, space, useTheme } from '@/theme';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text, type TextColor } from './Text';

/** How a day reads in the week strip on Today. */
export type DayState = 'done' | 'today' | 'planned' | 'rest';

type Common = {
  /** One letter, e.g. "M". */
  letter: string;
  /** The full day and its state, e.g. "Monday, done". */
  accessibilityLabel: string;
  testID?: string;
};

export type DayPillProps = Common &
  (
    | {
        /** Week strip: done is filled Moss with a tick, today is outlined, planned has a dot, rest is empty. */
        state: DayState;
      }
    | {
        /** Day picker: a pill you can switch on and off. */
        selected: boolean;
        onPress: () => void;
        disabled?: boolean;
      }
  );

const HEIGHT = 64;
const MARK = 16;

/** One day of the week. Used as a status in the week strip and as a toggle in the day picker. */
export function DayPill(props: DayPillProps) {
  const { colors } = useTheme();
  const { letter, accessibilityLabel, testID } = props;

  if ('state' in props) {
    const { state } = props;
    const filled = state === 'done';
    const letterColor: TextColor = filled ? 'onPrimary' : state === 'rest' ? 'textSecondary' : 'text';

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={[
          styles.pill,
          {
            backgroundColor: filled ? colors.primary : 'transparent',
            borderColor: filled || state === 'today' ? colors.primary : 'transparent',
          },
        ]}>
        <Text variant="caption" weight="600" color={letterColor}>
          {letter}
        </Text>
        <View style={styles.mark}>
          {state === 'done' ? <Icon name="check" size={14} color="onPrimary" /> : null}
          {state === 'planned' ? (
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          ) : null}
        </View>
      </View>
    );
  }

  const { selected, onPress, disabled = false } = props;

  return (
    <PressableScale
      onPress={() => {
        if (!selected) selectionTap();
        onPress();
      }}
      disabled={disabled}
      hitSlop={{ left: 2, right: 2 }}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: selected, disabled }}
      testID={testID}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? colors.selectedTint : colors.surface,
          borderColor: selected ? colors.primary : colors.surface,
        },
      ]}>
      <Text variant="caption" weight="600" color={selected ? 'primary' : 'text'}>
        {letter}
      </Text>
      <View style={styles.mark}>
        {selected ? <Icon name="check" size={14} color="primary" /> : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    minHeight: HEIGHT,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    paddingVertical: space.xs,
  },
  mark: {
    width: MARK,
    height: MARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
