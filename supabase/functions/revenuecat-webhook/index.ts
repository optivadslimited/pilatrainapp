// Supabase Edge Function: revenuecat-webhook
//
// RevenueCat calls this whenever a subscription changes: a trial starts, a
// renewal goes through, she cancels, a payment fails, a refund is given. It
// keeps one row per member in `subscriptions`, which is what the server reads
// when it decides who may watch a class (see playback-token).
//
// It also reports the four subscription events the product spec names to
// PostHog, from the server, because they happen when the app is not open:
// subscription_renewed, subscription_cancelled, subscription_expired,
// subscription_refunded.
//
// What an event means is decided in ../_shared/billing/subscription.ts, which
// is tested. This file checks who is calling, and reads and writes.
//
// Secrets (supabase secrets set …):
//   REVENUECAT_WEBHOOK_SECRET   the value typed into RevenueCat's "Authorization header" box
//   REVENUECAT_SECRET_KEY       RevenueCat secret API key, for transfers
//   POSTHOG_KEY, POSTHOG_HOST   the same project the app reports to (optional)
//
// NOT YET DEPLOYED OR RUN. TODO(owner): deploy with
// `supabase functions deploy revenuecat-webhook --no-verify-jwt` (RevenueCat
// has no Supabase token; the shared secret below is the check), then point
// RevenueCat's webhook at it and send a test event.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { fetchSubscriber } from '../_shared/billing/revenuecat-api.ts';
import { rowFromSubscriber } from '../_shared/billing/subscriber.ts';
import {
  isOurUserId,
  isStale,
  subscriptionChange,
  type BillingAnalyticsEvent,
  type RevenueCatEvent,
  type SubscriptionRow,
} from '../_shared/billing/subscription.ts';
import { json, sameSecret } from '../_shared/http.ts';

const ENTITLEMENT = 'member';
/** Postgres: the row this one points at does not exist (her account has been deleted). */
const NO_SUCH_USER = '23503';
/** Postgres: this key is already there (the event has been seen). */
const DUPLICATE = '23505';

async function save(admin: SupabaseClient, row: SubscriptionRow): Promise<void> {
  const { error } = await admin
    .from('subscriptions')
    .upsert({ ...row, updated_at: new Date().toISOString() });
  // An event for an account that has since been deleted has nowhere to go, and that is fine.
  if (error && error.code !== NO_SUCH_USER) throw error;
}

/** One server-side analytics event. It carries the product and nothing else about her. */
async function report(event: BillingAnalyticsEvent, userId: string, productId: string) {
  const key = Deno.env.get('POSTHOG_KEY');
  if (!key) return;
  const host = Deno.env.get('POSTHOG_HOST') ?? 'https://eu.i.posthog.com';
  await fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      event,
      distinct_id: userId,
      properties: { product: productId, $lib: 'revenuecat-webhook' },
    }),
  }).catch(() => {});
}

/** Purchases moved from one user to another (she restored on a new phone before signing in). */
async function transfer(admin: SupabaseClient, event: RevenueCatEvent) {
  const secret = Deno.env.get('REVENUECAT_SECRET_KEY');
  const now = new Date();
  const affected = [...(event.transferred_from ?? []), ...(event.transferred_to ?? [])];

  for (const userId of affected.filter(isOurUserId)) {
    const subscriber = await fetchSubscriber(userId, secret);
    if (!subscriber) continue;
    const row = rowFromSubscriber(subscriber, userId, ENTITLEMENT, now);
    if (row) {
      await save(admin, row);
    } else {
      // Nothing left for this user: whatever row she had no longer gives access.
      await admin
        .from('subscriptions')
        .update({ status: 'expired', will_renew: false, updated_at: now.toISOString() })
        .eq('user_id', userId);
    }
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  const given = request.headers.get('Authorization') ?? '';
  if (!expected || !(sameSecret(given, expected) || sameSecret(given, `Bearer ${expected}`))) {
    return json({ error: 'unauthorized' }, 401);
  }

  try {
    const body = (await request.json().catch(() => null)) as { event?: RevenueCatEvent } | null;
    const event = body?.event;
    if (!event?.id || !event.type) return json({ error: 'bad_request' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    // Seen before? RevenueCat retries until it gets a 200, so say yes and do nothing.
    const seen = await admin.from('billing_events').select('id').eq('id', event.id).maybeSingle();
    if (seen.data) return json({ ok: true, duplicate: true });

    let analytics: BillingAnalyticsEvent | null = null;
    let productId = event.new_product_id ?? event.product_id ?? '';

    if (event.type === 'TRANSFER') {
      await transfer(admin, event);
    } else if (isOurUserId(event.app_user_id)) {
      const current = await admin
        .from('subscriptions')
        .select('product_id, status, period_end, will_renew, last_event_at')
        .eq('user_id', event.app_user_id)
        .maybeSingle();
      if (current.error) throw current.error;

      if (!isStale(event, current.data?.last_event_at)) {
        const change = subscriptionChange(event, current.data);
        if (change.row) {
          await save(admin, change.row);
          productId = change.row.product_id;
        }
        analytics = change.analytics;
      }
    }

    // Recorded last, so an event that failed part-way is tried again in full.
    const logged = await admin.from('billing_events').insert({
      id: event.id,
      user_id: isOurUserId(event.app_user_id) ? event.app_user_id : null,
      type: event.type,
    });
    if (logged.error && logged.error.code !== DUPLICATE) throw logged.error;

    // Reported once: not if another delivery of the same event got there first.
    if (analytics && !logged.error) await report(analytics, event.app_user_id, productId);

    return json({ ok: true });
  } catch (error) {
    console.error(error);
    // A 500 makes RevenueCat try again later, which is what we want.
    return json({ error: 'server_error' }, 500);
  }
});
