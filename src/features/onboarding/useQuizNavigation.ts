import { useRouter } from 'expo-router';

import { quizAnswerForAnalytics, track } from '@/lib/analytics';

import { afterQuestion, type FlowTarget } from './flow';
import { QUESTIONS, questionIndex, type QuestionId } from './questions';
import { useOnboardingStore } from './store';

/**
 * Turns the flow's decisions (src/features/onboarding/flow.ts) into
 * navigation, and records each completed step.
 */
export function useQuizNavigation() {
  const router = useRouter();

  const go = (target: FlowTarget, mode: 'push' | 'replace' = 'push') => {
    const navigate = mode === 'push' ? router.push : router.replace;
    switch (target.screen) {
      case 'question':
        navigate({ pathname: '/quiz/[step]', params: { step: target.id } });
        break;
      case 'safety':
        navigate('/quiz/safety');
        break;
      case 'disclaimer':
        navigate('/quiz/disclaimer');
        break;
      case 'building':
        router.replace('/building');
        break;
    }
  };

  /**
   * Call when a question has been answered. Sends `quiz_step_completed` with
   * the answer reduced to what analytics may see, then moves on.
   */
  const complete = (
    id: QuestionId,
    answer: string | number | readonly (string | number)[] | undefined,
  ) => {
    track('quiz_step_completed', { step: id, answer: quizAnswerForAnalytics(id, answer) });
    go(afterQuestion(id, useOnboardingStore.getState()));
  };

  /**
   * The back arrow. Goes to the previous question whether or not it is still
   * in the navigation history (it is not after resuming from the holding
   * screen). From the first question it returns to Welcome.
   */
  const back = (from: QuestionId | 'safety' | 'disclaimer') => {
    const previous =
      from === 'disclaimer'
        ? QUESTIONS[QUESTIONS.length - 1]
        : from === 'safety'
          ? QUESTIONS[questionIndex('work_around')]
          : QUESTIONS[questionIndex(from) - 1];

    if (previous) {
      router.dismissTo({ pathname: '/quiz/[step]', params: { step: previous.id } });
    } else {
      router.dismissTo('/welcome');
    }
  };

  return { go, complete, back };
}
