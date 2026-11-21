import { brand } from '@/config/brand';

import { NO_ENTITLEMENT, type Entitlement } from '../entitlement';
import { planOf, type StoreProduct } from '../products';

/**
 * RevenueCat's objects, reduced to ours. Plain functions over plain shapes
 * (only the fields we read), so they are tested without the native library.
 */
export type RcEntitlementInfo = {
  isActive: boolean;
  willRenew: boolean;
  periodType: string;
  productIdentifier: string;
  expirationDate: string | null;
  billingIssueDetectedAt: string | null;
};

export type RcCustomerInfo = {
  entitlements: { all: Record<string, RcEntitlementInfo | undefined> };
};

export function entitlementFrom(info: RcCustomerInfo): Entitlement {
  const member = info.entitlements.all[brand.store.entitlement];
  if (!member) return NO_ENTITLEMENT;
  return {
    active: member.isActive,
    productId: member.productIdentifier,
    period: member.periodType === 'TRIAL' ? 'trial' : 'paid',
    expiresAt: member.expirationDate,
    willRenew: member.willRenew,
    // A billing issue only matters while she still has access: that is the grace period.
    billingIssueAt: member.isActive ? member.billingIssueDetectedAt : null,
  };
}

export type RcProduct = {
  identifier: string;
  price: number;
  priceString: string;
  /** The price divided by the months in the period, formatted as `priceString` is. */
  pricePerMonthString: string | null;
  currencyCode: string;
  /** ISO 8601, e.g. "P3M". */
  subscriptionPeriod: string | null;
  introPrice: {
    price: number;
    cycles: number;
    periodUnit: string;
    periodNumberOfUnits: number;
  } | null;
};

const MONTHS: Record<string, number> = { P1M: 1, P3M: 3, P6M: 6, P1Y: 12 };
const UNIT_DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/** A free trial's length in days, or `null` if the introductory offer is not free. */
export function trialDaysOf(intro: RcProduct['introPrice']): number | null {
  if (!intro || intro.price !== 0) return null;
  const days = (UNIT_DAYS[intro.periodUnit] ?? 0) * intro.periodNumberOfUnits * intro.cycles;
  return days > 0 ? days : null;
}

/** One of our three subscriptions, or `null` for anything else in the offering. */
export function storeProductFrom(product: RcProduct): StoreProduct | null {
  const plan = planOf(product.identifier);
  const periodMonths = product.subscriptionPeriod ? MONTHS[product.subscriptionPeriod] : undefined;
  if (!plan || !periodMonths) return null;
  return {
    productId: product.identifier,
    plan,
    price: product.price,
    priceString: product.priceString,
    pricePerMonthString: product.pricePerMonthString,
    currencyCode: product.currencyCode,
    periodMonths,
    trialDays: trialDaysOf(product.introPrice),
  };
}
