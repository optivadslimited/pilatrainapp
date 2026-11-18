import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, DayPill, OptionCard, Text, TextField } from '@/components';
import { QuestionFrame } from '@/features/onboarding/QuestionFrame';
import {
  getQuestion,
  toggleOption,
  WEEKDAYS,
  type Question,
  type QuestionId,
  type QuizAnswers,
} from '@/features/onboarding/questions';
import { useOnboardingStore } from '@/features/onboarding/store';
import { useQuizNavigation } from '@/features/onboarding/useQuizNavigation';
import { suggestedWeekdays, toggleWeekday, weekdaysMatch } from '@/features/onboarding/weekdays';
import { t } from '@/strings';
import { duration, enterStaggered, space, useReduceMotion } from '@/theme';

/** The wording for a question: its title, subtitle and option labels. */
function copyFor(id: QuestionId) {
  return t.quiz.questions[id] as {
    title: string;
    subtitle?: string | ((count: number) => string);
    options?: Record<string, string>;
  };
}

const optionLabel = (id: QuestionId, value: string | number) =>
  copyFor(id).options?.[String(value)] ?? String(value);

const staticSubtitle = (id: QuestionId) => {
  const subtitle = copyFor(id).subtitle;
  return typeof subtitle === 'string' ? subtitle : undefined;
};

/** One question of the quiz. Which one comes from the route: /quiz/goal, /quiz/minutes, … */
export default function QuizStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const question = getQuestion(step);

  if (!question) return <Redirect href="/welcome" />;

  switch (question.kind) {
    case 'single':
      return <SingleChoice question={question} />;
    case 'multi':
      return <MultiChoice question={question} />;
    case 'weekdays':
      return <WeekdayChoice question={question} />;
    case 'text':
      return <FirstName question={question} />;
  }
}

/** One answer. The quiz moves on by itself 250 ms after she chooses. */
function SingleChoice({ question }: { question: Extract<Question, { kind: 'single' }> }) {
  const reduceMotion = useReduceMotion();
  const { complete } = useQuizNavigation();
  const value = useOnboardingStore((state) => state.answers[question.field]);
  const setAnswer = useOnboardingStore((state) => state.setAnswer);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If she leaves this screen inside the 250 ms, do not advance behind her back.
  useFocusEffect(
    useCallback(
      () => () => {
        if (timer.current) clearTimeout(timer.current);
      },
      [],
    ),
  );

  const choose = (option: string | number) => {
    setAnswer(question.field, option as never);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => complete(question.id, option), duration.autoAdvance);
  };

  return (
    <QuestionFrame
      title={copyFor(question.id).title}
      subtitle={staticSubtitle(question.id)}
      testID={`quiz-${question.id}`}>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {question.options.map((option, index) => (
          <Animated.View key={String(option)} entering={enterStaggered(index, reduceMotion)}>
            <OptionCard
              mode="single"
              label={optionLabel(question.id, option)}
              selected={value === option}
              onPress={() => choose(option)}
              testID={`option-${option}`}
            />
          </Animated.View>
        ))}
      </View>
    </QuestionFrame>
  );
}

/** Any number of answers, then Continue. */
function MultiChoice({ question }: { question: Extract<Question, { kind: 'multi' }> }) {
  const reduceMotion = useReduceMotion();
  const { complete } = useQuizNavigation();
  const stored = useOnboardingStore((state) => state.answers[question.field]) as
    string[] | undefined;
  const setAnswer = useOnboardingStore((state) => state.setAnswer);

  // Equipment starts on "Just a mat", which is true of everyone. Nothing is
  // assumed about what she wants to work around.
  const fallback = question.field === 'equipment' ? [question.exclusive] : [];
  const value = stored ?? fallback;

  const toggle = (option: string) => {
    const next = toggleOption(value, option, question.exclusive);
    // Equipment can never be empty: with nothing else ticked, it is just a mat.
    setAnswer(question.field, (next.length === 0 ? fallback : next) as never);
  };

  const onContinue = () => {
    if (stored === undefined) setAnswer(question.field, value as never);
    complete(question.id, value);
  };

  return (
    <QuestionFrame
      title={copyFor(question.id).title}
      subtitle={staticSubtitle(question.id)}
      testID={`quiz-${question.id}`}
      footer={
        <Button
          label={t.common.continue}
          onPress={onContinue}
          disabled={value.length === 0}
          testID="quiz-continue"
        />
      }>
      <View style={styles.options}>
        {question.options.map((option, index) => (
          <Animated.View key={option} entering={enterStaggered(index, reduceMotion)}>
            <OptionCard
              mode="multi"
              label={optionLabel(question.id, option)}
              selected={value.includes(option)}
              onPress={() => toggle(option)}
              testID={`option-${option}`}
            />
          </Animated.View>
        ))}
      </View>
    </QuestionFrame>
  );
}

