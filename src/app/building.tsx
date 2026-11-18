import { NoEligibleClassesError } from '@engine';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { EmptyState, Ring, Screen, Text } from '@/components';
import { useBuildPlan } from '@/features/plan/queries';
import { track } from '@/lib/analytics';
import { t } from '@/strings';
import { duration, fadeIn, space } from '@/theme';

/** The plan call is shown for at least this long, however fast it returns. */
const MINIMUM_MS = 2400;
/** The three lines appear this far apart. */
const LINE_INTERVAL_MS = 800;
/** A moment on the completed ring before moving on. About three seconds in all. */
const SETTLE_MS = duration.ring;

/**
 * Building your plan. A breathing ring fills in three steps while three lines
 * appear in turn. This is the real plan call: the plan function on the
 * server, or the same engine on the phone in local mode. The screen stays for
 * at least 2.4 seconds however fast the plan comes back, then opens the
 * preview.
 */
export default function Building() {
  const router = useRouter();
  const { mutate, data: plan, isError, error } = useBuildPlan();

  const [attempt, setAttempt] = useState(0);
  const [waited, setWaited] = useState(false);
  const started = useRef(-1);

  // Make the call once per attempt.
  useEffect(() => {
    if (started.current === attempt) return;
    started.current = attempt;
    mutate();
  }, [attempt, mutate]);

  // Move on when the plan is back and the minimum has passed.
  useEffect(() => {
    if (!plan || !waited) return;
    track('plan_built', {
      days: plan.profile.weekdays.length,
      minutes: plan.profile.minutes,
      goal: plan.profile.goal,
    });
    router.replace('/plan-preview');
  }, [plan, waited, router]);

  if (isError && waited) {
    const noClasses = error instanceof NoEligibleClassesError;
    return (
      <Screen testID="building-error">
        <EmptyState
          title={noClasses ? t.building.noClassesTitle : t.building.errorTitle}
          body={noClasses ? t.building.noClassesBody : t.building.errorBody}
          action={
            noClasses
              ? {
                  label: t.building.changeAnswers,
                  onPress: () =>
                    router.replace({ pathname: '/quiz/[step]', params: { step: 'work_around' } }),
                }
              : {
                  label: t.common.retry,
                  onPress: () => {
                    setWaited(false);
                    setAttempt((n) => n + 1);
                  },
                }
          }
        />
      </Screen>
    );
  }

  return (
    <Screen testID="building">
      {/* Keyed by attempt, so "Try again" starts the ring and the lines afresh. */}
      <Progress key={attempt} onMinimum={() => setWaited(true)} />
    </Screen>
  );
}

/** The ring and its three lines. Tells the screen when the minimum time has passed. */
function Progress({ onMinimum }: { onMinimum: () => void }) {
  const lines = t.building.lines;
  const [shown, setShown] = useState(1);
  const done = useRef(onMinimum);

  useEffect(() => {
    done.current = onMinimum;
  }, [onMinimum]);

  useEffect(() => {
    const timers = lines
      .slice(1)
      .map((_, index) => setTimeout(() => setShown(index + 2), (index + 1) * LINE_INTERVAL_MS));
    const minimum = setTimeout(
      () => done.current(),
      Math.max(MINIMUM_MS, lines.length * LINE_INTERVAL_MS) + SETTLE_MS,
    );
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(minimum);
    };
  }, [lines]);

  return (
    <View style={styles.centre} accessible accessibilityLabel={t.building.title}>
      <Ring progress={shown / lines.length} size={144} strokeWidth={8} breathing />
      <View style={styles.lines}>
        {lines.slice(0, shown).map((line) => (
          <Animated.View key={line} entering={fadeIn(duration.wordmark)}>
            <Text variant="body" color="textSecondary" center>
              {line}
            </Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xl,
  },
  // Room for all three lines from the start, so the ring does not shift as they arrive.
  lines: {
    minHeight: 3 * 24 + 2 * space.xs,
    gap: space.xs,
    alignSelf: 'stretch',
  },
});
