import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';

export type SelectionMarkProps = {
  selected: boolean;
  /** Round for one-of-many, a soft square for many-of-many. */
  shape: 'round' | 'square';
};

const SIZE = 24;

/** The radio or checkbox mark at the end of an option. Decorative: the row carries the state. */
export function SelectionMark({ selected, shape }: SelectionMarkProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.mark,
        { borderRadius: shape === 'round' ? SIZE / 2 : 7 },
        selected
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { borderColor: colors.textSecondary },
      ]}>
      {selected ? <Icon name="check" size={14} color="onPrimary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: SIZE,
    height: SIZE,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
