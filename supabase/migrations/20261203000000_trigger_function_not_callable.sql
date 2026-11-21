-- handle_new_user() exists only to be fired by the trigger on auth.users.
--
-- Postgres lets everyone execute a new function, so it was also callable
-- through the API (/rest/v1/rpc/handle_new_user), which Supabase's security
-- advisor flagged on 21 November 2026. Called that way it did nothing harmful,
-- but nobody should be able to call it directly. A trigger fires whatever the
-- inserting role's EXECUTE rights are, so every new user still gets her row.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
