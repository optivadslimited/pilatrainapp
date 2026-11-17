import { Pressable, StyleSheet } from 'react-native';

import { selectionTap } from '@/lib/haptics';
import { size, space } from '@/theme';

import { SelectionMark } from './SelectionMark';
import { Text } from './Text';

export type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testID?: string;
};

/** A tick box with its sentence beside it. The whole row is the touch target. */
export function Checkbox({ label, checked, onChange, testID }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => {
        if (!checked) selectionTap();
        onChange(!checked);
      }}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      aria-checked={checked}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <SelectionMark selected={checked} shape="square" />
      <Text variant="body" style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: size.touchTarget,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingVertical: space.xs,
  },
  label: { flex: 1 },
  pressed: { opacity: 0.7 },
});
