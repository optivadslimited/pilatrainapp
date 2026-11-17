import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Ring, Screen, Text } from '@/components';
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
 * appear in turn.
 *
 * TODO(milestone 2): this is where the real plan call runs (the plan-generation
 * Edge Function). Wait for both the call and MINIMUM_MS, then open the plan
 * preview. For now there is no plan to build, so it waits and opens the tabs.
 */
export default function Building() {
  const router = useRouter();
  const lines = t.building.lines;
  const [shown, setShown] = useState(1);

  useEffect(() => {
    const timers = lines
      .slice(1)
      .map((_, index) => setTimeout(() => setShown(index + 2), (index + 1) * LINE_INTERVAL_MS));
    const done = setTimeout(
      () => router.replace('/today'),
      Math.max(MINIMUM_MS, lines.length * LINE_INTERVAL_MS) + SETTLE_MS,
    );
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [lines, router]);

  return (
    <Screen testID="building">
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
    </Screen>
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
