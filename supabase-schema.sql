-- Supabase schema for Mathrix 2.0

-- USERS (managed by Supabase Auth)

-- PROFILES TABLE
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- DAILY USAGE TABLE
create table if not exists daily_usage (
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  prompts_used integer not null default 0,
  primary key (user_id, date)
);

-- FUNCTION: increment_usage
create or replace function increment_usage()
returns void as $$
declare
  today date := current_date;
begin
  insert into daily_usage (user_id, date, prompts_used)
    values (auth.uid(), today, 1)
    on conflict (user_id, date) do update
      set prompts_used = daily_usage.prompts_used + 1;
end;
$$ language plpgsql security definer;

-- RLS POLICIES
alter table profiles enable row level security;
alter table daily_usage enable row level security;

-- Only allow users to see/update their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Only allow users to see their own usage
create policy "Users can view own usage" on daily_usage
  for select using (auth.uid() = user_id);
-- Only allow users to increment their own usage
create policy "Users can update own usage" on daily_usage
  for update using (auth.uid() = user_id);

-- Stripe customer id (optional, for reference)
alter table profiles add column if not exists stripe_customer_id text;
