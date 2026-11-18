-- Stop users editing their own subscription tier, role or centre.
--
--   node scripts/apply-migration.mjs scripts/sql/protect-profile-columns.sql
--
-- THE HOLE: the "Users can update own profile" policy lets a signed-in user
-- update their own row in public.profiles, and nothing restricted WHICH columns.
-- The comment beside it said "but not subscription_status — that's webhook-only",
-- but that was only a comment. That row also holds role and centre_id, so with
-- the public anon key and their own session any user could run, from the browser
-- console:
--
--   update profiles set subscription_status = 'pro'         -- free Pro
--   update profiles set role = 'admin'                      -- admin routes
--   update profiles set centre_id = '<another centre>'      -- that centre's pupils
--
-- Every API route reads these columns and trusts them.
--
-- Nothing in the app needs users to write these: every profile write in the code
-- goes through the service role (Stripe webhook, checkout, centre routes), which
-- is unaffected by everything below.
--
-- Two layers, because this is the table every permission check depends on:
--
--   1. Column privileges — the user-facing roles may update full_name and nothing
--      else. Postgres refuses any other column before RLS is even consulted.
--   2. A trigger that rejects the same thing — so the protection survives if the
--      grants are ever reset (a "grant all" in a later migration, a dashboard
--      change). It compares whole rows, so any column added to profiles in future
--      is protected by default rather than exposed by default.
--
-- Safe to run more than once.

-- 1. Column privileges ────────────────────────────────────────────────────────
revoke update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- 2. Trigger ──────────────────────────────────────────────────────────────────
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Only requests made as an end user are restricted. The service role, the
  -- dashboard SQL editor and migrations run as other database roles and pass.
  if current_user in ('anon', 'authenticated')
     and (to_jsonb(new) - 'full_name' - 'updated_at')
         is distinct from (to_jsonb(old) - 'full_name' - 'updated_at')
  then
    raise exception 'Only full_name can be changed on a profile'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ─────────────────────────────────────────────────────────────────────────────
-- AFTER APPLYING — run these by hand in the Supabase SQL editor.
--
-- a) Confirm the lock. Expect exactly one row: authenticated | full_name.
--
--   select grantee, column_name
--   from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'profiles'
--     and privilege_type = 'UPDATE' and grantee in ('anon', 'authenticated');
--
-- b) Check whether the hole was already used. Neither result is proof on its
--    own — a Pro account can be granted by hand — but every row should be one
--    you recognise.
--
--   -- Pro with no Stripe subscription behind it:
--   select id, email, subscription_status, created_at
--   from public.profiles
--   where subscription_status = 'pro' and stripe_subscription_id is null;
--
--   -- Everyone holding a staff role:
--   select id, email, role, centre_id, created_at
--   from public.profiles
--   where role <> 'student'
--   order by created_at desc;
