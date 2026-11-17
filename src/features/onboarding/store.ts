import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

import type { DaysPerWeek, QuizAnswers, WorkAround } from './questions';
import { needsSafetyGate, type GateState } from './safety';
import { suggestedWeekdays } from './weekdays';

/**
 * Where she is in onboarding.
 *  - idle: has not started the quiz.
 *  - in_progress: partway through.
 *  - holding: chose "I'll check first" at the safety gate. Her answers are
 *    saved and the app opens on the holding screen until she is cleared.
 *  - complete: finished the quiz and ticked the health disclaimer.
 */
export type OnboardingStatus = 'idle' | 'in_progress' | 'holding' | 'complete';

type OnboardingState = {
  status: OnboardingStatus;
  answers: Partial<QuizAnswers>;
  gate: GateState;
  /** ISO timestamp of when she ticked the health disclaimer. */
  disclaimerAcceptedAt: string | null;
  /** ISO timestamp the holding-screen reminder is set for, if she asked for one. */
  holdingReminderAt: string | null;

  start: () => void;
  setAnswer: <K extends keyof QuizAnswers>(field: K, value: QuizAnswers[K]) => void;
  clearGate: () => void;
  checkFirst: () => void;
  setHoldingReminder: (at: string | null) => void;
  acceptDisclaimer: (at: string) => void;
  reset: () => void;
};

const initial = {
  status: 'idle' as OnboardingStatus,
  answers: {} as Partial<QuizAnswers>,
  gate: 'not_shown' as GateState,
  disclaimerAcceptedAt: null as string | null,
  holdingReminderAt: null as string | null,
};

/**
 * Onboarding state, kept on the device so the quiz survives a restart.
 *
 * It holds health answers (`workAround`). They stay on the device until they
 * are sent to our own database, and are never passed to analytics.
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initial,

      start: () => set((state) => (state.status === 'idle' ? { status: 'in_progress' } : state)),

      setAnswer: (field, value) =>
        set((state) => {
          const answers: Partial<QuizAnswers> = { ...state.answers, [field]: value };
          let gate = state.gate;

          // A new number of days makes the old choice of days wrong, so suggest a fresh spread.
          if (field === 'daysPerWeek') {
            const count = value as DaysPerWeek;
            if (answers.weekdays?.length !== count) answers.weekdays = suggestedWeekdays(count);
          }

          // If she removes both gated answers, the gate no longer applies.
          if (field === 'workAround' && !needsSafetyGate(value as WorkAround[])) {
            gate = 'not_shown';
          }

          return { answers, gate, status: state.status === 'idle' ? 'in_progress' : state.status };
        }),

      clearGate: () => set({ gate: 'cleared', status: 'in_progress', holdingReminderAt: null }),

      checkFirst: () => set({ gate: 'checking_first', status: 'holding' }),

      setHoldingReminder: (at) => set({ holdingReminderAt: at }),

      acceptDisclaimer: (at) => set({ disclaimerAcceptedAt: at, status: 'complete' }),

      reset: () => set({ ...initial }),
    }),
    {
      name: 'onboarding',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ status, answers, gate, disclaimerAcceptedAt, holdingReminderAt }) => ({
        status,
        answers,
        gate,
        disclaimerAcceptedAt,
        holdingReminderAt,
      }),
    },
  ),
);
