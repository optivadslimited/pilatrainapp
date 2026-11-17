import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { t } from '@/strings';
import { radius, space, useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

export type PhotoPlaceholderProps = {
  /** What the photo will be, e.g. "Instructor photo. Hero, 3:4, warm daylight." */
  label: string;
  /** Width divided by height. Omit when the parent sets the size. */
  aspectRatio?: number;
  borderRadius?: number;
  /** Hides the written label, for thumbnails too small to hold it. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Stands in for instructor photography until the owner supplies it: a neutral
 * Sand block at the right aspect ratio, labelled with what the photo will be.
 * Never a stock photo.
 *
 * TODO(owner): supply the photography; each use of this component is one photo.
 */
export function PhotoPlaceholder({
  label,
  aspectRatio,
  borderRadius = radius.card,
  compact = false,
  style,
}: PhotoPlaceholderProps) {
  const { colors } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t.photo.placeholder(label)}
      style={[
        styles.block,
        {
          aspectRatio,
          borderRadius,
          backgroundColor: colors.surface,
          borderColor: colors.hairline,
        },
        style,
      ]}>
      <Icon name="photo" color="textSecondary" size={compact ? 20 : 24} />
      {compact ? null : (
        <Text variant="caption" color="textSecondary" center style={styles.label}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    padding: space.md,
    overflow: 'hidden',
  },
  label: { maxWidth: 240 },
});
