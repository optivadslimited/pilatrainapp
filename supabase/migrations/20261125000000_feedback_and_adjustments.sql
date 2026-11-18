-- Pilatrain: what milestone 3 needs from the database.
--
--  - classes.highlights: the three "What you'll do" lines on class detail.
--  - plans.adjusted_at: when her feedback last changed the plan, so each pair
--    of ratings changes it only once.
--  - Sessions still to do can be removed from her own plan, and
--    replace_sessions swaps them for new ones in one transaction. This is how
--    her feedback (rule 8) and "Adjust my plan" re-plan the weeks ahead.

alter table public.classes
  add column highlights text[] not null default array[]::text[];

alter table public.plans
  add column adjusted_at timestamptz;

-- A session that is done can never be removed: only planned or moved ones.
grant delete on public.plan_sessions to authenticated;

create policy "A user removes sessions still to do from her own plans"
  on public.plan_sessions for delete to authenticated
  using (
    status in ('planned', 'moved')
    and exists (
      select 1 from public.plans p
      where p.id = plan_sessions.plan_id and p.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Take some not-yet-done sessions out of a plan, put new ones in, and update
-- the plan's profile, all or nothing. Runs as the caller, so the row-level
-- rules apply: it can only ever touch her own plan.
--
--   new_sessions: [{"class_id", "paired_class_id", "scheduled_date", "week"}, ...]
--   new_profile, new_adjusted_at: left unchanged when null.
-- ---------------------------------------------------------------------------
create function public.replace_sessions(
  target_plan uuid,
  remove_ids uuid[],
  new_sessions jsonb,
  new_profile jsonb,
  new_adjusted_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  if not exists (select 1 from public.plans where id = target_plan and user_id = me) then
    raise exception 'No such plan';
  end if;

  delete from public.plan_sessions
  where plan_id = target_plan
    and id = any (coalesce(remove_ids, array[]::uuid[]))
    and status in ('planned', 'moved');

  insert into public.plan_sessions
    (plan_id, class_id, paired_class_id, scheduled_date, original_date, week, status)
  select
    target_plan,
    (s ->> 'class_id')::uuid,
    nullif(s ->> 'paired_class_id', '')::uuid,
    (s ->> 'scheduled_date')::date,
    (s ->> 'scheduled_date')::date,
    (s ->> 'week')::smallint,
    'planned'
  from jsonb_array_elements(coalesce(new_sessions, '[]'::jsonb)) as s;

  update public.plans
  set
    profile = case
      when new_profile is null or jsonb_typeof(new_profile) = 'null' then profile
      else new_profile
    end,
    adjusted_at = coalesce(new_adjusted_at, adjusted_at)
  where id = target_plan;
end;
$$;

revoke execute on function public.replace_sessions(uuid, uuid[], jsonb, jsonb, timestamptz)
  from public, anon;
grant execute on function public.replace_sessions(uuid, uuid[], jsonb, jsonb, timestamptz)
  to authenticated;
