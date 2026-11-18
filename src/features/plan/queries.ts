import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ISODate, Minutes, Rating, Weekday } from '@engine';

import { planRepository } from './repository';
import type { StoredPlan } from './types';

/**
 * Server data for the plan, through TanStack Query. The cache is persisted to
 * the phone (see src/app/_layout.tsx), so today's plan and the class details
 * are there when she opens the app without a connection.
 */
export const planKeys = {
  catalogue: ['classes'] as const,
  current: ['plan', 'current'] as const,
  history: ['plan', 'history'] as const,
};

const HOUR = 60 * 60_000;

/** The published classes. They change rarely, so they are kept for an hour. */
export function useCatalogue() {
  return useQuery({
    queryKey: planKeys.catalogue,
    queryFn: () => planRepository.getCatalogue(),
    staleTime: HOUR,
  });
}

/**
 * Her plan as it stands today. Fetching it is also what moves a missed
 * session, so it is refetched whenever the app comes back to the front.
 */
export function useCurrentPlan() {
  return useQuery({
    queryKey: planKeys.current,
    queryFn: () => planRepository.getCurrentPlan(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

function usePlanMutation<Args>(run: (args: Args) => Promise<StoredPlan>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (plan) => {
      client.setQueryData(planKeys.current, plan);
      client.invalidateQueries({ queryKey: planKeys.history });
    },
  });
}

export const useBuildPlan = () => usePlanMutation<void>(() => planRepository.buildPlan());

export const useMoveSession = () =>
  usePlanMutation<{ sessionId: string; to: ISODate }>(({ sessionId, to }) =>
    planRepository.moveSession(sessionId, to),
  );

export const useCompleteSession = () =>
  usePlanMutation<{ sessionId: string }>(({ sessionId }) =>
    planRepository.completeSession(sessionId),
  );

/** The instructors, for the "With …" line on class detail. They change almost never. */
export function useInstructors() {
  return useQuery({
    queryKey: ['instructors'] as const,
    queryFn: () => planRepository.getInstructors(),
    staleTime: 24 * HOUR,
  });
}

/** Every plan she has had and how the classes felt, for Progress and the after-class screen. */
export function useHistory() {
  return useQuery({
    queryKey: planKeys.history,
    queryFn: () => planRepository.getHistory(),
    staleTime: 0,
  });
}

/** Rate a finished session. The plan may change in answer (rule 8). */
export function useRateSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, rating }: { sessionId: string; rating: Rating }) =>
      planRepository.rateSession(sessionId, rating),
    onSuccess: ({ plan }) => {
      client.setQueryData(planKeys.current, plan);
      client.invalidateQueries({ queryKey: planKeys.history });
    },
  });
}

/** "Adjust my plan": lay the rest of the plan out again. */
export const useAdjustPlan = () =>
  usePlanMutation<{ weekdays: readonly Weekday[]; minutes: Minutes }>((changes) =>
    planRepository.adjustPlan(changes),
  );

/** Where she left off in a class, for "Pick up where you left off". */
export function useClassProgress(classId: string | undefined) {
  return useQuery({
    queryKey: ['class-progress', classId] as const,
    queryFn: () => (classId ? planRepository.getClassProgress(classId) : null),
    enabled: Boolean(classId),
    staleTime: 0,
  });
}
