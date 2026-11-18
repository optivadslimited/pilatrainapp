import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { storage } from './storage';

/**
 * Server data goes through TanStack Query. Defaults are tuned for a phone on
 * a patchy connection: data stays fresh for a minute, is kept for a week so
 * today's plan can be shown offline, and a failed request retries twice.
 */
const WEEK = 7 * 24 * 60 * 60_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: WEEK,
      retry: 2,
      refetchOnReconnect: true,
    },
  },
});

/**
 * The query cache is written to the phone, so the plan and class details she
 * last saw are there on the next launch, connection or not.
 */
export const queryPersister = createSyncStoragePersister({
  storage: {
    getItem: (key) => storage.getString(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => {
      storage.remove(key);
    },
  },
  key: 'query-cache',
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: WEEK,
  /** Change this when the shape of cached data changes, to drop old caches. */
  buster: 'plan-v1',
};

// Coming back to the app counts as focus, so the plan is brought up to date
// (and a missed session moved) each time she opens it.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
}
