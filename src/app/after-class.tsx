import type { Rating } from '@engine';
import { RATINGS } from '@engine';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, OptionCard, Ring, Screen, StatTile, Text, toast } from '@/components';
import { useMembership } from '@/features/membership/membership';
import { indexCatalogue } from '@/features/plan/cards';
import { afterClassView } from '@/features/plan/progress';
import { useCatalogue, useCurrentPlan, useHistory, useRateSession } from '@/features/plan/queries';
import { track } from '@/lib/analytics';
import { askToTrack } from '@/lib/attribution';
import { classCompleted } from '@/lib/haptics';
import { useToday } from '@/lib/useToday';
import { t } from '@/strings';
import { duration, space } from '@/theme';

/**
 * After class. "Nicely done." The weekly ring fills, the numbers that matter
 * are shown, and one question is asked. Then what is next, and Done.
 *
 * Her answer is saved when she presses Done, so she can change her mind until
 * then. It is optional: Done works without one.
 */
export default function AfterClass() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string; classId?: string }>();
  const date = useToday();
  const plan = useCurrentPlan().data;
  const classes = useCatalogue().data;
  const history = useHistory().data;
  const rate = useRateSession();
  const { isMember } = useMembership();

  const [rating, setRating] = useState<Rating | null>(null);
  const [filled, setFilled] = useState(false);

  // The one success haptic in the app, and a beat before the ring fills.
  useEffect(() => {
    classCompleted();
    const timer = setTimeout(() => setFilled(true), duration.wordmark);
    return () => clearTimeout(timer);
  }, []);

  const view =
    plan && classes && sessionId
      ? afterClassView(plan, history?.plans ?? [], indexCatalogue(classes), sessionId, date)
      : null;

  const done = async () => {
    if (rating && sessionId) {
      track('feedback_submitted', { rating });
      rate.mutate(
        { sessionId, rating },
        {
          // If her feedback has changed the weeks ahead, say so, once and quietly.
          onSuccess: ({ effect }) => {
            if (effect) toast.show(t.afterClass.effect[effect]);
          },
        },
      );
    }
    // Apple's tracking prompt, once, after her first completed class and never
    // before. It is only shown when attribution is switched on.
    if ((view?.sessions ?? 0) >= 1) await askToTrack();

    // The free class is done. This is where membership is offered; closing the
    // paywall carries on to an account, reminders and home.
    if (!isMember) {
      router.replace({
        pathname: '/paywall',
        params: { placement: 'after_free_class', then: 'continue' },
      });
      return;
    }
    router.dismissTo('/today');
  };

  return (
    <Screen
      scroll
      testID="after-class"
      footer={<Button label={t.afterClass.done} onPress={done} testID="after-class-done" />}>
      <Text variant="display" center style={styles.headline}>
        {t.afterClass.headline}
      </Text>

      {view ? (
        <>
          <View style={styles.ring}>
            <Ring
              progress={
                view.ring.total > 0
                  ? (filled ? view.ring.after : view.ring.before) / view.ring.total
                  : 0
              }
              size={144}
              strokeWidth={10}
              accessibilityLabel={view.ring.spoken}>
              <Text tabular weight="600" style={styles.figure} testID="after-class-ring">
                {view.ring.label}
              </Text>
            </Ring>
            <Text variant="callout" color="textSecondary">
              {t.today.ringLabel}
            </Text>
          </View>

          <View style={styles.tiles}>
            <StatTile
              value={String(view.minutes)}
              label={t.afterClass.minutes}
              testID="after-class-minutes"
            />
            <StatTile
              value={String(view.sessions)}
              label={t.afterClass.sessions}
              testID="after-class-sessions"
            />
          </View>

          <View style={styles.question}>
            <Text variant="heading">{t.afterClass.question}</Text>
            <View accessibilityRole="radiogroup" style={styles.options}>
              {RATINGS.map((option) => (
                <OptionCard
                  key={option}
                  label={t.afterClass.ratings[option]}
                  selected={rating === option}
                  onPress={() => setRating(option)}
                  testID={`rating-${option}`}
                />
              ))}
            </View>
          </View>

          {view.next ? (
            <Text variant="body" color="textSecondary" center testID="after-class-next">
              {view.next}
            </Text>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: { paddingTop: space.xl },
  ring: {
    alignItems: 'center',
    gap: space.xs,
    paddingTop: space.xl,
  },
  // In the system font so the numerals are tabular.
  figure: { fontSize: 28, lineHeight: 32 },
  tiles: {
    flexDirection: 'row',
    gap: space.xs,
    paddingTop: space.xl,
  },
  question: {
    gap: space.sm,
    paddingTop: space.xl,
    paddingBottom: space.lg,
  },
  options: { gap: space.xs },
});
