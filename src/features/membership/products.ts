import { brand } from '@/config/brand';

/** The three subscriptions, in the order the paywall shows them. */
export type PlanKey = 'annual' | 'quarterly' | 'monthly';

export const PLAN_KEYS: readonly PlanKey[] = ['annual', 'quarterly', 'monthly'];

export const PRODUCT_IDS: Record<PlanKey, string> = brand.store.products;

export const planOf = (productId: string | null | undefined): PlanKey | null =>
  PLAN_KEYS.find((key) => PRODUCT_IDS[key] === productId) ?? null;

/**
 * A subscription as the store describes it.
 *
 * Every figure here comes from StoreKit, through RevenueCat. No price is ever
 * typed into the app: `priceString` is shown exactly as the store gives it,
 * and `price` exists only so the per-month figure can be worked out.
 */
export type StoreProduct = {
  productId: string;
  plan: PlanKey;
  /** The price as a number, in `currencyCode`. */
  price: number;
  /** The store's own localised price, shown as it is. */
  priceString: string;
  currencyCode: string;
  /** How many months one payment covers: 1, 3 or 12. */
  periodMonths: number;
  /** The free trial on offer, in days. `null` if the product has none. */
  trialDays: number | null;
};
