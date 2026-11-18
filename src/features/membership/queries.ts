import { useQuery } from '@tanstack/react-query';

import { purchases } from './purchases';

/**
 * What the store has to sell, and whether she can still have the free trial.
 *
 * Neither is kept between launches: a price must always be the store's
 * current one, so these are fetched fresh and never read from an old cache.
 */
export const membershipKeys = {
  products: ['membership', 'products'] as const,
  eligibility: (ids: readonly string[]) => ['membership', 'eligibility', ...ids] as const,
};

export function useProducts(enabled = true) {
  return useQuery({
    queryKey: membershipKeys.products,
    enabled,
    queryFn: () => purchases.products(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    meta: { persist: false },
  });
}

export function useTrialEligibility(productIds: readonly string[]) {
  return useQuery({
    queryKey: membershipKeys.eligibility(productIds),
    queryFn: () => purchases.trialEligibility([...productIds]),
    enabled: productIds.length > 0,
    staleTime: 0,
    gcTime: 0,
    meta: { persist: false },
  });
}
