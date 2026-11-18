import { execFileSync } from 'child_process';
import path from 'path';

import { en } from '@/strings/en';

import {
  formatMoney,
  offersTrial,
  paywallOffer,
  paywallPlans,
  paywallPoints,
  preselected,
  savingPercent,
  toVariant,
} from '../pricing';
import { product, usProducts } from './fixtures';

const plans = paywallPlans(usProducts, 'en-US');
const plan = (key: string) => plans.find((item) => item.product.plan === key)!;

describe('the StoreKit configuration', () => {
  it('matches the product list the preview store reads', () => {
    const root = path.join(__dirname, '..', '..', '..', '..');
    expect(() =>
      execFileSync('npx', ['tsx', 'scripts/build-storekit.ts', '--check'], {
        cwd: root,
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  it('has the three products, each with a 7-day free trial', () => {
    expect(usProducts.map((item) => item.productId)).toEqual([
      'pilatrain_annual',
      'pilatrain_quarterly',
      'pilatrain_monthly',
    ]);
    expect(usProducts.map((item) => item.trialDays)).toEqual([7, 7, 7]);
    expect(usProducts.map((item) => item.periodMonths)).toEqual([12, 3, 1]);
  });
});

describe('money', () => {
  it('writes amounts the way the locale does, and drops ".00"', () => {
    expect(formatMoney(89.99, 'USD', 'en-US')).toBe('$89.99');
    expect(formatMoney(15, 'USD', 'en-US')).toBe('$15');
    expect(formatMoney(14.9967, 'USD', 'en-US')).toBe('$15');
    expect(formatMoney(7.4992, 'USD', 'en-US')).toBe('$7.50');
    expect(formatMoney(7.5, 'GBP', 'en-GB')).toBe('£7.50');
    // A currency with no minor unit.
    expect(formatMoney(1500, 'JPY', 'en-US')).toBe('¥1,500');
  });
});

describe('plan cards', () => {
  it('shows them in order: yearly, quarterly, monthly', () => {
    expect(plans.map((item) => item.name)).toEqual(['Yearly', 'Quarterly', 'Monthly']);
  });

  it('shows the full price exactly as the store gives it', () => {
    for (const item of plans) expect(item.price).toBe(item.product.priceString);
    expect(`${plan('annual').price} ${plan('annual').period}`).toBe('$89.99 a year');
    expect(`${plan('quarterly').price} ${plan('quarterly').period}`).toBe('$44.99 every 3 months');
    expect(`${plan('monthly').price} ${plan('monthly').period}`).toBe('$17.99 a month');
  });

  it('works out the smaller per-month line from the store’s price', () => {
    expect(plan('annual').perMonth).toBe('$7.50 a month, billed yearly');
    expect(plan('quarterly').perMonth).toBe('$15 a month, billed every 3 months');
    // The monthly card already says it: no second line.
    expect(plan('monthly').perMonth).toBeNull();
  });

  it('badges yearly with its saving and quarterly as most popular', () => {
    expect(plan('annual').badge).toEqual({ label: 'Save 58%', tone: 'saving' });
    expect(plan('quarterly').badge).toEqual({ label: 'Most popular', tone: 'neutral' });
    expect(plan('monthly').badge).toBeNull();
  });

  it('rounds a saving down, never up', () => {
    const monthly = { ...product('monthly'), price: 10 };
    // 12 months for 50.10 is 4.175 a month: a 58.25% saving.
    expect(savingPercent({ ...product('annual'), price: 50.1 }, monthly)).toBe(58);
    // 59.99% is still 59.
    expect(savingPercent({ ...product('annual'), price: 48.012 }, monthly)).toBe(59);
  });

  it('claims no saving it cannot stand behind', () => {
    const monthly = product('monthly');
    expect(savingPercent(monthly, monthly)).toBeNull();
    expect(savingPercent(product('annual'), undefined)).toBeNull();
    expect(savingPercent({ ...product('annual'), currencyCode: 'EUR' }, monthly)).toBeNull();
    // Dearer per month than monthly: nothing to badge.
    expect(savingPercent({ ...product('annual'), price: 400 }, monthly)).toBeNull();
    const dear = paywallPlans([{ ...product('annual'), price: 400 }, monthly], 'en-US');
    expect(dear[0].badge).toBeNull();
  });

  it('shows only the plans the store returned', () => {
    expect(paywallPlans([product('monthly')], 'en-US').map((item) => item.name)).toEqual([
      'Monthly',
    ]);
    expect(paywallPlans([], 'en-US')).toEqual([]);
  });

  it('follows the store into another currency', () => {
    const uk = usProducts.map((item) => ({
      ...item,
      currencyCode: 'GBP',
      priceString: formatMoney(item.price, 'GBP', 'en-GB'),
    }));
    const cards = paywallPlans(uk, 'en-GB');
    expect(cards[1].price).toBe('£44.99');
    expect(cards[1].perMonth).toBe('£15 a month, billed every 3 months');
  });
});

describe('the pre-selected plan', () => {
  it('is quarterly unless the flag says annual', () => {
    expect(toVariant(undefined)).toBe('quarterly');
    expect(toVariant('quarterly')).toBe('quarterly');
    expect(toVariant('annual')).toBe('annual');
    expect(toVariant(true)).toBe('quarterly');
    expect(toVariant('something-else')).toBe('quarterly');
    expect(preselected(plans, 'quarterly')).toBe('quarterly');
    expect(preselected(plans, 'annual')).toBe('annual');
  });

  it('falls back to a plan that exists', () => {
    expect(preselected(paywallPlans([product('monthly')], 'en-US'), 'quarterly')).toBe('monthly');
    expect(preselected([], 'quarterly')).toBeNull();
  });
});

describe('the offer, with a free trial', () => {
  const offer = paywallOffer(plan('quarterly'), true);

  it('says exactly what the brief says', () => {
    expect(offer.headline).toBe('Your plan is ready. Start your free week.');
    expect(offer.cta).toBe('Start 7-day free trial');
    expect(offer.terms).toBe(
      '7 days free, then $44.99 every 3 months. Cancel any time in Settings at least 24 hours before renewal.',
    );
    expect(offer.timeline?.map((point) => `${point.when}: ${point.what}`).join(' · ')).toBe(
      'Today: full access · Day 5: we remind you · Day 7: trial ends',
    );
  });

  it('names the selected plan’s own price and period in the terms', () => {
    expect(paywallOffer(plan('annual'), true).terms).toContain('then $89.99 a year.');
    expect(paywallOffer(plan('monthly'), true).terms).toContain('then $17.99 a month.');
  });

  it('lists the three points', () => {
    expect(paywallPoints()).toEqual([
      'A plan that adapts to your week',
      'Every class led by [NAME], certified',
      'Cancel any time in two taps',
    ]);
  });
});

describe('the offer, with no free trial', () => {
  const offer = paywallOffer(plan('quarterly'), false);

  it('says Subscribe and never mentions free', () => {
    expect(offer.trial).toBe(false);
    expect(offer.cta).toBe('Subscribe');
    expect(offer.timeline).toBeNull();
    expect(offer.terms).toBe(
      '$44.99 every 3 months, renewing until you cancel. Cancel any time in Settings at least 24 hours before renewal.',
    );
    for (const text of [offer.headline, offer.cta, offer.terms]) {
      expect(text).not.toMatch(/free|trial/i);
    }
  });

  it('treats a product with no trial the same way, even if she is eligible', () => {
    const noTrial = paywallPlans([{ ...product('quarterly'), trialDays: null }], 'en-US')[0];
    expect(offersTrial(noTrial.product, true)).toBe(false);
    expect(paywallOffer(noTrial, true).cta).toBe('Subscribe');
  });
});

describe('prices are never typed into the app', () => {
  it('keeps every paywall string free of amounts', () => {
    const texts = JSON.stringify(en.paywall, (_key, value) =>
      typeof value === 'function' ? value('PRICE', 'PRICE', 'PRICE') : value,
    );
    expect(texts).not.toMatch(/[$£€]\s?\d|\d+\.\d{2}/);
  });
});
