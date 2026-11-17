import { QUESTIONS, questionIndex, type QuestionId, type QuizAnswers } from './questions';
import { needsSafetyGate, type GateState } from './safety';
import type { OnboardingStatus } from './store';

/**
 * Where onboarding goes next. Kept as plain functions with no navigation in
 * them, so the order of the quiz, the safety gate and the disclaimer can be
 * unit-tested.
 */
export type FlowTarget =
  | { screen: 'question'; id: QuestionId }
  | { screen: 'safety' }
  | { screen: 'disclaimer' }
  | { screen: 'building' };

type FlowState = { answers: Partial<QuizAnswers>; gate: GateState };

/**
 * After answering `id`.
 *
 * The safety gate sits directly after "Anything to work around": if she chose
 * "Pregnant or postpartum" or "Recent injury or surgery" and has not already
 * told us she is cleared, she sees the gate before anything else.
 */
export function afterQuestion(id: QuestionId, state: FlowState): FlowTarget {
  if (
    id === 'work_around' &&
    needsSafetyGate(state.answers.workAround) &&
    state.gate !== 'cleared'
  ) {
    return { screen: 'safety' };
  }
  const next = QUESTIONS[questionIndex(id) + 1];
  return next ? { screen: 'question', id: next.id } : { screen: 'disclaimer' };
}

/** After "I've been cleared to exercise", from the gate or from the holding screen. */
export function afterSafetyCleared(): FlowTarget {
  const next = QUESTIONS[questionIndex('work_around') + 1];
  return next ? { screen: 'question', id: next.id } : { screen: 'disclaimer' };
}

/** After the health disclaimer is ticked, the plan is built. */
export function afterDisclaimer(): FlowTarget {
  return { screen: 'building' };
}

/**
 * Progress shown in the bar at the top of the quiz, from 0 to 1. The nine
 * questions and the disclaimer are ten steps, so the first question shows a
 * little progress and the disclaimer shows a full bar.
 */
export const TOTAL_STEPS = QUESTIONS.length + 1;

export function stepNumber(step: QuestionId | 'disclaimer'): number {
  return step === 'disclaimer' ? TOTAL_STEPS : questionIndex(step) + 1;
}

/** Where the launch screen sends her, from what is saved on the device. */
export type LaunchTarget = 'welcome' | 'holding' | 'home';

export function launchTarget(status: OnboardingStatus): LaunchTarget {
  if (status === 'complete') return 'home';
  if (status === 'holding') return 'holding';
  return 'welcome';
}
