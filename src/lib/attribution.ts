import { Platform } from 'react-native';

import { env } from '@/config/env';

import { adEventFor, type AdEvent } from './adEvents';
import { addAnalyticsSink } from './analytics';

/**
 * Attribution: which advert, if any, brought her to the app. AppsFlyer (the
 * owner's choice on 21 November 2026, in place of Adjust; the brief offered
 * either).
 *
 * The rules:
 *  - it hears two events only, a trial started and a subscription bought
 *    (src/lib/adEvents.ts), with the product she chose as their one value;
 *  - the tracking permission prompt is shown after her first completed class,
 *    never at launch, and the app works the same whatever she answers;
 *  - with no dev key or no app ID, none of this runs and the prompt is never
 *    shown.
 *
 * SKAdNetwork and AdAttributionKit are handled by the SDK. Their conversion
 * values are set in AppsFlyer's dashboard and mapped there to these same two
 * events; the mapping to set is written out in docs/attribution.md.
 *
 * NOT YET RUN. It needs an iOS build, the app in App Store Connect (for its
 * numeric Apple ID) and the app added in AppsFlyer. TODO(owner): supply
 * EXPO_PUBLIC_APPSFLYER_DEV_KEY and EXPO_PUBLIC_APPSFLYER_APP_ID.
 */
export const attributionConfigured =
  Platform.OS === 'ios' && Boolean(env.appsFlyerDevKey && env.appsFlyerAppId);

type AppsFlyerSdk = (typeof import('react-native-appsflyer'))['default'];
type TrackingModule = typeof import('expo-tracking-transparency');

let appsFlyer: AppsFlyerSdk | null = null;

/** AppsFlyer's own names for the two events, so its reports and partners know them without mapping. */
const EVENT_NAMES: Record<AdEvent['kind'], string> = {
  trial: 'af_start_trial',
  purchase: 'af_subscribe',
};

/** Attribution must never get in the way of the app: its failures are swallowed. */
const quietly = (promise: Promise<unknown> | undefined): void => {
  promise?.catch(() => {});
};

/**
 * Start attribution. `onId` receives AppsFlyer's ID for this install, which
 * RevenueCat needs in order to report renewals to AppsFlyer from its server.
 */
export function startAttribution(onId: (id: string) => void): void {
  if (!attributionConfigured || appsFlyer) return;
  try {
    // Loaded on demand: the library only exists in a native build.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sdk = (require('react-native-appsflyer') as typeof import('react-native-appsflyer'))
      .default;

    // The start-up order of SDK 7: init, then a session-ready listener
    // registered at once, and start only from inside it. There is no waiting
    // for the tracking prompt at launch, because the prompt comes later.
    quietly(sdk.init({ devKey: env.appsFlyerDevKey, appId: env.appsFlyerAppId }));
    if (__DEV__) quietly(sdk.enableDebug({ enabled: true }));
    quietly(
      sdk.registerSessionReadyListener(() => {
        sdk
          .start()
          .then(() => sdk.getAppsFlyerUID())
          .then((uid) => {
            if (uid) onId(uid);
          })
          .catch(() => {});
      }),
    );
    appsFlyer = sdk;

    addAnalyticsSink((name, properties) => {
      const event = adEventFor(name, properties);
      if (!event) return;
      // The product is the only value sent: which plan, and nothing about her.
      quietly(
        sdk.logEvent({
          eventName: EVENT_NAMES[event.kind],
          eventValues: { af_content_id: event.product },
        }),
      );
    });
  } catch {
    appsFlyer = null;
  }
}

/**
 * The same random user ID as everywhere else, as AppsFlyer's customer user ID,
 * so an install can be matched to a subscription. Cleared when she has none.
 */
export function identifyForAttribution(userId: string | null): void {
  if (!appsFlyer) return;
  try {
    quietly(appsFlyer.setCustomerUserId({ customerId: userId ?? '' }));
  } catch {
    // As above.
  }
}

/** Settles with the result, or with `null` if it fails or takes longer than `ms`. */
function within<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * Show Apple's tracking prompt, once, if it has never been answered. Called
 * after her first completed class. Does nothing when attribution is off.
 *
 * AppsFlyer reads her answer by itself from then on. The promise always
 * settles, so the screen that waits on it can never be left hanging by a
 * prompt that does not report back.
 */
export async function askToTrack(): Promise<void> {
  if (!appsFlyer) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tracking = require('expo-tracking-transparency') as TrackingModule;
    // If the status never comes back, carry on without asking.
    const current = await within(tracking.getTrackingPermissionsAsync(), 1500);
    if (current?.status !== tracking.PermissionStatus.UNDETERMINED) return;
    // The prompt is on screen. Wait for her answer, but not for ever.
    await within(tracking.requestTrackingPermissionsAsync(), 60_000);
  } catch {
    // As above.
  }
}
