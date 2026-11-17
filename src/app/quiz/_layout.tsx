import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, QuizProgressBar } from '@/components';
import { stepNumber, TOTAL_STEPS } from '@/features/onboarding/flow';
import { getQuestion } from '@/features/onboarding/questions';
import { useQuizNavigation } from '@/features/onboarding/useQuizNavigation';
import { t } from '@/strings';
import { screenMargin, size, space, useReduceMotion, useTheme } from '@/theme';

/**
 * The quiz. The back arrow and the thin progress bar stay still at the top
 * while each question pushes in beneath them.
 */
export default function QuizLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { back } = useQuizNavigation();

  // "/quiz/goal" → "goal"
  const segment = usePathname().split('/').filter(Boolean).pop();
  const current =
    segment === 'safety' || segment === 'disclaimer' ? segment : getQuestion(segment)?.id;

  // The safety gate is a pause in the quiz, not a step of it: no bar.
  const showBar = current !== undefined && current !== 'safety';
  const step = showBar ? stepNumber(current) : 0;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton
          icon="back"
          accessibilityLabel={t.common.back}
          onPress={() => back(current ?? 'goal')}
          testID="quiz-back"
        />
        {showBar ? (
          <QuizProgressBar
            progress={step / TOTAL_STEPS}
            accessibilityLabel={t.quiz.progress(step, TOTAL_STEPS)}
          />
        ) : null}
      </View>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: reduceMotion ? 'fade' : 'default',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    minHeight: size.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    // The arrow's 44-point target is wider than its 24-point glyph; this lines
    // the glyph up with the 24-point screen margin.
    paddingLeft: screenMargin - (size.touchTarget - size.icon) / 2,
    paddingRight: screenMargin,
    paddingVertical: space.xxs,
  },
});
