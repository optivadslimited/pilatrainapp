/**
 * RevenueCat webhook events, reduced to the one row we keep per member and
 * the analytics event (if any) the product spec names for it.
 *
 * This file is plain logic with no network or database in it, so the same
 * code is tested by Jest and run by the `revenuecat-webhook` function.
 *
 * NOT YET RUN AGAINST REVENUECAT. The event shapes follow RevenueCat's
 * webhook documentation; send a test event from the dashboard to confirm.
 */

/** The fields of a RevenueCat webhook event that we read. */
export type RevenueCatEvent = {
  id: string;
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  /** Where a TRANSFER event moves the purchases to and from. */
  transferred_to?: string[];
  transferred_from?: string[];
  product_id?: string;
  new_product_id?: string;
  period_type?: 'TRIAL' | 'INTRO' | 'NORMAL' | 'PROMOTIONAL' | string;
  event_timestamp_ms: number;
  expiration_at_ms?: number | null;
  grace_period_expiration_at_ms?: number | null;
  cancel_reason?: string;
  expiration_reason?: string;
  environment?: 'SANDBOX' | 'PRODUCTION' | string;
  is_trial_conversion?: boolean;
};

/**
 *   trial     in the free week
 *   active    paid and current
 *   grace     payment failed; Apple is retrying and she keeps access meanwhile
 *   expired   no access
 */
export type SubscriptionStatus = 'trial' | 'active' | 'grace' | 'expired';

export type SubscriptionRow = {
  user_id: string;
  product_id: string;
  status: SubscriptionStatus;
  period_end: string | null;
  will_renew: boolean;
  last_event_at: string;
  environment: string;
};

/** The server-side analytics events named in the product spec. Nothing else is sent. */
export type BillingAnalyticsEvent =
  | 'subscription_renewed'
  | 'subscription_cancelled'
  | 'subscription_expired'
  | 'subscription_refunded';

export type BillingChange = {
  /** The row to write, or `null` when the event changes nothing we keep. */
  row: SubscriptionRow | null;
  analytics: BillingAnalyticsEvent | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Our RevenueCat user IDs are Supabase user IDs. Anything else is not one of ours. */
export const isOurUserId = (id: string | undefined): id is string => Boolean(id && UUID.test(id));

const iso = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString() : null);

/**
 * What an event means for her row. `current` is the row as it stands, so an
 * event that carries no product (a billing issue) can keep the one she has.
 */
export function subscriptionChange(
  event: RevenueCatEvent,
  current: Pick<SubscriptionRow, 'product_id' | 'status' | 'period_end' | 'will_renew'> | null,
): BillingChange {
  const nothing: BillingChange = { row: null, analytics: null };
  if (!isOurUserId(event.app_user_id)) return nothing;

  const productId = event.new_product_id ?? event.product_id ?? current?.product_id;
  if (!productId) return nothing;

  const base = {
    user_id: event.app_user_id,
    product_id: productId,
    last_event_at: new Date(event.event_timestamp_ms).toISOString(),
    environment: event.environment === 'PRODUCTION' ? 'production' : 'sandbox',
  };
  const periodEnd = iso(event.expiration_at_ms) ?? current?.period_end ?? null;
  const inTrial = event.period_type === 'TRIAL';

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
      return {
        row: {
          ...base,
          status: inTrial ? 'trial' : 'active',
          period_end: periodEnd,
          will_renew: true,
        },
        analytics: null,
      };

    case 'RENEWAL':
      return {
        row: { ...base, status: 'active', period_end: periodEnd, will_renew: true },
        analytics: 'subscription_renewed',
      };

    case 'CANCELLATION': {
      // A refund ends access at once. Any other cancellation only stops the
      // renewal: she keeps what she has paid for until the period ends.
      const refunded = event.cancel_reason === 'CUSTOMER_SUPPORT';
      return {
        row: {
          ...base,
          status: refunded ? 'expired' : (current?.status ?? (inTrial ? 'trial' : 'active')),
          period_end: periodEnd,
          will_renew: false,
        },
        analytics: refunded ? 'subscription_refunded' : 'subscription_cancelled',
      };
    }

    case 'BILLING_ISSUE':
      return {
        row: {
          ...base,
          status: 'grace',
          // She keeps access until the grace period runs out.
          period_end: iso(event.grace_period_expiration_at_ms) ?? periodEnd,
          will_renew: current?.will_renew ?? true,
        },
        analytics: null,
      };

    case 'EXPIRATION':
      return {
        row: { ...base, status: 'expired', period_end: periodEnd, will_renew: false },
        analytics: 'subscription_expired',
      };

    default:
      // TEST, TRANSFER, SUBSCRIPTION_PAUSED (not offered on iOS) and anything new.
      return nothing;
  }
}

/** Events older than the row are late duplicates and must not undo newer ones. */
export function isStale(event: RevenueCatEvent, lastEventAt: string | null | undefined): boolean {
  if (!lastEventAt) return false;
  return event.event_timestamp_ms < new Date(lastEventAt).getTime();
}

/** Whether a stored row gives access right now. */
export function hasAccess(
  row: Pick<SubscriptionRow, 'status' | 'period_end'> | null | undefined,
  now: Date,
): boolean {
  if (!row || row.status === 'expired') return false;
  // An hour's tolerance for a renewal webhook that is still on its way.
  if (row.period_end && new Date(row.period_end).getTime() + 60 * 60 * 1000 < now.getTime())
    return false;
  return true;
}
