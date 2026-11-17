import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

import { size as sizes, useTheme, type Colors } from '@/theme';

/**
 * Icons are SF Symbols, regular weight, single colour. Each icon has a name
 * that says what it means in this app, mapped to a symbol. The Material name
 * is the stand-in on Android and in the web preview, which keeps the code
 * portable.
 */
const ICONS = {
  back: { ios: 'arrow.left', android: 'arrow_back' },
  close: { ios: 'xmark', android: 'close' },
  check: { ios: 'checkmark', android: 'check' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  pause: { ios: 'pause.fill', android: 'pause' },
  back10: { ios: 'gobackward.10', android: 'replay_10' },
  forward10: { ios: 'goforward.10', android: 'forward_10' },
  captionsOn: { ios: 'captions.bubble.fill', android: 'closed_caption' },
  captionsOff: { ios: 'captions.bubble', android: 'closed_caption_disabled' },
  airPlay: { ios: 'airplayvideo', android: 'cast' },
  lock: { ios: 'lock', android: 'lock' },
  bell: { ios: 'bell', android: 'notifications' },
  offline: { ios: 'wifi.slash', android: 'wifi_off' },
  retry: { ios: 'arrow.clockwise', android: 'refresh' },
  photo: { ios: 'photo', android: 'image' },
  info: { ios: 'info.circle', android: 'info' },
  // Tab bar
  today: { ios: 'sun.max', android: 'sunny' },
  plan: { ios: 'calendar', android: 'calendar_today' },
  progress: { ios: 'chart.bar', android: 'bar_chart' },
  you: { ios: 'person', android: 'person' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export type IconColor = Extract<
  keyof Colors,
  'text' | 'textSecondary' | 'onPrimary' | 'onDark' | 'primary' | 'accent' | 'error'
>;

export type IconProps = {
  name: IconName;
  size?: number;
  color?: IconColor;
  /** Overrides `color` with a literal colour, for the tab bar's tint. */
  tintColor?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Icons are decorative: the control that holds one carries the label, so the
 * icon itself is hidden from VoiceOver.
 */
export function Icon({ name, size = sizes.icon, color = 'text', tintColor, style }: IconProps) {
  const { colors } = useTheme();
  const symbol = ICONS[name];

  return (
    <SymbolView
      name={{ ios: symbol.ios, android: symbol.android, web: symbol.android }}
      size={size}
      weight="regular"
      type="monochrome"
      tintColor={tintColor ?? colors[color]}
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
