import * as Tracking from 'expo-tracking-transparency';
import { Platform } from 'react-native';

import { env } from '@/config/env';

import { adEventFor, type AdEvent } from './adEvents';
import { addAnalyticsSink } from './analytics';

/**
 * Attribution: which advert, if any, brought her to the app. AppsFlyer.
 *
 * ASSUMPTION: the brief leaves the choice between AppsFlyer and Adjust open.
 * AppsFlyer is used here; TODO(owner) confirm, or say Adjust and this one
 * file changes.
 *
 * The rules:
 *  - it hears two events only, a trial started and a subscription bought
 *    (src/lib/adEvents.ts);
 *  - the tracking permission prompt is shown after her first completed class,
 *    never at launch, and the app works the same whatever she answers;
 *  - with no key, none of this runs and the prompt is never shown.
 *
 * SKAdNetwork and AdAttributionKit postbacks are sent by the SDK. Their
 * conversion values are mapped to these same two events in the AppsFlyer
 * dashboard; the mapping to set there is written out in docs/attribution.md.
 *
 * NOT YET RUN. It needs an iOS build. TODO(owner): supply
 * EXPO_PUBLIC_ATTRIBUTION_KEY (the AppsFlyer dev key) and
 * EXPO_PUBLIC_APP_STORE_ID.
 */
export const attributionConfigured =
  Platform.OS === 'ios' &&
  Boolean(env.attributionKey && env.appStoreId) &&
  (env.attributionProvider === '' || env.attributionProvider === 'appsflyer');

/** The part of the AppsFlyer SDK (version 7) that is used here. */
type AppsFlyerSdk = {
  init(params: { devKey: string; appId?: string | null }): Promise<void>;
  registerSessionReadyListener(onReady: () => void): Promise<void>;
  start(): Promise<void>;
  logEvent(params: AdEvent): Promise<void>;
  setCustomerUserId(params: { customerUserId: string }): Promise<void>;
  getAppsFlyerUID(): Promise<string | null>;
};

let sdk: AppsFlyerSdk | null = null;

/**
 * Start attribution. `onId` receives AppsFlyer's ID for this install, which
 * RevenueCat needs in order to report renewals to AppsFlyer from its server.
 */
export async function startAttribution(onId: (id: string) => void): Promise<void> {
  if (!attributionConfigured || sdk) return;
  try {
    // Loaded on demand: the library only exists in a native build.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = (require('react-native-appsflyer') as { default: AppsFlyerSdk }).default;
    sdk = loaded;

    await loaded.init({ devKey: env.attributionKey, appId: env.appStoreId });
    // Version 7 starts by hand, once its session is ready.
    await loaded.registerSessionReadyListener(() => {
      loaded.start().catch(() => {});
    });

    addAnalyticsSink((name, properties) => {
      const event = adEventFor(name, properties);
      if (event) loaded.logEvent(event).catch(() => {});
    });

    const id = await loaded.getAppsFlyerUID();
    if (id) onId(id);
  } catch {
    // Attribution must never get in the way of the app.
    sdk = null;
  }
}

/** The same random user ID as everywhere else, so installs can be matched to subscriptions. */
export function identifyForAttribution(userId: string | null): void {
  if (userId) sdk?.setCustomerUserId({ customerUserId: userId }).catch(() => {});
}

/**
 * Show Apple's tracking prompt, once, if it has never been answered. Called
 * after her first completed class. Does nothing when attribution is off.
 */
export async function askToTrack(): Promise<void> {
  if (!attributionConfigured) return;
  try {
    const current = await Tracking.getTrackingPermissionsAsync();
    if (current.status !== 'undetermined') return;
    await Tracking.requestTrackingPermissionsAsync();
  } catch {
    // Not available (an older system, or restricted). Nothing to ask.
  }
}
