import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { maxFontSizeMultiplier, radius, size, space, typeScale, useTheme } from '@/theme';

import { Text } from './Text';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  /** Shown above the field and read by VoiceOver. */
  label: string;
  /** Shown below the field in the error colour. */
  error?: string;
};

/** A single-line text input: 12-point corners, Sand fill, a Slate edge (3:1 or more on Paper), Moss on focus. */
export function TextField({ label, error, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.error : focused ? colors.primary : colors.textSecondary;

  return (
    <View style={styles.wrap}>
      <Text variant="callout" color="textSecondary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.primary}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        {...rest}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          typeScale.body,
          styles.input,
          { backgroundColor: colors.surface, color: colors.text, borderColor },
        ]}
      />
      {error ? (
        <Text variant="caption" color="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  input: {
    minHeight: size.buttonHeight,
    borderRadius: radius.input,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    // Keeps the caret and text centred; line height on a TextInput shifts them on iOS.
    lineHeight: undefined,
  },
});
