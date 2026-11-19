import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { PhotoSource } from '@/config/photos';
import { duration, radius, useTheme } from '@/theme';

import { PhotoPlaceholder } from './PhotoPlaceholder';

export type PhotoProps = {
  /** The photo. Without one, a labelled Sand block stands in at the same size. */
  source?: PhotoSource | null;
  /** What the photo will be, written on the Sand block until it exists. */
  label: string;
  /**
   * What VoiceOver says once the photo is there: what is in the picture.
   * Leave it out when the photo only decorates words that are already read.
   */
  alt?: string;
  /** Width divided by height. Omit when the parent sets the size. */
  aspectRatio?: number;
  borderRadius?: number;
  /** Hides the Sand block's written label, for thumbnails too small to hold it. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** A photo, cropped to fill its frame, or the Sand block that holds its place. */
export function Photo({
  source,
  label,
  alt,
  aspectRatio,
  borderRadius = radius.card,
  compact = false,
  style,
  testID,
}: PhotoProps) {
  const { colors } = useTheme();

  if (!source) {
    return (
      <PhotoPlaceholder
        label={label}
        aspectRatio={aspectRatio}
        borderRadius={borderRadius}
        compact={compact}
        style={style}
      />
    );
  }

  return (
    <View
      style={[styles.frame, { aspectRatio, borderRadius, backgroundColor: colors.surface }, style]}>
      <Image
        source={source}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={duration.fade}
        accessible={Boolean(alt)}
        accessibilityLabel={alt}
        style={StyleSheet.absoluteFill}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
});
