// Supabase Edge Function: playback-token
//
// The check that counts. Member classes are served with signed Mux playback:
// the video address only works with a short-lived token, and this function is
// the only thing that can make one. It hands a token out only if she may
// watch the class:
//
//   a member may watch every class;
//   anyone may watch a class marked free;
//   anyone may take the first session of her first plan, until it is done.
//
// The rule itself is ../_shared/billing/access.ts, the same file the app uses
// to decide what to show as locked. The app's copy is for display. This one
// is the lock.
//
//   request   { "classId": "…" }
//   answer    { "playbackId": "…", "token": "…", "expiresAt": "…" }
//             { "playbackId": null }          the class has no video of its own yet
//             403 { "error": "membership_required" }
//
// Secrets: MUX_SIGNING_KEY_ID, MUX_SIGNING_PRIVATE_KEY, REVENUECAT_SECRET_KEY.
//
// NOT YET DEPLOYED OR RUN. TODO(owner): supply the Mux signing key, set each
// member class's playback policy to "signed", then
// `supabase functions deploy playback-token`.
import { createClient } from '@supabase/supabase-js';

import { canWatchClass, type AccessPlan } from '../_shared/billing/access.ts';
import { signPlaybackToken } from '../_shared/billing/mux.ts';
import { fetchSubscriber } from '../_shared/billing/revenuecat-api.ts';
import { rowFromSubscriber } from '../_shared/billing/subscriber.ts';
import { hasAccess } from '../_shared/billing/subscription.ts';
import { cors, json } from '../_shared/http.ts';

const ENTITLEMENT = 'member';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  try {
    // As her, so row-level security applies to everything read here.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: authorization } },
      },
    );
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return json({ error: 'unauthorized' }, 401);
    const userId = auth.user.id;

    const body = await request.json().catch(() => ({}));
    const classId = String(body.classId ?? '');

    const cls = await supabase
      .from('classes')
      .select('id, is_free, mux_playback_id')
      .eq('id', classId)
      .eq('published', true)
      .maybeSingle();
    if (cls.error) throw cls.error;
    if (!cls.data) return json({ error: 'not_found' }, 404);
    if (!cls.data.mux_playback_id) return json({ playbackId: null });

    const now = new Date();
    const subscription = await supabase
      .from('subscriptions')
      .select('status, period_end')
      .eq('user_id', userId)
      .maybeSingle();
    if (subscription.error) throw subscription.error;
    let isMember = hasAccess(subscription.data, now);

    let allowed = isMember || cls.data.is_free;

    if (!allowed) {
      // Her free first session, if she still has it.
      const plan = await supabase
        .from('plans')
        .select('block, plan_sessions (id, scheduled_date, class_id, paired_class_id, status)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();
      if (plan.error) throw plan.error;

      const access: AccessPlan | null = plan.data
        ? {
            block: plan.data.block,
            sessions: (plan.data.plan_sessions ?? []).map(
              (session: {
                id: string;
                scheduled_date: string;
                class_id: string;
                paired_class_id: string | null;
                status: string;
              }) => ({
                id: session.id,
                date: session.scheduled_date,
                // A 30-minute session may pair two classes; both are part of it.
                classIds: [session.class_id, session.paired_class_id].filter((id): id is string =>
                  Boolean(id),
                ),
                status: session.status,
              }),
            ),
          }
        : null;
      allowed = canWatchClass(false, { id: cls.data.id, isFree: false }, access);
    }

    if (!allowed) {
      // She may have subscribed seconds ago, before the webhook has told us.
      // Ask RevenueCat directly, and bring her row up to date if it says yes.
      const subscriber = await fetchSubscriber(userId, Deno.env.get('REVENUECAT_SECRET_KEY'));
      const row = subscriber ? rowFromSubscriber(subscriber, userId, ENTITLEMENT, now) : null;
      isMember = hasAccess(row, now);
      if (row && isMember) {
        const admin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          { auth: { persistSession: false } },
        );
        await admin.from('subscriptions').upsert({ ...row, updated_at: now.toISOString() });
      }
      allowed = isMember;
    }

    if (!allowed) return json({ error: 'membership_required' }, 403);

    const keyId = Deno.env.get('MUX_SIGNING_KEY_ID');
    const privateKey = Deno.env.get('MUX_SIGNING_PRIVATE_KEY');
    if (!keyId || !privateKey) return json({ error: 'not_configured' }, 500);

    const { token, expiresAt } = await signPlaybackToken({
      playbackId: cls.data.mux_playback_id,
      keyId,
      privateKey,
      now,
    });
    return json({ playbackId: cls.data.mux_playback_id, token, expiresAt });
  } catch (error) {
    console.error(error);
    return json({ error: 'server_error' }, 500);
  }
});
