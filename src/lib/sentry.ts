import * as Sentry from '@sentry/react-native';
import type { ComponentType } from 'react';

import { env } from '@/config/env';

/**
 * Sentry: crashes and errors, so they are seen without her having to report
 * them. No personal data is attached: the user is a random ID, and
 * `sendDefaultPii` is off.
 *
 * NOT YET RUN AGAINST A PROJECT. TODO(owner): supply EXPO_PUBLIC_SENTRY_DSN,
 * and SENTRY_ORG, SENTRY_PROJECT and SENTRY_AUTH_TOKEN as EAS secrets so
 * builds upload their source maps.
 */
const enabled = Boolean(env.sentryDsn);

export function startCrashReporting(): void {
  if (!enabled) return;
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.appEnv,
    sendDefaultPii: false,
    // Errors only. Performance tracing can be switched on later if it is wanted.
    tracesSampleRate: 0,
  });
}

/** Wraps the root component so that render errors are reported. A pass-through without a DSN. */
export function withCrashReporting<P extends Record<string, unknown>>(
  Root: ComponentType<P>,
): ComponentType<P> {
  return enabled ? Sentry.wrap(Root) : Root;
}

export function identifyForCrashReports(userId: string | null): void {
  if (!enabled) return;
  Sentry.setUser(userId ? { id: userId } : null);
}
