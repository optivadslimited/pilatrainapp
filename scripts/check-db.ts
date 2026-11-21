/**
 * Runs the migrations and the seed against a real Postgres (PGlite, in
 * process, no Docker) and checks that row-level security does what the data
 * model promises: each user reads and writes only her own rows, and class
 * details are readable by everyone.
 *
 *   npm run db:check
 *
 * The `auth` schema and the three Supabase roles are stood in for below; on
 * Supabase they already exist.
 */
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = join(root, 'supabase/migrations');

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const SUPABASE_STAND_IN = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, is_anonymous boolean not null default false);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role supabase_auth_admin nologin;
  grant usage on schema auth to supabase_auth_admin;
  grant insert on auth.users to supabase_auth_admin;
  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to service_role;
`;

type Role = 'anon' | 'authenticated' | 'service_role';
type Tx = {
  query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[]; affectedRows?: number }>;
};

let passed = 0;
const failures: string[] = [];

async function main() {
  const db = new PGlite();
  await db.exec(SUPABASE_STAND_IN);

  const migrations = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  for (const name of migrations) await db.exec(readFileSync(join(MIGRATIONS, name), 'utf8'));
  await db.exec(readFileSync(join(root, 'supabase/seed.sql'), 'utf8'));
  // The seed is written to be run again safely.
  await db.exec(readFileSync(join(root, 'supabase/seed.sql'), 'utf8'));

  /** Run `work` as a Supabase role, as PostgREST would, then undo it. */
  async function as<T>(
    role: Role,
    userId: string | null,
    work: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    let result: T | undefined;
    let thrown: unknown;
    await db
      .transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
        await tx.exec(`set local role ${role}`);
        try {
          result = await work(tx as unknown as Tx);
        } catch (error) {
          thrown = error;
        }
        await tx.rollback();
      })
      .catch(() => {});
    if (thrown) throw thrown;
    return result as T;
  }

  /** As above, but keeps the changes. */
  async function commitAs(role: Role, userId: string | null, sql: string, params: unknown[] = []) {
    await db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
      await tx.exec(`set local role ${role}`);
      await tx.query(sql, params);
    });
  }

  async function check(name: string, test: () => Promise<void>) {
    try {
      await test();
      passed++;
    } catch (error) {
      failures.push(`${name}\n      ${(error as Error).message}`);
    }
  }

  const equal = (actual: unknown, expected: unknown, what: string) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      );
    }
  };

  const count = async (tx: Tx, table: string) =>
    Number((await tx.query<{ n: number }>(`select count(*)::int as n from ${table}`)).rows[0].n);

  /** The statement must fail, with a message matching `pattern`. */
  async function refuses(
    role: Role,
    userId: string | null,
    sql: string,
    pattern: RegExp,
    params: unknown[] = [],
  ) {
    try {
      await as(role, userId, (tx) => tx.query(sql, params));
    } catch (error) {
      if (!pattern.test((error as Error).message)) {
        throw new Error(`refused, but with "${(error as Error).message}" rather than ${pattern}`);
      }
      return;
    }
    throw new Error(`was allowed: ${sql}`);
  }

  const ANSWERS = `(user_id, goal, level, minutes, days, time_of_day, equipment, work_around, gentle, disclaimer_accepted_at)
    values ($1, 'posture', 1, 20, array[1,3,5]::smallint[], 'morning', array['mat'], array['pregnant_postpartum'], true, now())`;

  // --- Schema and seed -------------------------------------------------------
  await check(
    'the seed loads sixteen classes and one instructor, and can be run twice',
    async () => {
      equal(
        (await db.query<{ n: number }>('select count(*)::int as n from public.classes')).rows[0].n,
        16,
        'classes',
      );
      equal(
        (await db.query<{ n: number }>('select count(*)::int as n from public.instructors')).rows[0]
          .n,
        1,
        'instructors',
      );
    },
  );

  await check('every table has row-level security switched on', async () => {
    const { rows } = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    equal(rows, [], 'tables without RLS');
  });

  await check('a new auth user gets a users row, anonymous or not', async () => {
    await db.query(`insert into auth.users (id, is_anonymous) values ($1, true), ($2, false)`, [
      A,
      B,
    ]);
    equal(
      (await db.query<{ n: number }>('select count(*)::int as n from public.users')).rows[0].n,
      2,
      'users',
    );
  });

  await check('the sign-in service adds users, but nobody can call the trigger function', async () => {
    const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    let made = 0;
    await db
      .transaction(async (tx) => {
        // As Supabase's sign-in service, which has no right to call the function itself.
        await tx.exec('set local role supabase_auth_admin');
        await tx.query('insert into auth.users (id, is_anonymous) values ($1, true)', [C]);
        await tx.exec('reset role');
        made = Number(
          (
            await tx.query<{ n: number }>(
              'select count(*)::int as n from public.users where id = $1',
              [C],
            )
          ).rows[0].n,
        );
        await tx.rollback();
      })
      .catch(() => {});
    equal(made, 1, 'users row made by the trigger');
    const { rows } = await db.query<{ allowed: boolean }>(
      `select has_function_privilege(r, 'public.handle_new_user()', 'execute') as allowed
       from unnest(array['anon', 'authenticated', 'supabase_auth_admin']) as r`,
    );
    equal(
      rows.map((row) => row.allowed),
      [false, false, false],
      'who may call handle_new_user()',
    );
  });

  // --- Class details are readable by everyone --------------------------------
  await check('anyone can read published classes, signed in or not', async () => {
    equal(await as('anon', null, (tx) => count(tx, 'public.classes')), 16, 'anon');
    equal(await as('authenticated', A, (tx) => count(tx, 'public.classes')), 16, 'authenticated');
    equal(await as('anon', null, (tx) => count(tx, 'public.instructors')), 1, 'instructors');
  });

  await check('unpublished classes are hidden', async () => {
    await db.query(`update public.classes set published = false where slug = 'quick-energiser'`);
    equal(await as('anon', null, (tx) => count(tx, 'public.classes')), 15, 'anon');
    equal(await as('authenticated', A, (tx) => count(tx, 'public.classes')), 15, 'authenticated');
    await db.query(`update public.classes set published = true where slug = 'quick-energiser'`);
  });

  await check('nobody but the service role can change a class', async () => {
    await refuses('authenticated', A, `update public.classes set title = 'x'`, /permission denied/);
    await refuses('anon', null, `delete from public.classes`, /permission denied/);
  });

  // --- Her own rows, and only hers -------------------------------------------
  await check('a user saves and reads her own quiz answers', async () => {
    await commitAs('authenticated', A, `insert into public.quiz_answers ${ANSWERS}`, [A]);
    equal(await as('authenticated', A, (tx) => count(tx, 'public.quiz_answers')), 1, 'own answers');
  });

  await check('HEALTH DATA: no other user can read her answers', async () => {
    equal(
      await as('authenticated', B, (tx) => count(tx, 'public.quiz_answers')),
      0,
      'as another user',
    );
  });

  await check(
    'HEALTH DATA: someone who is not signed in cannot touch quiz answers at all',
    async () => {
      await refuses('anon', null, `select * from public.quiz_answers`, /permission denied/);
    },
  );

  await check('a user cannot save answers in someone else’s name', async () => {
    await refuses(
      'authenticated',
      B,
      `insert into public.quiz_answers ${ANSWERS}`,
      /row-level security/,
      [A],
    );
  });

  await check('a user cannot change someone else’s answers', async () => {
    const changed = await as('authenticated', B, async (tx) => {
      const result = await tx.query(`update public.quiz_answers set goal = 'tone'`);
      return result.affectedRows;
    });
    equal(changed, 0, 'rows changed');
  });

  await check('a user reads and updates only her own users row', async () => {
    equal(await as('authenticated', A, (tx) => count(tx, 'public.users')), 1, 'visible rows');
    const changed = await as('authenticated', B, async (tx) => {
      const result = await tx.query(`update public.users set first_name = 'x' where id = $1`, [A]);
      return result.affectedRows;
    });
    equal(changed, 0, 'rows changed in another user’s row');
    await refuses('anon', null, `select * from public.users`, /permission denied/);
  });

  // --- Plans and sessions ----------------------------------------------------
  const PLAN = '99999999-9999-4999-8999-999999999999';
  const startHere = (
    await db.query<{ id: string }>(`select id from public.classes where slug = 'start-here'`)
  ).rows[0].id;
  const SESSION = `(plan_id, class_id, scheduled_date, original_date, week, status)`;

  await check('a user creates her own plan and its sessions', async () => {
    await commitAs(
      'authenticated',
      A,
      `insert into public.plans (id, user_id, start_date, end_date, profile)
       values ($1, $2, '2026-11-02', '2026-11-29', '{"goal":"posture","workAround":["pregnant_postpartum"]}')`,
      [PLAN, A],
    );
    await commitAs(
      'authenticated',
      A,
      `insert into public.plan_sessions ${SESSION} values ($1, $2, '2026-11-02', '2026-11-02', 1, 'planned')`,
      [PLAN, startHere],
    );
    equal(
      await as('authenticated', A, (tx) => count(tx, 'public.plan_sessions')),
      1,
      'own sessions',
    );
  });

  await check(
    'HEALTH DATA: no other user can read her plan, which holds a copy of her answers',
    async () => {
      equal(await as('authenticated', B, (tx) => count(tx, 'public.plans')), 0, 'plans');
      equal(await as('authenticated', B, (tx) => count(tx, 'public.plan_sessions')), 0, 'sessions');
      await refuses('anon', null, `select * from public.plans`, /permission denied/);
    },
  );

  await check('a user cannot add sessions to, or change, someone else’s plan', async () => {
    await refuses(
      'authenticated',
      B,
      `insert into public.plan_sessions ${SESSION} values ($1, $2, '2026-11-04', '2026-11-04', 1, 'planned')`,
      /row-level security/,
      [PLAN, startHere],
    );
    const changed = await as('authenticated', B, async (tx) => {
      const sessions = await tx.query(`update public.plan_sessions set status = 'dropped'`);
      const plans = await tx.query(`update public.plans set status = 'completed'`);
      return [sessions.affectedRows, plans.affectedRows];
    });
    equal(changed, [0, 0], 'rows changed');
  });

  await check('a user cannot create a plan in someone else’s name', async () => {
    await refuses(
      'authenticated',
      B,
      `insert into public.plans (user_id, start_date, end_date, profile) values ($1, '2026-11-02', '2026-11-29', '{}')`,
      /row-level security/,
      [A],
    );
  });

  await check('never two sessions on one day; a dropped session leaves its day free', async () => {
    await refuses(
      'authenticated',
      A,
      `insert into public.plan_sessions ${SESSION} values ($1, $2, '2026-11-02', '2026-11-02', 1, 'planned')`,
      /plan_sessions_one_per_day/,
      [PLAN, startHere],
    );
    await as('authenticated', A, (tx) =>
      tx.query(
        `insert into public.plan_sessions ${SESSION} values ($1, $2, '2026-11-02', '2026-11-02', 1, 'dropped')`,
        [PLAN, startHere],
      ),
    );
  });

  await check('one live plan each', async () => {
    await refuses(
      'authenticated',
      A,
      `insert into public.plans (user_id, start_date, end_date, profile) values ($1, '2026-11-30', '2026-12-27', '{}')`,
      /plans_one_active_per_user/,
      [A],
    );
  });

  await check(
    'save_plan closes the live plan and stores the new one with its sessions, all or nothing',
    async () => {
      const plan = {
        start_date: '2026-11-30',
        end_date: '2026-12-27',
        block: 2,
        profile: { goal: 'posture' },
      };
      const sessions = [
        { class_id: startHere, paired_class_id: null, scheduled_date: '2026-11-30', week: 1 },
        { class_id: startHere, paired_class_id: startHere, scheduled_date: '2026-12-02', week: 1 },
      ];
      const saved = await as('authenticated', A, async (tx) => {
        const { rows } = await tx.query<{ id: string }>(`select public.save_plan($1, $2) as id`, [
          plan,
          sessions,
        ]);
        const live = await tx.query<{ id: string; block: number }>(
          `select id, block from public.plans where status = 'active'`,
        );
        const stored = await tx.query<{ n: number }>(
          `select count(*)::int as n from public.plan_sessions where plan_id = $1`,
          [rows[0].id],
        );
        return {
          live: live.rows.length,
          block: live.rows[0].block,
          sessions: stored.rows[0].n,
          all: await count(tx, 'public.plans'),
        };
      });
      equal(saved, { live: 1, block: 2, sessions: 2, all: 2 }, 'after saving');

      // A bad session undoes the whole save: the old plan is still the live one.
      const broken = [
        { class_id: startHere, paired_class_id: null, scheduled_date: '2026-11-30', week: 9 },
      ];
      await refuses('authenticated', A, `select public.save_plan($1, $2)`, /check constraint/, [
        plan,
        broken,
      ]);
      equal(
        (
          await db.query<{ block: number }>(
            `select block from public.plans where status = 'active'`,
          )
        ).rows,
        [{ block: 1 }],
        'live plan after a failed save',
      );
    },
  );

  await check(
    'save_plan only ever writes the caller’s own plan, and needs a signed-in user',
    async () => {
      const plan = { start_date: '2026-11-30', end_date: '2026-12-27', block: 1, profile: {} };
      const owner = await as('authenticated', B, async (tx) => {
        await tx.query(`select public.save_plan($1, '[]'::jsonb)`, [plan]);
        return (await tx.query<{ user_id: string }>(`select user_id from public.plans`)).rows;
      });
      equal(owner, [{ user_id: B }], 'owner of the saved plan');
      await refuses('anon', null, `select public.save_plan($1, '[]'::jsonb)`, /permission denied/, [
        plan,
      ]);
    },
  );

  await check('every class has its three "What you will do" lines', async () => {
    const { rows } = await db.query<{ n: number }>(
      'select count(*)::int as n from public.classes where cardinality(highlights) <> 3',
    );
    equal(rows[0].n, 0, 'classes without three highlights');
  });

  const firstSession = async () =>
    (
      await db.query<{ id: string }>(`select id from public.plan_sessions where plan_id = $1`, [
        PLAN,
      ])
    ).rows[0].id;

  await check(
    'a user can remove a session still to do from her own plan, and only that',
    async () => {
      const mine = await firstSession();
      const removed = await as('authenticated', A, async (tx) => {
        const result = await tx.query(`delete from public.plan_sessions where id = $1`, [mine]);
        return result.affectedRows;
      });
      equal(removed, 1, 'her own planned session');

      // Someone else cannot.
      const byOther = await as('authenticated', B, async (tx) => {
        const result = await tx.query(`delete from public.plan_sessions where id = $1`, [mine]);
        return result.affectedRows;
      });
      equal(byOther, 0, 'removed by another user');

      // And a session that is done stays, whoever asks.
      const done = await as('authenticated', A, async (tx) => {
        await tx.query(`update public.plan_sessions set status = 'done' where id = $1`, [mine]);
        const result = await tx.query(`delete from public.plan_sessions where id = $1`, [mine]);
        return result.affectedRows;
      });
      equal(done, 0, 'a done session removed');
    },
  );

  await check('replace_sessions swaps sessions and updates the plan, all or nothing', async () => {
    const mine = await firstSession();
    const fresh = [
      { class_id: startHere, paired_class_id: null, scheduled_date: '2026-11-09', week: 2 },
      { class_id: startHere, paired_class_id: startHere, scheduled_date: '2026-11-11', week: 2 },
    ];
    const call = `select public.replace_sessions($1, $2, $3, $4, $5)`;
    const profile = { goal: 'posture', intensityShift: -1 };

    const after = await as('authenticated', A, async (tx) => {
      await tx.query(call, [PLAN, [mine], fresh, profile, '2026-11-06T08:00:00Z']);
      const sessions = await tx.query<{ day: string }>(
        `select scheduled_date::text as day from public.plan_sessions where plan_id = $1 order by 1`,
        [PLAN],
      );
      const plan = await tx.query<{ shift: number; adjusted: boolean }>(
        `select (profile ->> 'intensityShift')::int as shift, adjusted_at is not null as adjusted
         from public.plans where id = $1`,
        [PLAN],
      );
      return { dates: sessions.rows.map((row) => row.day), ...plan.rows[0] };
    });
    equal(
      after,
      { dates: ['2026-11-09', '2026-11-11'], shift: -1, adjusted: true },
      'after replacing',
    );

    // Nulls leave the profile and the timestamp as they were.
    const untouched = await as('authenticated', A, async (tx) => {
      await tx.query(call, [PLAN, [], [], null, null]);
      const plan = await tx.query<{ goal: string }>(
        `select profile ->> 'goal' as goal from public.plans where id = $1`,
        [PLAN],
      );
      return plan.rows[0].goal;
    });
    equal(untouched, 'posture', 'profile after a null update');

    // A bad new session undoes the removal too.
    const broken = [
      { class_id: startHere, paired_class_id: null, scheduled_date: '2026-11-09', week: 9 },
    ];
    await refuses('authenticated', A, call, /check constraint/, [PLAN, [mine], broken, null, null]);
    equal(
      (
        await db.query<{ n: number }>(
          `select count(*)::int as n from public.plan_sessions where id = $1`,
          [mine],
        )
      ).rows[0].n,
      1,
      'the session it tried to remove',
    );
  });

  await check(
    'replace_sessions never removes a done session, and never touches another user’s plan',
    async () => {
      const mine = await firstSession();
      const call = `select public.replace_sessions($1, $2, '[]'::jsonb, null, null)`;
      const kept = await as('authenticated', A, async (tx) => {
        await tx.query(`update public.plan_sessions set status = 'done' where id = $1`, [mine]);
        await tx.query(call, [PLAN, [mine]]);
        return count(tx, 'public.plan_sessions');
      });
      equal(kept, 1, 'sessions after trying to remove a done one');

      await refuses('authenticated', B, call, /No such plan/, [PLAN, [mine]]);
      await refuses('anon', null, call, /permission denied/, [PLAN, [mine]]);
    },
  );

  await check(
    'a user cannot delete plans directly; account deletion goes through the function',
    async () => {
      await refuses('authenticated', A, `delete from public.plans`, /permission denied/);
    },
  );

  // --- Feedback and progress -------------------------------------------------
  await check('a user rates her own session, and nobody else’s', async () => {
    const { rows } = await db.query<{ id: string }>(`select id from public.plan_sessions limit 1`);
    const rate = `insert into public.feedback (user_id, plan_session_id, rating) values ($1, $2, 'right')`;
    await as('authenticated', A, (tx) => tx.query(rate, [A, rows[0].id]));
    await refuses('authenticated', B, rate, /row-level security/, [B, rows[0].id]);
    await refuses('authenticated', B, rate, /row-level security/, [A, rows[0].id]);
  });

  await check('a user saves her own class progress, and nobody else’s', async () => {
    const save = `insert into public.class_progress (user_id, class_id, position_sec, percent) values ($1, $2, 30, 5)`;
    await as('authenticated', A, (tx) => tx.query(save, [A, startHere]));
    await refuses('authenticated', B, save, /row-level security/, [A, startHere]);
  });

  // --- Membership ------------------------------------------------------------
  await check(
    'membership is written by the service role only, and read by its owner only',
    async () => {
      const write = `insert into public.subscriptions (user_id, product_id, status) values ($1, 'pilatrain_quarterly', 'trial')`;
      await refuses('authenticated', A, write, /permission denied/, [A]);
      await commitAs('service_role', null, write, [A]);
      equal(await as('authenticated', A, (tx) => count(tx, 'public.subscriptions')), 1, 'own');
      equal(
        await as('authenticated', B, (tx) => count(tx, 'public.subscriptions')),
        0,
        'another user',
      );
      await refuses(
        'authenticated',
        A,
        `update public.subscriptions set status = 'active'`,
        /permission denied/,
      );
    },
  );

  await check('a membership has one of four statuses, and sandbox is kept apart', async () => {
    const set = (column: string, value: string) =>
      `update public.subscriptions set ${column} = ${value} where user_id = '${A}'`;
    for (const status of ['trial', 'active', 'grace', 'expired']) {
      await as('service_role', null, (tx) => tx.query(set('status', `'${status}'`)));
    }
    await refuses('service_role', null, set('status', `'trialing'`), /check constraint/);
    await refuses('service_role', null, set('environment', `'staging'`), /check constraint/);
    const { rows } = await db.query<{ environment: string }>(
      'select environment from public.subscriptions',
    );
    equal(rows[0].environment, 'production', 'default environment');
  });

  await check('the webhook’s event log is the service role’s alone', async () => {
    const write = `insert into public.billing_events (id, user_id, type) values ('evt_1', $1, 'RENEWAL')`;
    await refuses('authenticated', A, write, /permission denied/, [A]);
    await refuses('anon', null, 'select * from public.billing_events', /permission denied/);
    await commitAs('service_role', null, write, [A]);
    await refuses('authenticated', A, 'select * from public.billing_events', /permission denied/);
    // The same event twice is refused, which is how a re-sent webhook is spotted.
    await refuses('service_role', null, write, /duplicate key/, [A]);
  });

  // --- Constraints -----------------------------------------------------------
  await check('values outside the engine’s vocabulary are rejected', async () => {
    const answers = (column: string, value: string) =>
      `update public.quiz_answers set ${column} = ${value} where user_id = '${A}'`;
    await refuses('authenticated', A, answers('goal', `'lose_weight'`), /check constraint/);
    await refuses('authenticated', A, answers('minutes', `15`), /check constraint/);
    await refuses(
      'authenticated',
      A,
      answers('days', `array[0, 8]::smallint[]`),
      /check constraint/,
    );
    await refuses(
      'authenticated',
      A,
      answers('work_around', `array['bad_mood']`),
      /check constraint/,
    );
    await refuses(
      'service_role',
      null,
      `update public.classes set intensity = 4`,
      /check constraint/,
    );
    await refuses(
      'service_role',
      null,
      `update public.classes set unsuitable_for = array['none']`,
      /check constraint/,
    );
  });

  // --- Account deletion ------------------------------------------------------
  await check('deleting the auth user removes everything of hers', async () => {
    await db.query(`delete from auth.users where id = $1`, [A]);
    for (const table of [
      'users',
      'quiz_answers',
      'plans',
      'plan_sessions',
      'subscriptions',
      'feedback',
      'class_progress',
    ]) {
      equal(
        (await db.query<{ n: number }>(`select count(*)::int as n from public.${table}`)).rows[0].n,
        table === 'users' ? 1 : 0,
        table,
      );
    }
  });

  await db.close();

  console.log(
    `\nDatabase checks: ${passed} passed, ${failures.length} failed (${migrations.length} migration, PGlite).`,
  );
  for (const failure of failures) console.log(`  FAIL  ${failure}`);
  if (failures.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
