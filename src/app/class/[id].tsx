import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, PhotoPlaceholder, Sheet, Skeleton, Text } from '@/components';
import { useAccess } from '@/features/membership/useAccess';
import { useCatalogue, useClassProgress, useInstructors } from '@/features/plan/queries';
import { resumeFrom } from '@/features/player/playback';
import { useGoBack } from '@/lib/useGoBack';
import { t } from '@/strings';
import { aspect, radius, space, useTheme } from '@/theme';

/**
 * Class detail. A sheet from any class card: the photo, who teaches it, how
 * long and how hard it is, what she will do, and Start.
 *
 * When it is opened from a session of her plan, Start plays that session
 * (which may be two classes). From the library it plays the class on its own.
 * A class she cannot play yet shows a lock, and the button opens the paywall.
 */
export default function ClassDetail() {
  const router = useRouter();
  const goBack = useGoBack('/today');
  const { colors } = useTheme();
  const { id, sessionId, source } = useLocalSearchParams<{
    id: string;
    sessionId?: string;
    source?: string;
  }>();
  const access = useAccess();
  const cls = useCatalogue().data?.find((item) => item.id === id);
  const instructor = useInstructors().data?.find((item) => item.id === cls?.instructorId);
  const progress = useClassProgress(id).data;

  if (!cls) {
    return (
      <Sheet onClose={goBack} testID="class-detail">
        <Skeleton aspectRatio={aspect.video} borderRadius={radius.card} />
        <Skeleton width="70%" height={32} />
        <Skeleton width="50%" />
      </Sheet>
    );
  }

  const locked = sessionId ? !access.canPlay(sessionId) : !access.canWatch(cls);
  const resuming = resumeFrom(progress) > 0;

  const start = () => {
    if (locked) {
      // The paywall takes the sheet's place.
      router.replace({ pathname: '/paywall', params: { placement: 'locked_class' } });
      return;
    }
    // The player takes the sheet's place, so closing it returns to where she was.
    router.replace({
      pathname: '/player',
      params: sessionId
        ? { sessionId, source: source ?? 'detail' }
        : { classId: cls.id, source: source ?? 'detail' },
    });
  };

  return (
    <Sheet
      onClose={goBack}
      testID="class-detail"
      footer={
        <Button
          label={
            locked ? t.classMeta.locked : resuming ? t.classDetail.resume : t.classDetail.start
          }
          icon={locked ? 'lock' : undefined}
          onPress={start}
          testID="class-start"
        />
      }>
      {/* TODO(owner): class hero photo, 3:4. */}
      <PhotoPlaceholder label={t.classDetail.heroLabel(cls.title)} aspectRatio={aspect.hero} />

      <View style={styles.heading}>
        <Text variant="title">{cls.title}</Text>
        {instructor ? (
          <Text variant="body" color="textSecondary">
            {t.classDetail.instructor(instructor.name, instructor.credential)}
          </Text>
        ) : null}
      </View>

      <View style={styles.facts}>
        <Chip label={t.classMeta.minutes(cls.lengthMin)} />
        <Chip label={t.classMeta.level[cls.level]} />
        <Chip label={t.focus[cls.focus]} />
        {cls.equipment.map((item) => (
          <Chip key={item} label={t.classMeta.equipment[item]} />
        ))}
      </View>

      <View style={styles.section}>
        <Text variant="heading">{t.classDetail.whatYouWillDo}</Text>
        {cls.highlights.map((line) => (
          <View key={line} style={styles.bullet}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text variant="body" style={styles.fill}>
              {line}
            </Text>
          </View>
        ))}
      </View>

      <Text variant="callout" color="textSecondary">
        {t.classDetail.easierNote}
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  heading: { gap: space.xxs },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  section: { gap: space.xs, paddingTop: space.xs },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  // Sits on the first line of its text.
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
});
