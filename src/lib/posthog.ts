import PostHog from 'posthog-react-native';

import { env } from '@/config/env';

import { addAnalyticsSink } from './analytics';
import { useFlagStore } from './flags';
import { storage } from './storage';

/**
 * PostHog: product analytics and the one feature flag (`paywall_variant`).
 *
 * It receives exactly what `track` is given, and `track` is typed: nothing
 * about pregnancy, injury or pain can be sent, because the only event that
 * touches those answers reduces them to a yes-or-no flag first
 * (`quizAnswerForAnalytics`). There is no autocapture and no session replay,
 * so nothing typed or shown on screen is recorded.
 *
 * NOT YET RUN AGAINST A PROJECT. TODO(owner): supply EXPO_PUBLIC_POSTHOG_KEY
 * and EXPO_PUBLIC_POSTHOG_HOST, and create the `paywall_variant` flag with
 * the variants `quarterly` and `annual`.
 */
let client: PostHog | null = null;

export function startAnalytics(): void {
  if (client || !env.posthogKey) return;

  client = new PostHog(env.posthogKey, {
    host: env.posthogHost || 'https://eu.i.posthog.com',
    // "Application Installed" is the first step of the install-to-paid funnel.
    captureAppLifecycleEvents: true,
    enableSessionReplay: false,
    // Its own small store on the device, alongside everything else.
    customStorage: {
      getItem: (key) => storage.getString(`posthog.${key}`) ?? null,
      setItem: (key, value) => storage.set(`posthog.${key}`, value),
    },
  });

  addAnalyticsSink((name, properties) => {
    client?.capture(name, properties);
  });

  const readFlags = () => {
    useFlagStore
      .getState()
      .setFlags({ paywall_variant: client?.getFeatureFlag('paywall_variant') });
  };
  client.onFeatureFlags(readFlags);
  readFlags();
}

/**
 * Tie events to her user ID, the same one the server uses for the
 * subscription events, so the trial-to-paid funnel joins up. The ID is a
 * random UUID. Her name and email are never sent.
 */
export function identifyForAnalytics(userId: string | null): void {
  if (!client) return;
  if (userId) client.identify(userId);
  else client.reset();
}
