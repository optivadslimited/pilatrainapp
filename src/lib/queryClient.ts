import { QueryClient } from '@tanstack/react-query';

/**
 * Server data goes through TanStack Query. Defaults are tuned for a phone on
 * a patchy connection: data stays fresh for a minute, is kept for a day so
 * today's plan can be shown offline, and a failed request retries twice.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000,
      retry: 2,
      refetchOnReconnect: true,
    },
  },
});
