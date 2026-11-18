import { NO_ENTITLEMENT } from '../entitlement';
import {
  entitlementFrom,
  storeProductFrom,
  trialDaysOf,
  type RcEntitlementInfo,
  type RcProduct,
} from '../purchases/mapping';

const member: RcEntitlementInfo = {
  isActive: true,
  willRenew: true,
  periodType: 'TRIAL',
  productIdentifier: 'pilatrain_quarterly',
  expirationDate: '2026-12-08T10:00:00Z',
  billingIssueDetectedAt: null,
};
const info = (entry?: RcEntitlementInfo) => ({
  entitlements: { all: entry ? { member: entry } : {} },
});

describe('RevenueCat customer info', () => {
  it('reads the member entitlement', () => {
    expect(entitlementFrom(info(member))).toEqual({
      active: true,
      productId: 'pilatrain_quarterly',
      period: 'trial',
      expiresAt: '2026-12-08T10:00:00Z',
      willRenew: true,
      billingIssueAt: null,
    });
    expect(entitlementFrom(info({ ...member, periodType: 'NORMAL' })).period).toBe('paid');
  });

  it('is no membership when the entitlement is absent, and ignores any other entitlement', () => {
    expect(entitlementFrom(info())).toEqual(NO_ENTITLEMENT);
    expect(entitlementFrom({ entitlements: { all: { other: member } } })).toEqual(NO_ENTITLEMENT);
  });

  it('reports a billing issue only while she still has access', () => {
    const issue = {
      ...member,
      periodType: 'NORMAL',
      billingIssueDetectedAt: '2026-12-08T10:00:00Z',
    };
    expect(entitlementFrom(info(issue)).billingIssueAt).toBe('2026-12-08T10:00:00Z');
    expect(entitlementFrom(info({ ...issue, isActive: false })).billingIssueAt).toBeNull();
  });
});

describe('RevenueCat products', () => {
  const product: RcProduct = {
    identifier: 'pilatrain_quarterly',
    price: 44.99,
    priceString: 'STORE PRICE',
    currencyCode: 'USD',
    subscriptionPeriod: 'P3M',
    introPrice: { price: 0, cycles: 1, periodUnit: 'WEEK', periodNumberOfUnits: 1 },
  };

  it('keeps the store’s own price string', () => {
    expect(storeProductFrom(product)).toEqual({
      productId: 'pilatrain_quarterly',
      plan: 'quarterly',
      price: 44.99,
      priceString: 'STORE PRICE',
      currencyCode: 'USD',
      periodMonths: 3,
      trialDays: 7,
    });
  });

  it('reads the period of each plan', () => {
    expect(
      storeProductFrom({ ...product, identifier: 'pilatrain_annual', subscriptionPeriod: 'P1Y' })
        ?.periodMonths,
    ).toBe(12);
    expect(
      storeProductFrom({ ...product, identifier: 'pilatrain_monthly', subscriptionPeriod: 'P1M' })
        ?.periodMonths,
    ).toBe(1);
  });

  it('leaves out anything that is not one of our three subscriptions', () => {
    expect(storeProductFrom({ ...product, identifier: 'something_else' })).toBeNull();
    expect(storeProductFrom({ ...product, subscriptionPeriod: null })).toBeNull();
    expect(storeProductFrom({ ...product, subscriptionPeriod: 'P2W' })).toBeNull();
  });

  it('counts a trial only when the introductory offer is free', () => {
    expect(trialDaysOf(null)).toBeNull();
    expect(trialDaysOf({ price: 0, cycles: 1, periodUnit: 'DAY', periodNumberOfUnits: 7 })).toBe(7);
    expect(trialDaysOf({ price: 0, cycles: 1, periodUnit: 'WEEK', periodNumberOfUnits: 2 })).toBe(
      14,
    );
    // A discounted first month is not a free trial.
    expect(
      trialDaysOf({ price: 4.99, cycles: 1, periodUnit: 'MONTH', periodNumberOfUnits: 1 }),
    ).toBeNull();
  });
});
