import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type PurchasesPackage,
} from 'react-native-purchases';

import { env } from '@/config/env';

import type { Entitlement } from '../entitlement';
import type { StoreProduct } from '../products';
import { entitlementFrom, storeProductFrom } from './mapping';
import type { PurchaseFailure, PurchasesProvider } from './types';

/**
 * The real store: StoreKit, through RevenueCat.
 *
 * NOT YET RUN. It needs an iOS build, a RevenueCat project with the `member`
 * entitlement and a default offering, and the three products in App Store
 * Connect. TODO(owner): supply EXPO_PUBLIC_REVENUECAT_IOS_KEY.
 */
let packages: PurchasesPackage[] = [];

/** Adjust starts before RevenueCat is configured, so its ID may arrive first and has to wait. */
let configured = false;
let attributionId: string | null = null;

function shareAttributionId(): void {
  if (!configured || !attributionId) return;
  // What RevenueCat's Adjust integration asks for: the device identifiers and Adjust's own ID.
  Purchases.collectDeviceIdentifiers().catch(() => {});
  Purchases.setAdjustID(attributionId).catch(() => {});
}

const failureOf = (code: unknown): PurchaseFailure => {
  switch (code) {
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
      return 'offline';
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return 'not_allowed';
    case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
      return 'unavailable';
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
      return 'store_problem';
    default:
      return 'unknown';
  }
};

const codeOf = (error: unknown): unknown =>
  typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;

export const revenueCatProvider: PurchasesProvider = {
  kind: 'revenuecat',

  async start(userId) {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.INFO : LOG_LEVEL.ERROR);
    // The RevenueCat user ID is her Supabase user ID from the first launch.
    Purchases.configure({ apiKey: env.revenueCatIosKey, appUserID: userId });
    configured = true;
    shareAttributionId();
  },

  async setUser(userId) {
    if (userId) await Purchases.logIn(userId);
    else if (!(await Purchases.isAnonymous())) await Purchases.logOut();
  },

  async products() {
    const offerings = await Purchases.getOfferings();
    packages = offerings.current?.availablePackages ?? [];
    return packages
      .map((item) => storeProductFrom(item.product))
      .filter((product): product is StoreProduct => product !== null);
  },

  async trialEligibility(productIds) {
    const result = await Purchases.checkTrialOrIntroductoryPriceEligibility(productIds);
    // "Unknown" is treated as not eligible: the paywall never promises a free
    // week it cannot be sure of.
    return Object.fromEntries(
      productIds.map((id) => [
        id,
        result[id]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
      ]),
    );
  },

  async purchase(productId) {
    const chosen = packages.find((item) => item.product.identifier === productId);
    if (!chosen) return { status: 'failed', reason: 'unavailable' };
    try {
      const { customerInfo } = await Purchases.purchasePackage(chosen);
      const entitlement = entitlementFrom(customerInfo);
      // Paid, but the entitlement has not arrived: it will, through the listener.
      return entitlement.active ? { status: 'purchased', entitlement } : { status: 'pending' };
    } catch (error) {
      const code = codeOf(error);
      if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { status: 'cancelled' };
      if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { status: 'pending' };
      if (code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
        const restored = await this.restore();
        if (restored.status === 'restored') {
          return { status: 'purchased', entitlement: restored.entitlement };
        }
      }
      return { status: 'failed', reason: failureOf(code) };
    }
  },

  async restore() {
    try {
      const entitlement = entitlementFrom(await Purchases.restorePurchases());
      return entitlement.active ? { status: 'restored', entitlement } : { status: 'nothing' };
    } catch {
      return { status: 'failed' };
    }
  },

  async entitlement() {
    return entitlementFrom(await Purchases.getCustomerInfo());
  },

  subscribe(listener: (entitlement: Entitlement) => void) {
    const onUpdate = (info: Parameters<typeof entitlementFrom>[0]) =>
      listener(entitlementFrom(info));
    Purchases.addCustomerInfoUpdateListener(onUpdate);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(onUpdate);
    };
  },

  async manage() {
    await Purchases.showManageSubscriptions();
  },

  async redeemCode() {
    await Purchases.presentCodeRedemptionSheet();
  },

  setAttributionId(id) {
    attributionId = id;
    shareAttributionId();
  },
};
