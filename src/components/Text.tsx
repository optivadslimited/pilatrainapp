import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import {
  maxFontSizeMultiplier,
  serifVariants,
  tabularNumerals,
  typeScale,
  useTheme,
  type Colors,
  type TypeVariant,
} from '@/theme';

export type TextColor = Extract<
  keyof Colors,
  'text' | 'textSecondary' | 'onPrimary' | 'onDark' | 'primary' | 'accent' | 'onAccent' | 'error'
>;

export type TextProps = RNTextProps & {
  /** A step on the type scale. Defaults to body. */
  variant?: TypeVariant;
  color?: TextColor;
  /** Tabular numerals. Use for every statistic. */
  tabular?: boolean;
  center?: boolean;
  weight?: TextStyle['fontWeight'];
};

/**
 * All text in the app goes through this component, so the type scale, colour
 * tokens and the Dynamic Type ceiling are applied in one place.
 */
export function Text({
  variant = 'body',
  color = 'text',
  tabular = false,
  center = false,
  weight,
  style,
  accessibilityRole,
  ...rest
}: TextProps) {
  const { colors } = useTheme();
  const isHeadline = serifVariants.includes(variant);

  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      accessibilityRole={accessibilityRole ?? (isHeadline ? 'header' : undefined)}
      {...rest}
      style={[
        typeScale[variant],
        { color: colors[color] },
        tabular && tabularNumerals,
        center && { textAlign: 'center' },
        weight !== undefined && { fontWeight: weight },
        style,
      ]}
    />
  );
}
