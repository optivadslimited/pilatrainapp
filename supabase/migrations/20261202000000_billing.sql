-- Billing. What the RevenueCat webhook keeps, so the server can decide who
-- may watch a class without asking the phone.
--
-- `subscriptions` holds one row per member. It is written by the service role
-- only (the webhook) and read by its owner only; that was set up in the
-- first migration and does not change here.

alter table public.subscriptions
  -- When RevenueCat says the event that last changed this row happened, so an
  -- event that arrives late cannot undo a newer one.
  add column last_event_at timestamptz,
  -- Sandbox purchases (TestFlight, App Review) are kept apart from real ones.
  add column environment text not null default 'production'
    check (environment in ('production', 'sandbox'));

--   trial     in the free week
--   active    paid and current
--   grace     payment failed; Apple is retrying and she keeps access meanwhile
--   expired   no access
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('trial', 'active', 'grace', 'expired'));

-- ---------------------------------------------------------------------------
-- Every webhook event, by RevenueCat's own ID, so one that is sent twice is
-- applied once. No policies: nobody but the service role reads or writes it.
-- ---------------------------------------------------------------------------
create table public.billing_events (
  id text primary key,
  -- Not a foreign key: the event may arrive after the account has gone.
  -- The delete-account function removes these rows itself.
  user_id uuid,
  type text not null,
  received_at timestamptz not null default now()
);

create index billing_events_user_id_idx on public.billing_events (user_id);

alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon, authenticated;
