/**
 * RevenueCat's own record of a customer (REST API v1, GET /v1/subscribers/{id}),
 * reduced to our `subscriptions` row.
 *
 * The webhook is how the row is normally kept current. This is the second
 * opinion, asked for in two cases where the webhook alone is not enough:
 *
 *  - a TRANSFER event, which says purchases moved to another user but not
 *    what they are;
 *  - a member who presses Play in the seconds before her purchase's webhook
 *    has arrived. Rather than refuse her, the server asks RevenueCat directly.
 *
 * NOT YET RUN AGAINST REVENUECAT. The field names follow RevenueCat's REST
 * documentation; check them against one real response.
 */
import type { SubscriptionRow } from './subscription.ts';

type RcEntitlement = {
  expires_date: string | null;
  grace_period_expires_date?: string | null;
  product_identifier: string;
};

type RcSubscription = {
  expires_date: string | null;
  period_type?: 'trial' | 'intro' | 'normal' | string;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
  grace_period_expires_date?: string | null;
  refunded_at?: string | null;
  is_sandbox?: boolean;
};

export type RcSubscriber = {
  subscriber?: {
    entitlements?: Record<string, RcEntitlement | undefined>;
    subscriptions?: Record<string, RcSubscription | undefined>;
  };
};

const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : null);

/**
 * Her row, as RevenueCat sees her now. `null` if she has never had the
 * entitlement, in which case there is nothing to write.
 */
export function rowFromSubscriber(
  response: RcSubscriber,
  userId: string,
  entitlementId: string,
  now: Date,
): SubscriptionRow | null {
  const entitlement = response.subscriber?.entitlements?.[entitlementId];
  if (!entitlement) return null;

  const productId = entitlement.product_identifier;
  const subscription = response.subscriber?.subscriptions?.[productId];

  const expires = time(entitlement.expires_date);
  const graceEnds = time(
    entitlement.grace_period_expires_date ?? subscription?.grace_period_expires_date,
  );
  const inGrace =
    Boolean(subscription?.billing_issues_detected_at) &&
    graceEnds !== null &&
    graceEnds > now.getTime();
  const current = expires === null || expires > now.getTime();
  const refunded = Boolean(subscription?.refunded_at);

  const status: SubscriptionRow['status'] = refunded
    ? 'expired'
    : inGrace
      ? 'grace'
      : !current
        ? 'expired'
        : subscription?.period_type === 'trial'
          ? 'trial'
          : 'active';

  const periodEnd = inGrace ? graceEnds : expires;

  return {
    user_id: userId,
    product_id: productId,
    status,
    period_end: periodEnd === null ? null : new Date(periodEnd).toISOString(),
    will_renew:
      status !== 'expired' &&
      !subscription?.unsubscribe_detected_at &&
      !subscription?.billing_issues_detected_at,
    last_event_at: now.toISOString(),
    environment: subscription?.is_sandbox ? 'sandbox' : 'production',
  };
}
