import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radius, size, space, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text, type TextColor } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'text';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  /** Primary: Moss fill, Paper text. Secondary: Sand fill, Ink text. Text: no fill. */
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Shows a spinner and blocks presses. The label stays for VoiceOver. */
  loading?: boolean;
  icon?: IconName;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Primary and secondary buttons are 56-point pills. The height is a minimum,
 * so the label can wrap at large Dynamic Type sizes without clipping.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const fill = (pressed: boolean): string | undefined => {
    if (variant === 'text') return undefined;
    if (disabled) return colors.surface;
    if (variant === 'primary') return pressed ? colors.primaryPressed : colors.primary;
    return pressed ? colors.hairline : colors.surface;
  };

  const labelColor: TextColor = disabled
    ? 'textSecondary'
    : variant === 'primary'
      ? 'onPrimary'
      : variant === 'secondary'
        ? 'text'
        : 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        variant === 'text' ? styles.text : styles.pill,
        { backgroundColor: fill(pressed) },
        variant === 'text' && pressed && styles.textPressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors[labelColor]} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size.iconSmall} color={labelColor} /> : null}
          <Text variant="button" color={labelColor} center>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: size.buttonHeight,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  text: {
    minHeight: size.touchTarget,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  textPressed: { opacity: 0.6 },
});
