import type { ViewStyle } from 'react-native';

import { lightColors } from './colors';

/** The 4-point grid: 4, 8, 12, 16, 24, 32, 48. */
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Side margin of every screen. */
export const screenMargin = space.lg;

export const radius = {
  /** Inputs and chips. */
  input: 12,
  chip: 12,
  /** Cards. */
  card: 20,
  /** Sheets. */
  sheet: 28,
  /** Buttons are fully round. */
  pill: 999,
} as const;

export const size = {
  /** Primary and secondary buttons. */
  buttonHeight: 56,
  /** Minimum touch target. */
  touchTarget: 44,
  hairline: 1,
  icon: 24,
  iconSmall: 20,
} as const;

/** Photography ratios (width / height). */
export const aspect = {
  /** Class thumbnails. */
  thumbnail: 4 / 5,
  /** Hero images. */
  hero: 3 / 4,
  /** Video. */
  video: 16 / 9,
} as const;

/**
 * The one shadow: y 8, blur 24, Ink at 8%. Used for sheets and floating player
 * controls and almost nowhere else.
 */
export const softShadow: ViewStyle = {
  boxShadow: `0px 8px 24px 0px ${lightColors.shadow}`,
};
