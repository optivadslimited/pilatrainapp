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
  /** A small line above the title, e.g. "Thursday" or "Next: Thursday". */
  eyebrow?: string;
  /** A small line below the meta, e.g. "Then Posture reset" when a session is two classes. */
  note?: string | null;
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
  /** The session is done. Shows a quiet tick. */
  done?: boolean;
  /** Compact only: a quiet action at the end of the row, e.g. "Move". */
  action?: { label: string; onPress: () => void; accessibilityLabel?: string };
  testID?: string;
};

/** A class, as a large card with one Start button or as a compact row. */
export function ClassCard(props: ClassCardProps) {
  return props.variant === 'large' ? <LargeCard {...props} /> : <CompactCard {...props} />;
}

/** Everything VoiceOver should say about the card, as one sentence. */
const spoken = ({ eyebrow, title, meta, note, locked, done }: ClassCardProps) =>
  [eyebrow, title, meta, note, done ? t.classMeta.done : null, locked ? t.classMeta.locked : null]
    .filter(Boolean)
    .join('. ');

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

/** A filled Moss tick, as on a done day in the week strip. */
function DoneMark() {
  const { colors } = useTheme();
  return (
    <View style={[styles.doneMark, { backgroundColor: colors.primary }]}>
      <Icon name="check" size={14} color="onPrimary" />
    </View>
  );
}

function LargeCard(props: ClassCardProps) {
  const {
    title,
    meta,
    eyebrow,
    note,
    imageUrl,
    photoLabel,
    onPress,
    onStart,
    startLabel = t.common.start,
    locked = false,
    done = false,
    testID,
  } = props;

  return (
    <View style={styles.large} testID={testID}>
      <PressableScale
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={spoken(props)}
        style={styles.largeBody}>
        <Thumbnail
          imageUrl={imageUrl}
          photoLabel={photoLabel}
          borderRadius={radius.card}
          compact={false}
        />
        <View style={styles.largeText}>
          {eyebrow ? (
            <Text variant="caption" color="textSecondary" weight="600">
              {eyebrow}
            </Text>
          ) : null}
          <View style={styles.titleRow}>
            <Text variant="heading" accessibilityRole="text" style={styles.fill}>
              {title}
            </Text>
            {done ? <DoneMark /> : null}
          </View>
          <Text variant="callout" color="textSecondary">
            {meta}
          </Text>
          {note ? (
            <Text variant="caption" color="textSecondary">
              {note}
            </Text>
          ) : null}
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

function CompactCard(props: ClassCardProps) {
  const {
    title,
    meta,
    eyebrow,
    note,
    imageUrl,
    photoLabel,
    onPress,
    locked = false,
    done = false,
    action,
    testID,
  } = props;
  const { colors } = useTheme();

  return (
    <View style={[styles.compact, { backgroundColor: colors.surface }]} testID={testID}>
      <PressableScale
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={spoken(props)}
        style={styles.compactBody}>
        <View style={styles.compactThumb}>
          <Thumbnail
            imageUrl={imageUrl}
            photoLabel={photoLabel}
            borderRadius={radius.input}
            compact
          />
        </View>
        <View style={styles.compactText}>
          {eyebrow ? (
            <Text variant="caption" color="textSecondary" weight="600">
              {eyebrow}
            </Text>
          ) : null}
          <Text variant="body" weight="600">
            {title}
          </Text>
          <Text variant="callout" color="textSecondary">
            {meta}
          </Text>
          {note ? (
            <Text variant="caption" color="textSecondary">
              {note}
            </Text>
          ) : null}
        </View>
        {locked ? <Icon name="lock" size={20} color="textSecondary" /> : null}
        {done ? <DoneMark /> : null}
      </PressableScale>
      {action && !locked && !done ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="text"
          style={styles.compactAction}
          accessibilityHint={action.accessibilityLabel}
          testID={testID ? `${testID}-action` : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  large: { gap: space.md },
  largeBody: { gap: space.sm },
  largeText: { gap: space.xxs },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  doneMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  // Narrower than a free-standing text button, to leave the title room.
  compactAction: { paddingHorizontal: space.xs },
  compactText: { flex: 1, gap: 2 },
});
