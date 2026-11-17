import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { t } from '@/strings';
import { aspect, duration, radius, space, useTheme } from '@/theme';

import { Button } from './Button';
import { Icon } from './Icon';
import { PhotoPlaceholder } from './PhotoPlaceholder';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type ClassCardProps = {
  /** Large: the one session on Today. Compact: a row in a list. */
  variant: 'large' | 'compact';
  title: string;
  /** One line, e.g. "20 min · Beginner · Mat". Build it with `formatClassMeta`. */
  meta: string;
  /** The class thumbnail. Until it exists, a labelled Sand block is shown. */
  imageUrl?: string | null;
  /** What the photo will be, for the placeholder and for VoiceOver. */
  photoLabel: string;
  /** Opens the class detail sheet. */
  onPress?: () => void;
  /** Large only: the one big button. */
  onStart?: () => void;
  startLabel?: string;
  /** Members only. Shows a lock in place of the action. */
  locked?: boolean;
  /** Compact only: a quiet action at the end of the row, e.g. "Move". */
  action?: { label: string; onPress: () => void };
  testID?: string;
};

/** A class, as a large card with one Start button or as a compact row. */
export function ClassCard(props: ClassCardProps) {
  return props.variant === 'large' ? <LargeCard {...props} /> : <CompactCard {...props} />;
}

function Thumbnail({
  imageUrl,
  photoLabel,
  borderRadius,
  compact,
}: Pick<ClassCardProps, 'imageUrl' | 'photoLabel'> & { borderRadius: number; compact: boolean }) {
  const { colors } = useTheme();

  if (!imageUrl) {
    return (
      <PhotoPlaceholder
        label={photoLabel}
        aspectRatio={aspect.thumbnail}
        borderRadius={borderRadius}
        compact={compact}
      />
    );
  }

  return (
    <Image
      source={imageUrl}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={duration.fade}
      accessibilityLabel={photoLabel}
      style={{
        aspectRatio: aspect.thumbnail,
        borderRadius,
        backgroundColor: colors.surface,
      }}
    />
  );
}

function LargeCard({
  title,
  meta,
  imageUrl,
  photoLabel,
  onPress,
  onStart,
  startLabel = t.common.start,
  locked = false,
  testID,
}: ClassCardProps) {
  return (
    <View style={styles.large} testID={testID}>
      <PressableScale
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${meta}`}
        style={styles.largeBody}>
        <Thumbnail
          imageUrl={imageUrl}
          photoLabel={photoLabel}
          borderRadius={radius.card}
          compact={false}
        />
        <View style={styles.largeText}>
          <Text variant="heading">{title}</Text>
          <Text variant="callout" color="textSecondary">
            {meta}
          </Text>
        </View>
      </PressableScale>
      {onStart ? (
        <Button
          label={startLabel}
          onPress={onStart}
          icon={locked ? 'lock' : undefined}
          testID={testID ? `${testID}-start` : undefined}
        />
      ) : null}
    </View>
  );
}

function CompactCard({
  title,
  meta,
  imageUrl,
  photoLabel,
  onPress,
  locked = false,
  action,
  testID,
}: ClassCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.compact, { backgroundColor: colors.surface }]} testID={testID}>
      <PressableScale
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${meta}${locked ? `. ${t.classMeta.locked}` : ''}`}
        style={styles.compactBody}>
        <View style={styles.compactThumb}>
          <Thumbnail imageUrl={imageUrl} photoLabel={photoLabel} borderRadius={radius.input} compact />
        </View>
        <View style={styles.compactText}>
          <Text variant="body" weight="600">
            {title}
          </Text>
          <Text variant="callout" color="textSecondary">
            {meta}
          </Text>
        </View>
        {locked ? <Icon name="lock" size={20} color="textSecondary" /> : null}
      </PressableScale>
      {action && !locked ? (
        <Button label={action.label} onPress={action.onPress} variant="text" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  large: { gap: space.md },
  largeBody: { gap: space.sm },
  largeText: { gap: space.xxs },
  compact: {
    borderRadius: radius.card,
    padding: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
  },
  compactBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  compactThumb: { width: 56 },
  compactText: { flex: 1, gap: 2 },
});
