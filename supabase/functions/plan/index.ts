// Supabase Edge Function: plan
//
// The home of the plan engine. The app calls it with the user's own token:
//
//   { "action": "build" }                              build her first plan from her quiz answers
//   { "action": "current" }                            her plan as it stands today (rules 9 and 10)
//   { "action": "move", "sessionId": "…", "to": "YYYY-MM-DD" }
//   { "action": "complete", "sessionId": "…" }
//   { "action": "rate", "sessionId": "…", "rating": "easy" | "right" | "hard" }   also answers { "effect": … }
//   { "action": "adjust", "weekdays": [1, 3, 5], "minutes": 20 }       re-plan the days ahead
//
// Every action answers { "plan": … }. "Today" is worked out here from the
// timezone on her users row, never taken from the phone.
//
// The function runs as the caller, with her token, so row-level security
// applies to everything it reads and writes. It never uses the service role.
//
// NOT YET DEPLOYED OR RUN. This file is type-checked by Deno, not by the app's
// TypeScript, and needs a Supabase project to run. Everything it calls in
// ../_shared is tested. TODO(owner): supply a Supabase project, then
// `supabase functions deploy plan`.
import { createClient } from '@supabase/supabase-js';

import {
  NoEligibleClassesError,
  PlanInputError,
  RATINGS,
  todayIn,
} from '../_shared/engine/index.ts';
import { createPlanService, PlanServiceError } from '../_shared/plan-service.ts';
import { supabasePlanStore } from '../_shared/supabase-store.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: authorization } },
      },
    );
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return json({ error: 'unauthorized' }, 401);
    const userId = data.user.id;

    const body = await request.json().catch(() => ({}));
    const store = supabasePlanStore(supabase);
    const service = createPlanService(store);
    const today = todayIn(await store.getTimezone(userId));

    switch (body.action) {
      case 'build':
        return json({ plan: await service.build(userId, today) });
      case 'current':
        return json({ plan: await service.current(userId, today) });
      case 'move':
        return json({
          plan: await service.move(userId, String(body.sessionId), String(body.to), today),
        });
      case 'complete':
        return json({
          plan: await service.complete(
            userId,
            String(body.sessionId),
            today,
            new Date().toISOString(),
          ),
        });
      case 'rate': {
        if (!RATINGS.includes(body.rating)) return json({ error: 'invalid_input' }, 400);
        const now = new Date().toISOString();
        return json(await service.rate(userId, String(body.sessionId), body.rating, today, now));
      }
      case 'adjust':
        return json({
          plan: await service.adjust(
            userId,
            { weekdays: body.weekdays, minutes: body.minutes },
            today,
          ),
        });
      default:
        return json({ error: 'unknown_action' }, 400);
    }
  } catch (error) {
    if (error instanceof PlanServiceError) return json({ error: error.code }, 409);
    if (error instanceof PlanInputError)
      return json({ error: 'invalid_input', message: error.message }, 400);
    if (error instanceof NoEligibleClassesError) return json({ error: 'no_eligible_classes' }, 422);
    // Never send internals to the client. Details go to the function's log.
    console.error(error);
    return json({ error: 'internal' }, 500);
  }
});
