-- Pilatrain: initial schema.
--
-- Nine tables, as in the data model. Row-level security is on for every one:
-- each user reads and writes only her own rows, and class details are
-- readable by everyone.
--
-- Health answers live in two columns, quiz_answers.work_around and the copy
-- inside plans.profile. They are readable only by the user they belong to,
-- and are never sent to analytics or any third party.
--
-- The value lists in the CHECK constraints mirror
-- supabase/functions/_shared/engine/domain.ts. Change both together.

-- ---------------------------------------------------------------------------
-- users: one row per auth user, created automatically (see the trigger below).
-- An anonymous session gets a row too, so the quiz and the free class work
-- before an account exists.
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table public.quiz_answers (
  user_id uuid primary key references public.users (id) on delete cascade,
  goal text not null check (goal in ('core_strength', 'posture', 'mobility', 'tone', 'routine')),
  -- 1 beginner, 2 improver.
  level smallint not null check (level in (1, 2)),
  minutes smallint not null check (minutes in (10, 20, 30)),
  -- ISO weekdays she trains on: 1 Monday to 7 Sunday.
  days smallint[] not null check (
    cardinality(days) between 1 and 7 and days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  time_of_day text not null check (time_of_day in ('morning', 'lunchtime', 'evening', 'varies')),
  equipment text[] not null default array['mat']::text[] check (
    equipment <@ array['mat', 'band', 'ball', 'weights']::text[]
  ),
  -- HEALTH DATA. Never leaves this database.
  work_around text[] not null default array[]::text[] check (
    work_around <@ array[
      'lower_back', 'neck_shoulders', 'knees', 'wrists',
      'pregnant_postpartum', 'recent_injury_surgery', 'none'
    ]::text[]
  ),
  -- Set by the safety gate: caps intensity at 2 and prefers mobility and foundations.
  gentle boolean not null default false,
  -- When she ticked the health disclaimer. Required before any plan is built.
  disclaimer_accepted_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table public.instructors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  credential text not null,
  bio text,
  photo_url text
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  instructor_id uuid not null references public.instructors (id),
  length_min smallint not null check (length_min in (10, 20, 30)),
  level smallint not null check (level in (1, 2)),
  focus text not null check (focus in ('foundations', 'core', 'full_body', 'mobility', 'express')),
  intensity smallint not null check (intensity between 1 and 3),
  -- Everything needed to take the class. Always includes the mat.
  equipment text[] not null default array['mat']::text[] check (
    equipment <@ array['mat', 'band', 'ball', 'weights']::text[]
  ),
  -- Things to work around that this class does not suit.
  unsuitable_for text[] not null default array[]::text[] check (
    unsuitable_for <@ array[
      'lower_back', 'neck_shoulders', 'knees', 'wrists',
      'pregnant_postpartum', 'recent_injury_surgery'
    ]::text[]
  ),
  mux_playback_id text,
  thumbnail_url text,
  -- [{"title": "Warm-up", "start_sec": 0}, ...]
  chapters jsonb not null default '[]'::jsonb,
  -- [{"chapter": "Warm-up", "text": "..."}, ...]
  easier_options jsonb not null default '[]'::jsonb,
  captions_url text,
  is_free boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  -- 1 for her first plan, 2 for the block that follows it, and so on.
  block integer not null default 1 check (block >= 1),
  -- The answers this plan was built from, plus the intensity shift her
  -- feedback has earned. Contains HEALTH DATA (work_around).
  profile jsonb not null,
  -- The day the plan last moved a missed session, so Today can say so once.
  moved_notice_date date,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- One live plan each.
create unique index plans_one_active_per_user on public.plans (user_id) where status = 'active';

create table public.plan_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  class_id uuid not null references public.classes (id),
  -- A 30-minute session may pair a 20 and a 10. This is the second class.
  paired_class_id uuid references public.classes (id),
  scheduled_date date not null,
  -- Where the engine first put it, before any move.
  original_date date not null,
  week smallint not null check (week between 1 and 4),
  status text not null default 'planned' check (status in ('planned', 'done', 'moved', 'dropped')),
  completed_at timestamptz
);

create index plan_sessions_by_plan on public.plan_sessions (plan_id, scheduled_date);

-- Never two sessions on one day. A dropped session leaves its day free.
create unique index plan_sessions_one_per_day
  on public.plan_sessions (plan_id, scheduled_date)
  where status <> 'dropped';

create table public.class_progress (
  user_id uuid not null references public.users (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  position_sec integer not null default 0 check (position_sec >= 0),
  percent smallint not null default 0 check (percent between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, class_id)
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan_session_id uuid not null references public.plan_sessions (id) on delete cascade,
  rating text not null check (rating in ('easy', 'right', 'hard')),
  created_at timestamptz not null default now(),
  unique (plan_session_id)
);

-- Kept current by the RevenueCat webhook, which writes with the service role.
create table public.subscriptions (
  user_id uuid primary key references public.users (id) on delete cascade,
  product_id text not null,
  status text not null,
  period_end timestamptz,
  will_renew boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- A users row for every new auth user, anonymous ones included.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security.
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.instructors enable row level security;
alter table public.classes enable row level security;
alter table public.plans enable row level security;
alter table public.plan_sessions enable row level security;
alter table public.class_progress enable row level security;
alter table public.feedback enable row level security;
alter table public.subscriptions enable row level security;

-- Start from nothing, then grant exactly what each role needs.
revoke all on all tables in schema public from anon, authenticated;

-- Class details are readable by everyone. Unpublished classes are not.
grant select on public.instructors, public.classes to anon, authenticated;

create policy "Instructors are readable by everyone"
  on public.instructors for select to anon, authenticated
  using (true);

create policy "Published classes are readable by everyone"
  on public.classes for select to anon, authenticated
  using (published);

-- Her own row.
grant select, insert, update on public.users to authenticated;

create policy "A user reads her own row"
  on public.users for select to authenticated
  using (id = (select auth.uid()));

create policy "A user creates her own row"
  on public.users for insert to authenticated
  with check (id = (select auth.uid()));

create policy "A user updates her own row"
  on public.users for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Her own quiz answers.
grant select, insert, update on public.quiz_answers to authenticated;

create policy "A user reads her own answers"
  on public.quiz_answers for select to authenticated
  using (user_id = (select auth.uid()));

create policy "A user saves her own answers"
  on public.quiz_answers for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "A user changes her own answers"
  on public.quiz_answers for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Her own plans and their sessions.
grant select, insert, update on public.plans, public.plan_sessions to authenticated;

create policy "A user reads her own plans"
  on public.plans for select to authenticated
  using (user_id = (select auth.uid()));

create policy "A user creates her own plans"
  on public.plans for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "A user updates her own plans"
  on public.plans for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "A user reads her own sessions"
  on public.plan_sessions for select to authenticated
  using (exists (
    select 1 from public.plans p
    where p.id = plan_sessions.plan_id and p.user_id = (select auth.uid())
  ));

create policy "A user creates sessions in her own plans"
  on public.plan_sessions for insert to authenticated
  with check (exists (
    select 1 from public.plans p
    where p.id = plan_sessions.plan_id and p.user_id = (select auth.uid())
  ));

create policy "A user updates her own sessions"
  on public.plan_sessions for update to authenticated
  using (exists (
    select 1 from public.plans p
    where p.id = plan_sessions.plan_id and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.plans p
    where p.id = plan_sessions.plan_id and p.user_id = (select auth.uid())
  ));

-- Her own progress through each class.
grant select, insert, update on public.class_progress to authenticated;

create policy "A user reads her own progress"
  on public.class_progress for select to authenticated
  using (user_id = (select auth.uid()));

create policy "A user saves her own progress"
  on public.class_progress for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "A user updates her own progress"
  on public.class_progress for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Her own feedback, on her own sessions. Feedback is not edited afterwards.
grant select, insert on public.feedback to authenticated;

create policy "A user reads her own feedback"
  on public.feedback for select to authenticated
  using (user_id = (select auth.uid()));

create policy "A user rates her own sessions"
  on public.feedback for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.plan_sessions s
      join public.plans p on p.id = s.plan_id
      where s.id = feedback.plan_session_id and p.user_id = (select auth.uid())
    )
  );

-- Her own membership, read-only. Only the webhook (service role) writes it.
grant select on public.subscriptions to authenticated;

create policy "A user reads her own membership"
  on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Saving a plan: close the live plan, then store the new one and its sessions,
-- all or nothing. Runs as the caller, so every row-level rule above applies.
-- Used by the plan function.
--
--   new_plan:     {"start_date", "end_date", "block", "profile"}
--   new_sessions: [{"class_id", "paired_class_id", "scheduled_date", "week"}, ...]
-- ---------------------------------------------------------------------------
create function public.save_plan(new_plan jsonb, new_sessions jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  saved_id uuid;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  update public.plans set status = 'completed' where user_id = me and status = 'active';

  insert into public.plans (user_id, start_date, end_date, block, profile)
  values (
    me,
    (new_plan ->> 'start_date')::date,
    (new_plan ->> 'end_date')::date,
    (new_plan ->> 'block')::integer,
    new_plan -> 'profile'
  )
  returning id into saved_id;

  insert into public.plan_sessions
    (plan_id, class_id, paired_class_id, scheduled_date, original_date, week, status)
  select
    saved_id,
    (s ->> 'class_id')::uuid,
    nullif(s ->> 'paired_class_id', '')::uuid,
    (s ->> 'scheduled_date')::date,
    (s ->> 'scheduled_date')::date,
    (s ->> 'week')::smallint,
    'planned'
  from jsonb_array_elements(new_sessions) as s;

  return saved_id;
end;
$$;

revoke execute on function public.save_plan(jsonb, jsonb) from public, anon;
grant execute on function public.save_plan(jsonb, jsonb) to authenticated;
