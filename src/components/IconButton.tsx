import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radius, size } from '@/theme';

import { Icon, type IconColor, type IconName } from './Icon';

export type IconButtonProps = {
  icon: IconName;
  /** Required: an icon button has no visible text, so VoiceOver needs this. */
  accessibilityLabel: string;
  onPress: () => void;
  color?: IconColor;
  iconSize?: number;
  disabled?: boolean;
  /** For a toggle, e.g. captions: whether it is on. */
  checked?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** A bare icon with a 44-point touch target. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = 'text',
  iconSize = size.icon,
  disabled = false,
  checked,
  style,
  testID,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      aria-checked={checked}
      aria-disabled={disabled}
      testID={testID}
      style={({ pressed }) => [styles.target, pressed && styles.pressed, style]}>
      <Icon name={icon} size={iconSize} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    minWidth: size.touchTarget,
    minHeight: size.touchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
