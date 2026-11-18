import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ISODate } from '@engine';

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
    onSuccess: (plan) => client.setQueryData(planKeys.current, plan),
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
