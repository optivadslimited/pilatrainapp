import { brand } from '@/config/brand';
import { t } from '@/strings';

import { PLAN_KEYS, type PlanKey, type StoreProduct } from './products';

/**
 * Everything the paywall says about money, worked out from what the store
 * returned. The rules of an honest paywall live here, where they are tested:
 *
 *  - the full price is the store's own string, shown as it is;
 *  - the per-month figure is a sum on the store's number, and is always the
 *    smaller text;
 *  - the terms under the button name the exact price and period she will be
 *    charged, and when;
 *  - if she cannot have a free trial, nothing on the screen says "free".
 */

/** An amount in a currency, the way the device writes money. Whole amounts lose their ".00". */
export function formatMoney(amount: number, currencyCode: string, locale?: string): string {
  const plain = new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode });
  const digits = plain.resolvedOptions().maximumFractionDigits ?? 2;
  const rounded = Number(amount.toFixed(digits));
  if (!Number.isInteger(rounded)) return plain.format(rounded);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
}

/** What one month of this plan costs, as money. */
export const monthlyCost = (product: StoreProduct): number => product.price / product.periodMonths;

/**
 * How much less a month this plan costs than paying monthly, as a whole
 * percentage. Rounded down, so the claim is never larger than the truth.
 * `null` when there is no saving to speak of or the two cannot be compared.
 */
export function savingPercent(
  product: StoreProduct,
  monthly: StoreProduct | undefined,
): number | null {
  if (!monthly || monthly.productId === product.productId) return null;
  if (monthly.currencyCode !== product.currencyCode || monthly.price <= 0) return null;
  const saving = Math.floor((1 - monthlyCost(product) / monthlyCost(monthly)) * 100);
  return saving >= 1 ? saving : null;
}

/** Which plan is selected when the paywall opens. Set by the `paywall_variant` flag. */
export type PaywallVariant = 'quarterly' | 'annual';

export const DEFAULT_VARIANT: PaywallVariant = 'quarterly';

export const toVariant = (value: unknown): PaywallVariant =>
  value === 'annual' ? 'annual' : DEFAULT_VARIANT;

/** One plan card. */
export type PaywallPlan = {
  product: StoreProduct;
  name: string;
  /** The store's price, as it is. */
  price: string;
  /** "a year", "every 3 months", "a month". */
  period: string;
  /** The smaller line under the price. `null` for the monthly plan, which needs none. */
  perMonth: string | null;
  badge: { label: string; tone: 'neutral' | 'saving' } | null;
};

/** The plan cards, in order, from whatever products the store returned. */
export function paywallPlans(products: readonly StoreProduct[], locale?: string): PaywallPlan[] {
  const monthly = products.find((product) => product.plan === 'monthly');

  return PLAN_KEYS.flatMap((key) => {
    const product = products.find((item) => item.plan === key);
    if (!product) return [];

    const each = formatMoney(monthlyCost(product), product.currencyCode, locale);
    const saving = savingPercent(product, monthly);

    const perMonth =
      key === 'annual'
        ? t.paywall.perMonth.annual(each)
        : key === 'quarterly'
          ? t.paywall.perMonth.quarterly(each)
          : null;

    const badge: PaywallPlan['badge'] =
      key === 'annual' && saving !== null
        ? { label: t.paywall.badge.save(saving), tone: 'saving' }
        : key === 'quarterly'
          ? { label: t.paywall.badge.popular, tone: 'neutral' }
          : null;

    return [
      {
        product,
        name: t.paywall.planName[key],
        price: product.priceString,
        period: t.paywall.period[key],
        perMonth,
        badge,
      },
    ];
  });
}

/** The plan to pre-select: the variant's plan if the store has it, otherwise the first there is. */
export function preselected(
  plans: readonly PaywallPlan[],
  variant: PaywallVariant,
): PlanKey | null {
  return (plans.find((plan) => plan.product.plan === variant) ?? plans[0])?.product.plan ?? null;
}

/** A free trial is on offer only if the product has one and she has not had it before. */
export const offersTrial = (product: StoreProduct, eligible: boolean): boolean =>
  eligible && product.trialDays !== null && product.trialDays > 0;

/** The words that depend on whether she can have the free trial. */
export type PaywallOffer = {
  trial: boolean;
  headline: string;
  cta: string;
  /** The exact terms, shown directly under the button. */
  terms: string;
  /** The three points of the trial, or `null` when there is no trial. */
  timeline: { when: string; what: string }[] | null;
};

export function paywallOffer(plan: PaywallPlan, eligible: boolean): PaywallOffer {
  const { product } = plan;
  const days = product.trialDays ?? 0;

  if (!offersTrial(product, eligible)) {
    // Not eligible: "Subscribe", and no mention of free anywhere.
    return {
      trial: false,
      headline: t.paywall.headlineNoTrial,
      cta: t.paywall.subscribe,
      terms: t.paywall.termsNoTrial(plan.price, plan.period),
      timeline: null,
    };
  }

  return {
    trial: true,
    headline: t.paywall.headline,
    cta: t.paywall.startTrial(days),
    terms: t.paywall.terms(days, plan.price, plan.period),
    timeline: [
      { when: t.paywall.timeline.today, what: t.paywall.timeline.access },
      // The reminder goes out two days before the trial ends.
      { when: t.paywall.timeline.day(Math.max(1, days - 2)), what: t.paywall.timeline.remind },
      { when: t.paywall.timeline.day(days), what: t.paywall.timeline.ends },
    ],
  };
}

/** The three ticked lines. The instructor is the owner's to name. */
export const paywallPoints = (): string[] => [
  t.paywall.points.adapts,
  t.paywall.points.instructor(brand.instructor.name),
  t.paywall.points.cancel,
];
