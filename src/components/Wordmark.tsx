import { brand } from '@/config/brand';
import { fonts } from '@/theme';

import { Text, type TextColor } from './Text';

export type WordmarkProps = {
  /** Font size in points. */
  size?: number;
  color?: TextColor;
};

/**
 * The wordmark: the product name set in Fraunces. The text comes from
 * `brand.wordmark`, so a rename is a one-line change in src/config/brand.ts.
 */
export function Wordmark({ size = 40, color = 'text' }: WordmarkProps) {
  return (
    <Text
      color={color}
      accessibilityRole="header"
      accessibilityLabel={brand.name}
      // The wordmark is a logo, so it keeps its drawn size at every Dynamic Type setting.
      allowFontScaling={false}
      style={{
        fontFamily: fonts.serifSemiBold,
        fontSize: size,
        lineHeight: Math.round(size * 1.15),
        letterSpacing: -size * 0.02,
      }}>
      {brand.wordmark}
    </Text>
  );
}
