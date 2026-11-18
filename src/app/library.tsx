import { FOCUSES, MINUTES, type Focus, type Minutes } from '@engine';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip, ClassCard, EmptyState, IconButton, Screen, Skeleton, Text } from '@/components';
import { useAccess } from '@/features/membership/useAccess';
import { useCatalogue } from '@/features/plan/queries';
import { formatClassMeta } from '@/lib/format';
import { useGoBack } from '@/lib/useGoBack';
import { t } from '@/strings';
import { radius, space } from '@/theme';

/**
 * The class library: every class, filtered by length and by focus. For
 * someone who is not a member, everything beyond the free class is locked.
 */
export default function Library() {
  const router = useRouter();
  const goBack = useGoBack('/plan');
  const access = useAccess();
  const classes = useCatalogue().data;
  const [length, setLength] = useState<Minutes | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);

  const shown = (classes ?? [])
    .filter(
      (cls) =>
        (length === null || cls.lengthMin === length) && (focus === null || cls.focus === focus),
    )
    // The free class first, then shortest first, then by name.
    .sort(
      (a, b) =>
        Number(b.isFree) - Number(a.isFree) ||
        a.lengthMin - b.lengthMin ||
        a.title.localeCompare(b.title),
    );

  return (
    <Screen scroll testID="library">
      <View style={styles.top}>
        <IconButton
          icon="back"
          accessibilityLabel={t.common.back}
          onPress={goBack}
          testID="library-back"
        />
      </View>
      <Text variant="display">{t.library.title}</Text>

      <View style={styles.filters}>
        <View accessibilityLabel={t.library.length} style={styles.chips}>
          {MINUTES.map((minutes) => (
            <Chip
              key={minutes}
              label={t.library.lengthChip(minutes)}
              selected={length === minutes}
              onPress={() => setLength(length === minutes ? null : minutes)}
              testID={`filter-length-${minutes}`}
            />
          ))}
        </View>
        <View accessibilityLabel={t.library.focus} style={styles.chips}>
          {FOCUSES.map((item) => (
            <Chip
              key={item}
              label={t.focus[item]}
              selected={focus === item}
              onPress={() => setFocus(focus === item ? null : item)}
              testID={`filter-focus-${item}`}
            />
          ))}
        </View>
      </View>

      {!classes ? (
        <View style={styles.list} accessible accessibilityLabel={t.common.loading}>
          <Skeleton height={86} borderRadius={radius.card} />
          <Skeleton height={86} borderRadius={radius.card} />
          <Skeleton height={86} borderRadius={radius.card} />
        </View>
      ) : shown.length === 0 ? (
        <EmptyState
          title={t.library.emptyTitle}
          body={t.library.emptyBody}
          action={{
            label: t.library.clear,
            onPress: () => {
              setLength(null);
              setFocus(null);
            },
          }}
        />
      ) : (
        <View style={styles.list}>
          <Text
            variant="caption"
            color="textSecondary"
            accessibilityLiveRegion="polite"
            testID="library-count">
            {t.library.count(shown.length)}
          </Text>
          {shown.map((cls) => (
            <ClassCard
              key={cls.id}
              variant="compact"
              eyebrow={cls.isFree ? t.library.free : t.focus[cls.focus]}
              title={cls.title}
              meta={formatClassMeta({
                minutes: cls.lengthMin,
                level: cls.level,
                equipment: cls.equipment,
              })}
              imageUrl={cls.thumbnailUrl}
              photoLabel={t.classMeta.photoLabel(cls.title)}
              locked={!access.canWatch(cls)}
              onPress={() =>
                router.push({ pathname: '/class/[id]', params: { id: cls.id, source: 'library' } })
              }
              testID={`library-${cls.slug}`}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Lines the arrow's glyph up with the screen margin.
  top: { alignItems: 'flex-start', marginLeft: -10, paddingBottom: space.xs },
  filters: { gap: space.xs, paddingTop: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  list: { gap: space.xs, paddingTop: space.lg },
});
