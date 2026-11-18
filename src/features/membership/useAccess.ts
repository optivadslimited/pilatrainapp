import { canPlaySession, canWatchClass } from '@shared/billing/access';

import { useCurrentPlan } from '@/features/plan/queries';

import { useMembership } from './membership';

/**
 * What she may play. The rule itself is in supabase/functions/_shared/billing
 * (the server applies the same one before handing out a video address); this
 * hook applies it to her membership and her plan.
 */
export function useAccess() {
  const { isMember } = useMembership();
  const plan = useCurrentPlan().data ?? null;

  return {
    isMember,
    /** A class on its own, from the library. */
    canWatch: (cls: { id: string; isFree: boolean }) => canWatchClass(isMember, cls, plan),
    /** A session of her plan. */
    canPlay: (sessionId: string) => canPlaySession(isMember, plan, sessionId),
  };
}
