import type { QuizInput } from '@shared/plan-service';

import { levelFor, type QuizAnswers } from './questions';
import { isGentle, type GateState } from './safety';

type OnboardingSnapshot = {
  answers: Partial<QuizAnswers>;
  gate: GateState;
  disclaimerAcceptedAt: string | null;
};

/**
 * Her quiz answers as the plan engine needs them, or `null` if the quiz is not
 * finished. A plan is never built before the health disclaimer is ticked.
 */
export function quizInputFrom(state: OnboardingSnapshot): QuizInput | null {
  const { goal, experience, minutes, weekdays, equipment, workAround } = state.answers;
  if (!state.disclaimerAcceptedAt) return null;
  if (!goal || !experience || !minutes || !weekdays || weekdays.length === 0) return null;

  return {
    goal,
    level: levelFor(experience),
    minutes,
    weekdays,
    equipment: equipment ?? ['mat'],
    workAround: workAround ?? ['none'],
    gentle: isGentle(state),
  };
}

/**
 * The same answers as a `quiz_answers` row. This is the only place her health
 * answers (`work_around`, `gentle`) are prepared for sending, and they are
 * sent to one place: our own database.
 */
export function quizAnswersRow(state: OnboardingSnapshot, userId: string) {
  const input = quizInputFrom(state);
  if (!input) return null;

  return {
    user_id: userId,
    goal: input.goal,
    level: input.level,
    minutes: input.minutes,
    days: [...input.weekdays],
    time_of_day: state.answers.timeOfDay ?? 'varies',
    equipment: [...input.equipment],
    work_around: [...input.workAround],
    gentle: input.gentle,
    disclaimer_accepted_at: state.disclaimerAcceptedAt,
    updated_at: new Date().toISOString(),
  };
}
