import { MINUTES, type Minutes } from '@engine';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, DayPill, IconButton, Screen, Text, toast } from '@/components';
import {
  DAYS_PER_WEEK,
  TIMES_OF_DAY,
  WEEKDAYS,
  type DaysPerWeek,
  type TimeOfDay,
  type Weekday,
} from '@/features/onboarding/questions';
import { useOnboardingStore } from '@/features/onboarding/store';
import { suggestedWeekdays, toggleWeekday, weekdaysMatch } from '@/features/onboarding/weekdays';
import { useAdjustPlan, useCurrentPlan } from '@/features/plan/queries';
import { track } from '@/lib/analytics';
import { useGoBack } from '@/lib/useGoBack';
import { t } from '@/strings';
import { space } from '@/theme';

/**
 * Adjust my plan. The days, time and length questions from the quiz, on one
 * screen. Saving lays the rest of her plan out again on the new days; what she
 * has already done stays as it is.
 */
export default function AdjustPlan() {
  const goBack = useGoBack('/plan');
  const plan = useCurrentPlan().data;
  const answers = useOnboardingStore((state) => state.answers);
  const setAnswer = useOnboardingStore((state) => state.setAnswer);
  const adjust = useAdjustPlan();

  const startDays = [...(plan?.profile.weekdays ?? answers.weekdays ?? [1, 3, 5])] as Weekday[];
  const [count, setCount] = useState<number>(startDays.length);
  const [days, setDays] = useState<Weekday[]>(startDays);
  const [minutes, setMinutes] = useState<Minutes>(plan?.profile.minutes ?? answers.minutes ?? 20);
  const [time, setTime] = useState<TimeOfDay>(answers.timeOfDay ?? 'varies');

  const chooseCount = (next: DaysPerWeek) => {
    setCount(next);
    // A new number of days makes the old choice wrong, so suggest a fresh spread.
    if (days.length !== next) setDays(suggestedWeekdays(next));
  };

  const valid = weekdaysMatch(days, count);

  const save = () => {
    // The quiz answers hold her days and length too, so they are kept in step.
    setAnswer('weekdays', days);
    if ((DAYS_PER_WEEK as readonly number[]).includes(count)) {
      setAnswer('daysPerWeek', count as DaysPerWeek);
    }
    setAnswer('minutes', minutes);
    setAnswer('timeOfDay', time);

    adjust.mutate(
      { weekdays: days, minutes },
      {
        onSuccess: () => {
          track('plan_adjusted');
          toast.show(t.adjust.saved);
          goBack();
        },
        onError: () => toast.show(t.adjust.failed),
      },
    );
  };

  return (
    <Screen
      scroll
      testID="adjust"
      footer={
        <Button
          label={t.adjust.save}
          onPress={save}
          disabled={!valid}
          loading={adjust.isPending}
          testID="adjust-save"
        />
      }>
      <View style={styles.top}>
        <IconButton
          icon="back"
          accessibilityLabel={t.common.back}
          onPress={goBack}
          testID="adjust-back"
        />
      </View>
      <Text variant="display">{t.adjust.title}</Text>
      <Text variant="body" color="textSecondary" style={styles.body}>
        {t.adjust.body}
      </Text>

      <View style={styles.section}>
        <Text variant="heading">{t.adjust.daysPerWeek}</Text>
        <View style={styles.chips}>
          {DAYS_PER_WEEK.map((option) => (
            <Chip
              key={option}
              label={t.adjust.daysChip(option)}
              selected={count === option}
              onPress={() => chooseCount(option)}
              testID={`adjust-days-${option}`}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="heading">{t.adjust.whichDays}</Text>
        <View style={styles.days}>
          {WEEKDAYS.map((day) => {
            const selected = days.includes(day);
            return (
              <DayPill
                key={day}
                letter={t.weekdays.letter[day - 1]}
                accessibilityLabel={t.weekdays.long[day - 1]}
                selected={selected}
                disabled={days.length >= count && !selected}
                onPress={() => setDays(toggleWeekday(days, day, count))}
                testID={`adjust-day-${day}`}
              />
            );
          })}
        </View>
        <Text variant="callout" color="textSecondary" center accessibilityLiveRegion="polite">
          {t.adjust.status(days.length, count)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="heading">{t.adjust.length}</Text>
        <View style={styles.chips}>
          {MINUTES.map((option) => (
            <Chip
              key={option}
              label={t.classMeta.minutes(option)}
              selected={minutes === option}
              onPress={() => setMinutes(option)}
              testID={`adjust-minutes-${option}`}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="heading">{t.adjust.time}</Text>
        <View style={styles.chips}>
          {TIMES_OF_DAY.map((option) => (
            <Chip
              key={option}
              label={t.quiz.questions.time_of_day.options[option]}
              selected={time === option}
              onPress={() => setTime(option)}
              testID={`adjust-time-${option}`}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'flex-start', marginLeft: -10, paddingBottom: space.xs },
  body: { paddingTop: space.xs },
  section: { gap: space.sm, paddingTop: space.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  days: { flexDirection: 'row', gap: space.xxs },
});
