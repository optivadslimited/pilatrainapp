import { Platform } from 'react-native';

import { env } from '@/config/env';

import { adEventFor, type AdEvent } from './adEvents';
import { addAnalyticsSink } from './analytics';

/**
 * Attribution: which advert, if any, brought her to the app. Adjust (the
 * owner's choice; the brief offered AppsFlyer or Adjust).
 *
 * The rules:
 *  - it hears two events only, a trial started and a subscription bought
 *    (src/lib/adEvents.ts);
 *  - the tracking permission prompt is shown after her first completed class,
 *    never at launch, and the app works the same whatever she answers;
 *  - with no app token, none of this runs and the prompt is never shown.
 *
 * SKAdNetwork and AdAttributionKit are handled by the SDK. Their conversion
 * values are managed in the Adjust dashboard and mapped there to these same
 * two events; the mapping to set is written out in docs/attribution.md.
 *
 * NOT YET RUN. It needs an iOS build and an Adjust account. TODO(owner):
 * supply EXPO_PUBLIC_ADJUST_APP_TOKEN and the two event tokens.
 */
export const attributionConfigured = Platform.OS === 'ios' && Boolean(env.adjustAppToken);

type AdjustModule = typeof import('react-native-adjust');

let adjust: AdjustModule | null = null;

/** Adjust identifies an event by a token created in its dashboard. */
const tokenFor = (event: AdEvent): string =>
  event.kind === 'trial' ? env.adjustTrialEventToken : env.adjustPurchaseEventToken;

/**
 * Start attribution. `onId` receives Adjust's ID for this install, which
 * RevenueCat needs in order to report renewals to Adjust from its server.
 */
export function startAttribution(onId: (id: string) => void): void {
  if (!attributionConfigured || adjust) return;
  try {
    // Loaded on demand: the library only exists in a native build.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('react-native-adjust') as AdjustModule;
    const { Adjust, AdjustConfig, AdjustEvent } = loaded;

    // Sandbox data is kept apart in Adjust, so test installs never count.
    const config = new AdjustConfig(
      env.adjustAppToken,
      env.isProduction ? AdjustConfig.EnvironmentProduction : AdjustConfig.EnvironmentSandbox,
    );
    config.setLogLevel(__DEV__ ? AdjustConfig.LogLevelInfo : AdjustConfig.LogLevelSuppress);
    Adjust.initSdk(config);
    adjust = loaded;

    addAnalyticsSink((name, properties) => {
      const event = adEventFor(name, properties);
      const token = event ? tokenFor(event) : '';
      if (!event || !token) return;
      const adjustEvent = new AdjustEvent(token);
      // A callback parameter comes back to us in Adjust's reports. It is not
      // passed on to ad networks.
      adjustEvent.addCallbackParameter('product', event.product);
      Adjust.trackEvent(adjustEvent);
    });

    Adjust.getAdid((adid) => {
      if (adid) onId(adid);
    });
  } catch {
    // Attribution must never get in the way of the app.
    adjust = null;
  }
}

/**
 * The same random user ID as everywhere else, attached to what Adjust reports
 * back to us, so an install can be matched to a subscription.
 */
export function identifyForAttribution(userId: string | null): void {
  if (!adjust) return;
  try {
    adjust.Adjust.removeGlobalCallbackParameter('user_id');
    if (userId) adjust.Adjust.addGlobalCallbackParameter('user_id', userId);
  } catch {
    // As above.
  }
}

/** Apple's value for "she has not been asked yet". */
const NOT_DETERMINED = 0;

/**
 * Show Apple's tracking prompt, once, if it has never been answered. Called
 * after her first completed class. Does nothing when attribution is off.
 *
 * Adjust's own request is used so that it learns her answer straight away.
 * The promise always settles, so the screen that waits on it can never be
 * left hanging by a prompt that does not report back.
 */
export function askToTrack(): Promise<void> {
  const sdk = adjust;
  if (!sdk) return Promise.resolve();

  return new Promise((resolve) => {
    // If the status never comes back, carry on without asking.
    const giveUp = setTimeout(resolve, 1500);
    try {
      sdk.Adjust.getAppTrackingAuthorizationStatus((status) => {
        clearTimeout(giveUp);
        if (status !== NOT_DETERMINED) return resolve();
        // The prompt is on screen. Wait for her answer, but not for ever.
        const patience = setTimeout(resolve, 60_000);
        sdk.Adjust.requestAppTrackingAuthorization(() => {
          clearTimeout(patience);
          resolve();
        });
      });
    } catch {
      clearTimeout(giveUp);
      resolve();
    }
  });
}
