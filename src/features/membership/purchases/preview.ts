import { now } from '@/lib/clock';
import { storage } from '@/lib/storage';

import previewProducts from '../data/previewProducts.json';
import { NO_ENTITLEMENT, type Entitlement } from '../entitlement';
import { formatMoney } from '../pricing';
import { planOf, type StoreProduct } from '../products';
import type { PurchaseOutcome, PurchasesProvider } from './types';

/**
 * The preview store. Development builds only.
 *
 * It stands in for StoreKit where there is no StoreKit: the web preview, and
 * a development build with no RevenueCat key. Nothing is bought and no money
 * moves. Its products are read from the StoreKit test configuration
 * (storekit/Pilatrain.storekit, via `npm run storekit:build`), so even here
 * no price is typed into the app.
 *
 * You → Developer sets what it does next: whether the free trial is on offer,
 * how the next purchase ends, and which membership state she is in.
 *
 * This module is only ever loaded behind `__DEV__`, so it is left out of
 * release builds entirely.
 */
export type PreviewOutcome = 'success' | 'cancelled' | 'pending' | 'failed';

export const PREVIEW_OUTCOMES: readonly PreviewOutcome[] = [
  'success',
  'cancelled',
  'pending',
  'failed',
];

export type PreviewMembership = 'none' | 'trial' | 'trial_ending' | 'active' | 'grace' | 'lapsed';

export const PREVIEW_MEMBERSHIPS: readonly PreviewMembership[] = [
  'none',
  'trial',
  'trial_ending',
  'active',
  'grace',
  'lapsed',
];

type PreviewState = {
  entitlement: Entitlement;
  /** Whether the free trial is still on offer. Used up by taking it, as in the real store. */
  eligible: boolean;
  outcome: PreviewOutcome;
};

const KEY = 'dev.store';
const DAY_MS = 24 * 60 * 60 * 1000;
const initial: PreviewState = { entitlement: NO_ENTITLEMENT, eligible: true, outcome: 'success' };

const listeners = new Set<(entitlement: Entitlement) => void>();

function read(): PreviewState {
  try {
    const saved = storage.getString(KEY);
    return saved ? { ...initial, ...(JSON.parse(saved) as Partial<PreviewState>) } : initial;
  } catch {
    return initial;
  }
}

function write(next: PreviewState): void {
  storage.set(KEY, JSON.stringify(next));
  const current = settle(next.entitlement);
  listeners.forEach((listener) => listener(current));
}

const products = (): StoreProduct[] =>
  previewProducts.flatMap((item) => {
    const plan = planOf(item.productId);
    return plan
      ? [
          {
            productId: item.productId,
            plan,
            price: item.price,
            priceString: formatMoney(item.price, item.currencyCode),
            currencyCode: item.currencyCode,
            periodMonths: item.periodMonths,
            trialDays: item.trialDays,
          },
        ]
      : [];
  });

const periodEnd = (from: Date, months: number): string => {
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);
  return end.toISOString();
};

/** What the entitlement has become by now: a trial converts, a cancelled period runs out. */
function settle(entitlement: Entitlement): Entitlement {
  if (!entitlement.active || !entitlement.expiresAt) return entitlement;
  const end = new Date(entitlement.expiresAt);
  if (now() < end) return entitlement;
  if (!entitlement.willRenew || entitlement.billingIssueAt) {
    return { ...entitlement, active: false, willRenew: false, billingIssueAt: null };
  }
  const months =
    products().find((product) => product.productId === entitlement.productId)?.periodMonths ?? 1;
  return { ...entitlement, period: 'paid', expiresAt: periodEnd(end, months) };
}

/** Development controls. */
export const previewStore = {
  state: read,
  setEligible: (eligible: boolean) => write({ ...read(), eligible }),
  setOutcome: (outcome: PreviewOutcome) => write({ ...read(), outcome }),
  reset: () => write(initial),

  /** Puts her straight into a membership state, on the quarterly plan. */
  setMembership(kind: PreviewMembership): void {
    const state = read();
    const product = products().find((item) => item.plan === 'quarterly') ?? products()[0];
    const at = now();
    const inDays = (days: number) => new Date(at.getTime() + days * DAY_MS).toISOString();
    const base: Entitlement = {
      active: true,
      productId: product?.productId ?? null,
      period: 'paid',
      expiresAt: periodEnd(at, product?.periodMonths ?? 1),
      willRenew: true,
      billingIssueAt: null,
    };
    const entitlement: Entitlement = {
      none: NO_ENTITLEMENT,
      trial: { ...base, period: 'trial' as const, expiresAt: inDays(product?.trialDays ?? 7) },
      trial_ending: { ...base, period: 'trial' as const, expiresAt: inDays(2) },
      active: base,
      grace: { ...base, expiresAt: inDays(16), billingIssueAt: at.toISOString() },
      lapsed: { ...base, active: false, willRenew: false, expiresAt: inDays(-1) },
    }[kind];
    write({ ...state, entitlement, eligible: kind === 'none' ? state.eligible : false });
  },
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const previewProvider: PurchasesProvider = {
  kind: 'preview',

  async start() {},
  async setUser() {},

  async products() {
    return products();
  },

  async trialEligibility(productIds) {
    const { eligible } = read();
    return Object.fromEntries(productIds.map((id) => [id, eligible]));
  },

  async purchase(productId): Promise<PurchaseOutcome> {
    const state = read();
    const product = products().find((item) => item.productId === productId);
    // As long as Apple's sheet takes to appear and be confirmed.
    await pause(process.env.NODE_ENV === 'test' ? 0 : 700);

    if (!product) return { status: 'failed', reason: 'unavailable' };
    if (state.outcome === 'cancelled') return { status: 'cancelled' };
    if (state.outcome === 'pending') return { status: 'pending' };
    if (state.outcome === 'failed') return { status: 'failed', reason: 'store_problem' };

    const at = now();
    const trial = state.eligible && product.trialDays !== null;
    const entitlement: Entitlement = {
      active: true,
      productId,
      period: trial ? 'trial' : 'paid',
      expiresAt: trial
        ? new Date(at.getTime() + (product.trialDays ?? 0) * DAY_MS).toISOString()
        : periodEnd(at, product.periodMonths),
      willRenew: true,
      billingIssueAt: null,
    };
    write({ ...state, entitlement, eligible: false });
    return { status: 'purchased', entitlement };
  },

  async restore() {
    const entitlement = settle(read().entitlement);
    return entitlement.active ? { status: 'restored', entitlement } : { status: 'nothing' };
  },

  async entitlement() {
    return settle(read().entitlement);
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // Apple's sheets do not exist here. In the preview store, "manage" cancels
  // the renewal, which is the thing the real sheet is for.
  async manage() {
    const state = read();
    if (state.entitlement.active) {
      write({ ...state, entitlement: { ...state.entitlement, willRenew: false } });
    }
  },

  async redeemCode() {},
  setAttributionId() {},
};
