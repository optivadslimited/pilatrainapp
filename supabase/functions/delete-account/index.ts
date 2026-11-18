// Supabase Edge Function: delete-account
//
// Deletes the caller's account and everything that belongs to her, at her
// request, from inside the app (You → Delete account and data).
//
// What goes:
//   - her auth user, and with it, by foreign key, her users row, her quiz
//     answers (health answers included), plans, sessions, class progress,
//     feedback and subscription row;
//   - her rows in the webhook's event log;
//   - her customer record at RevenueCat.
//
// What does not: a subscription is Apple's to cancel. The app says so before
// she confirms. And analytics events already sent stay in PostHog under her
// random ID; TODO(owner): decide whether to erase those too, which needs a
// PostHog personal API key.
//
// The caller is identified by her own token. The service role is used only
// for the deletion itself, for that one user.
//
// NOT YET DEPLOYED OR RUN. TODO(owner): `supabase functions deploy delete-account`.
import { createClient } from '@supabase/supabase-js';

import { deleteSubscriber } from '../_shared/billing/revenuecat-api.ts';
import { cors, json } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data, error } = await asCaller.auth.getUser();
    if (error || !data.user) return json({ error: 'unauthorized' }, 401);
    const userId = data.user.id;

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });

    const events = await admin.from('billing_events').delete().eq('user_id', userId);
    if (events.error) throw events.error;

    // Everything else of hers goes with the auth user, by "on delete cascade".
    const removed = await admin.auth.admin.deleteUser(userId);
    if (removed.error) throw removed.error;

    // Best effort: her data is already gone from our database.
    await deleteSubscriber(userId, Deno.env.get('REVENUECAT_SECRET_KEY'));

    return json({ deleted: true });
  } catch (error) {
    console.error(error);
    return json({ error: 'server_error' }, 500);
  }
});
