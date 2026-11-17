/**
 * Colour tokens.
 *
 * `palette` is the brand's ten named colours, exactly as specified. Components
 * never use the palette directly: they read the semantic tokens in a `Colors`
 * map through `useTheme()`, so a dark appearance is a second map, not a
 * rewrite. There is no pure white and no pure black anywhere.
 */
export const palette = {
  /** App background. */
  paper: '#F7F4EE',
  /** Cards and secondary surfaces. */
  sand: '#ECE7DD',
  /** Primary text. */
  ink: '#1B2430',
  /** Secondary text. */
  slate: '#4A5568',
  /** Hairlines and dividers. */
  line: '#D9D2C5',
  /** Primary buttons, selected states, progress. */
  moss: '#1F5D54',
  /** Pressed states and dark surfaces. */
  mossDeep: '#1F4D46',
  /** Tint behind selected options. */
  mist: '#DCEBE7',
  /** Used sparingly: a savings tag, a destructive confirm. */
  clay: '#A94A24',
  /** Errors only. */
  alert: '#A3362B',
} as const;

export type Colors = {
  /** Screen background. */
  background: string;
  /** Cards and secondary surfaces. */
  surface: string;
  /** A dark surface, e.g. behind the player. Text on it is `onDark`. */
  surfaceDark: string;
  /** Tint behind a selected option. */
  selectedTint: string;
  text: string;
  textSecondary: string;
  /** Text and icons on `primary` or `surfaceDark`. */
  onPrimary: string;
  onDark: string;
  /** Hairlines and dividers. */
  hairline: string;
  /** Primary buttons, selected states, progress. */
  primary: string;
  primaryPressed: string;
  /** Savings tag, destructive confirm. Sparingly. */
  accent: string;
  onAccent: string;
  /** Errors only. */
  error: string;
  /** The scrim under text that sits on a photo: 0 to 40% Ink. */
  scrimStart: string;
  scrimEnd: string;
  /** The single soft shadow: Ink at 8%. */
  shadow: string;
};

const rgba = (hex: string, alpha: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

export const lightColors: Colors = {
  background: palette.paper,
  surface: palette.sand,
  surfaceDark: palette.mossDeep,
  selectedTint: palette.mist,
  text: palette.ink,
  textSecondary: palette.slate,
  onPrimary: palette.paper,
  onDark: palette.paper,
  hairline: palette.line,
  primary: palette.moss,
  primaryPressed: palette.mossDeep,
  accent: palette.clay,
  onAccent: palette.paper,
  error: palette.alert,
  scrimStart: rgba(palette.ink, 0),
  scrimEnd: rgba(palette.ink, 0.4),
  shadow: rgba(palette.ink, 0.08),
};

/**
 * Dark appearance. Not switched on at launch (see `useTheme`). The values are a
 * first pass so every component is already written against semantic tokens;
 * they need a design review before the switch is flipped.
 * TODO(owner): approve the dark palette before enabling it.
 */
export const darkColors: Colors = {
  background: palette.ink,
  surface: '#263140',
  surfaceDark: '#141B24',
  selectedTint: palette.mossDeep,
  text: palette.paper,
  textSecondary: '#B9C0CC',
  onPrimary: palette.ink,
  onDark: palette.paper,
  hairline: '#364152',
  primary: '#8CC7BC',
  primaryPressed: '#74B3A8',
  accent: '#E08B66',
  onAccent: palette.ink,
  error: '#E58A80',
  scrimStart: rgba(palette.ink, 0),
  scrimEnd: rgba(palette.ink, 0.4),
  shadow: 'rgba(0, 0, 0, 0.24)',
};

/** WCAG relative luminance of a `#RRGGBB` colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

/** WCAG contrast ratio between two `#RRGGBB` colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
