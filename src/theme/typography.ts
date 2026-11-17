import type { TextStyle } from 'react-native';

/**
 * Type tokens.
 *
 * Headlines are Fraunces at weight 500 to 600. Everything else is the system
 * font (SF Pro on iPhone), which is what React Native uses when no family is set.
 *
 * The family names below are the keys the fonts are loaded under in
 * `src/app/_layout.tsx`.
 */
export const fonts = {
  serifMedium: 'Fraunces_500Medium',
  serifSemiBold: 'Fraunces_600SemiBold',
} as const;

export type TypeVariant =
  'display' | 'title' | 'heading' | 'body' | 'callout' | 'caption' | 'button';

/** Size / line height in points, as specified. */
export const typeScale: Record<TypeVariant, TextStyle> = {
  display: { fontFamily: fonts.serifMedium, fontSize: 34, lineHeight: 38, letterSpacing: -0.4 },
  title: { fontFamily: fonts.serifMedium, fontSize: 28, lineHeight: 32, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.serifSemiBold, fontSize: 22, lineHeight: 26, letterSpacing: -0.2 },
  body: { fontSize: 17, lineHeight: 24 },
  callout: { fontSize: 15, lineHeight: 20 },
  caption: { fontSize: 13, lineHeight: 18 },
  button: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
};

/** The serif variants. These are announced as headers to VoiceOver by default. */
export const serifVariants: readonly TypeVariant[] = ['display', 'title', 'heading'];

/** Tabular numerals, for every statistic. */
export const tabularNumerals: TextStyle = { fontVariant: ['tabular-nums'] };

/**
 * Dynamic Type is supported up to the largest standard size (xxxLarge), where
 * 17 pt body text becomes 23 pt. Beyond that, text stops growing so layouts
 * hold. Layouts use minimum heights, never fixed ones, so nothing clips.
 */
export const maxFontSizeMultiplier = 23 / 17;