/** Seven day pills. The number chosen must match "Days per week". */
function WeekdayChoice({ question }: { question: Extract<Question, { kind: 'weekdays' }> }) {
  const { complete } = useQuizNavigation();
  const count = useOnboardingStore((state) => state.answers.daysPerWeek);
  const stored = useOnboardingStore((state) => state.answers.weekdays);
  const setAnswer = useOnboardingStore((state) => state.setAnswer);

  // A sensible spread is pre-selected; she can change any of it.
  useEffect(() => {
    if (count !== undefined && stored === undefined) {
      setAnswer('weekdays', suggestedWeekdays(count));
    }
  }, [count, stored, setAnswer]);

  // This question depends on the one before it.
  if (count === undefined) {
    return <Redirect href={{ pathname: '/quiz/[step]', params: { step: 'days_per_week' } }} />;
  }

  const value = stored ?? suggestedWeekdays(count);
  const full = value.length >= count;
  const copy = t.quiz.questions.weekdays;

  return (
    <QuestionFrame
      title={copy.title}
      subtitle={copy.subtitle(count)}
      testID="quiz-weekdays"
      footer={
        <Button
          label={t.common.continue}
          onPress={() => complete(question.id, value)}
          disabled={!weekdaysMatch(value, count)}
          testID="quiz-continue"
        />
      }>
      <View style={styles.days}>
        {WEEKDAYS.map((day) => {
          const selected = value.includes(day);
          return (
            <DayPill
              key={day}
              letter={t.weekdays.letter[day - 1]}
              accessibilityLabel={t.weekdays.long[day - 1]}
              selected={selected}
              disabled={full && !selected}
              onPress={() => setAnswer('weekdays', toggleWeekday(value, day, count))}
              testID={`day-${day}`}
            />
          );
        })}
      </View>
      <Text
        variant="callout"
        color="textSecondary"
        center
        accessibilityLiveRegion="polite"
        style={styles.status}>
        {copy.status(value.length, count)}
      </Text>
    </QuestionFrame>
  );
}

/** Her first name. Optional: an empty field shows Skip. */
function FirstName({ question }: { question: Extract<Question, { kind: 'text' }> }) {
  const { complete } = useQuizNavigation();
  const stored = useOnboardingStore((state) => state.answers.firstName);
  const setAnswer = useOnboardingStore((state) => state.setAnswer);
  const [name, setName] = useState(stored ?? '');
  const copy = t.quiz.questions.first_name;
  const trimmed = name.trim();

  const onContinue = () => {
    const value: QuizAnswers['firstName'] = trimmed;
    setAnswer('firstName', value);
    complete(question.id, value);
  };

  return (
    <QuestionFrame
      title={copy.title}
      subtitle={copy.subtitle}
      testID="quiz-first_name"
      footer={
        <Button
          label={trimmed ? t.common.continue : t.common.skip}
          onPress={onContinue}
          testID="quiz-continue"
        />
      }>
      <TextField
        label={copy.label}
        value={name}
        onChangeText={setName}
        placeholder={copy.placeholder}
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="done"
        maxLength={40}
        onSubmitEditing={onContinue}
        testID="first-name-input"
      />
    </QuestionFrame>
  );
}

const styles = StyleSheet.create({
  options: { gap: space.sm },
  days: {
    flexDirection: 'row',
    gap: space.xxs,
  },
  status: { marginTop: space.md },
});
