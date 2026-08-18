-- Durable daily allowance for anonymous (not signed-in) visitors.
--
-- The anonymous prompt limit was enforced only in localStorage — app/api/chat
-- documented that it "allows the request through (no user row to check)" — so
-- clearing site data reset the quota and gave unlimited free Claude, GPT-4o and
-- TTS to anyone who knew how. This is the server-side counter.
--
-- PRIVACY: stores a SALTED SHA-256 of the client IP, never the address. The
-- visitors are children and an IP is personal data under UK GDPR; a truncated
-- salted hash is enough to count and useless for identifying anyone. Rows are
-- disposable — see the retention note at the bottom.

create table if not exists public.anon_usage (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  usage_date date not null default current_date,
  prompt_count integer not null default 0,
  unique (ip_hash, usage_date)
);

-- No user owns these rows, so there is nothing for a user to select. RLS on with
-- no policies = service role only, which is exactly the intent.
alter table public.anon_usage enable row level security;

create index if not exists anon_usage_date_idx on public.anon_usage (usage_date);

-- Atomic increment, mirroring public.increment_usage for signed-in users.
create or replace function public.increment_anon_usage(p_ip_hash text, p_date date)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.anon_usage (ip_hash, usage_date, prompt_count)
  values (p_ip_hash, p_date, 1)
  on conflict (ip_hash, usage_date)
  do update set prompt_count = anon_usage.prompt_count + 1;
end;
$$;

-- Retention: nothing here is needed beyond the current day's counting. Run this
-- on a schedule (or via a cron job) to keep the table empty of stale data:
--   delete from public.anon_usage where usage_date < current_date - interval '2 days';
