import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, Chip, ClassCard, Screen, Skeleton, Text, toast } from '@/components';
import { useOnboardingStore } from '@/features/onboarding/store';
import { indexCatalogue } from '@/features/plan/cards';
import { planPreview } from '@/features/plan/preview';
import { useCatalogue, useCurrentPlan } from '@/features/plan/queries';
import { track } from '@/lib/analytics';
import { t } from '@/strings';
import { enterStaggered, radius, space, useReduceMotion, useTheme } from '@/theme';

/**
 * Plan preview. Her 28 days at a glance: three chips that sum it up, week 1 in
 * full, and weeks 2 to 4 as softened rows. Two ways on, fixed at the bottom.
 */
export default function PlanPreview() {
  const router = useRouter();
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const firstName = useOnboardingStore((state) => state.answers.firstName);
  const plan = useCurrentPlan();
  const classes = useCatalogue();

  useEffect(() => {
    track('plan_preview_viewed');
  }, []);

  // No plan to preview: go and build one.
  if (plan.isSuccess && plan.data === null) return <Redirect href="/building" />;

  const preview =
    plan.data && classes.data
      ? planPreview(plan.data, indexCatalogue(classes.data), firstName)
      : null;

  return (
    <Screen
      scroll
      testID="plan-preview"
      footer={
        <>
          <Button
            label={t.preview.primary}
            // TODO(milestone 4): open the paywall here. Until it exists this goes straight to Today.
            onPress={() => router.replace('/today')}
            disabled={!preview}
            testID="preview-start"
          />
          <Button
            label={t.preview.secondary}
            variant="text"
            // TODO(milestone 3): open the player on her first session.
            onPress={() => {
              toast.show(t.today.playerSoon);
              router.replace('/today');
            }}
            disabled={!preview}
            testID="preview-first-class"
          />
        </>
      }>
      {preview ? (
        <>
          <Text variant="display" style={styles.headline}>
            {preview.headline}
          </Text>

          <View style={styles.chips}>
            {preview.chips.map((chip) => (
              <Chip key={chip} label={chip} />
            ))}
          </View>

          <Text variant="heading" style={styles.weekTitle}>
            {preview.weekOne.title}
          </Text>
          <View style={styles.sessions}>
            {preview.weekOne.sessions.map((card, index) => (
              <Animated.View key={card.session.id} entering={enterStaggered(index, reduceMotion)}>
                <ClassCard
                  variant="compact"
                  eyebrow={card.weekday}
                  title={card.title}
                  meta={card.meta}
                  note={card.note}
                  imageUrl={card.imageUrl}
                  photoLabel={card.photoLabel}
                  testID={`preview-session-${index + 1}`}
                />
              </Animated.View>
            ))}
          </View>

          {/* Weeks 2 to 4: titled, softened. The detail arrives when she gets there. */}
          <View style={styles.later}>
            {preview.laterWeeks.map((row) => (
              <View
                key={row.week}
                accessible
                accessibilityLabel={`${row.title}. ${row.summary}`}
                style={[styles.laterRow, { borderColor: colors.hairline }]}>
                <Text variant="body" weight="600" color="textSecondary" style={styles.fill}>
                  {row.title}
                </Text>
                <Text variant="callout" color="textSecondary" tabular>
                  {row.summary}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.loading} accessible accessibilityLabel={t.common.loading}>
          <Skeleton width="80%" height={38} />
          <Skeleton width="60%" height={36} />
          <Skeleton height={86} borderRadius={radius.card} />
          <Skeleton height={86} borderRadius={radius.card} />
          <Skeleton height={86} borderRadius={radius.card} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headline: { paddingTop: space.lg },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    paddingTop: space.md,
  },
  weekTitle: { paddingTop: space.xl, paddingBottom: space.sm },
  sessions: { gap: space.xs },
  later: { gap: space.xs, paddingTop: space.lg },
  laterRow: {
    minHeight: 56,
    borderRadius: radius.card,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    // Softened: an outline where week 1 has filled cards. These weeks are ahead
    // of her, not in front of her. The text keeps its full contrast.
    borderWidth: 1,
  },
  loading: { gap: space.md, paddingTop: space.lg },
});
