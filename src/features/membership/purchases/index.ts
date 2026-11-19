import { Platform } from 'react-native';

import { env } from '@/config/env';

import { NO_ENTITLEMENT } from '../entitlement';
import { usableStoreKey } from './storeKey';
import type { PurchasesProvider } from './types';

export type { PurchaseFailure, PurchaseOutcome, PurchasesProvider, RestoreOutcome } from './types';

/**
 * No store at all: a release build with no RevenueCat key. The paywall says
 * membership is unavailable; nothing can be bought and nothing is unlocked.
 */
const unavailableProvider: PurchasesProvider = {
  kind: 'unavailable',
  async start() {},
  async setUser() {},
  async products() {
    return [];
  },
  async trialEligibility() {
    return {};
  },
  async purchase() {
    return { status: 'failed', reason: 'unavailable' };
  },
  async restore() {
    return { status: 'failed' };
  },
  async entitlement() {
    return NO_ENTITLEMENT;
  },
  subscribe() {
    return () => {};
  },
  async manage() {},
  async redeemCode() {},
  setAttributionId() {},
};

/**
 *   an iOS build with a RevenueCat key   → RevenueCat (StoreKit, or its Test Store)
 *   development, otherwise               → the preview store
 *   a release build with no usable key   → unavailable (see storeKey.ts)
 *
 * The modules are loaded on demand so the preview store never ships in a
 * release build and the native library is never touched on the web.
 */
function pick(): PurchasesProvider {
  if (Platform.OS === 'ios' && usableStoreKey(env.revenueCatIosKey, __DEV__)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./revenuecat') as typeof import('./revenuecat')).revenueCatProvider;
  }
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./preview') as typeof import('./preview')).previewProvider;
  }
  return unavailableProvider;
}

export const purchases: PurchasesProvider = pick();
