import type { Entitlement } from '../entitlement';
import type { StoreProduct } from '../products';

/** Why a purchase did not go through. Also the `reason` sent with `purchase_failed`. */
export type PurchaseFailure =
  'offline' | 'not_allowed' | 'unavailable' | 'store_problem' | 'unknown';

export type PurchaseOutcome =
  | { status: 'purchased'; entitlement: Entitlement }
  /** She closed Apple's sheet. Nothing was charged. */
  | { status: 'cancelled' }
  /** Waiting on someone else: Ask to Buy, or a bank's approval. */
  | { status: 'pending' }
  | { status: 'failed'; reason: PurchaseFailure };

export type RestoreOutcome =
  | { status: 'restored'; entitlement: Entitlement }
  /** The restore worked and there was nothing to bring back. */
  | { status: 'nothing' }
  | { status: 'failed' };

/**
 * The store, as the app sees it. The screens talk only to this interface, so
 * the same paywall runs against RevenueCat on a phone and against the
 * preview store in development.
 */
export interface PurchasesProvider {
  readonly kind: 'revenuecat' | 'preview' | 'unavailable';

  /** Call once at launch. `userId` is her Supabase user ID, so RevenueCat and our database agree on who she is. */
  start(userId: string | null): Promise<void>;
  /** She signed in to a different account, or signed out. */
  setUser(userId: string | null): Promise<void>;

  /** The default offering's subscriptions, priced by the store. Empty if the store has none to sell. */
  products(): Promise<StoreProduct[]>;
  /** Whether she may still have each product's free trial. */
  trialEligibility(productIds: string[]): Promise<Record<string, boolean>>;

  purchase(productId: string): Promise<PurchaseOutcome>;
  restore(): Promise<RestoreOutcome>;
  entitlement(): Promise<Entitlement>;
  /** Called whenever the store reports a change: a renewal, a lapse, a refund. */
  subscribe(listener: (entitlement: Entitlement) => void): () => void;

  /** Apple's own manage-subscription sheet. */
  manage(): Promise<void>;
  /** Apple's own offer-code redemption sheet. */
  redeemCode(): Promise<void>;
  /** Lets RevenueCat pass purchases on to the attribution provider. */
  setAttributionId(id: string): void;
}
