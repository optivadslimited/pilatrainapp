import { lightColors, type Colors } from './colors';

export * from './colors';
export * from './layout';
export * from './motion';
export * from './typography';

/**
 * Light appearance only at launch. When dark is approved, read the system
 * scheme here (`useColorScheme`) and return `darkColors` for 'dark'; every
 * component already takes its colours from this hook.
 */
export function useTheme(): { colors: Colors; scheme: 'light' | 'dark' } {
  return { colors: lightColors, scheme: 'light' };
}
