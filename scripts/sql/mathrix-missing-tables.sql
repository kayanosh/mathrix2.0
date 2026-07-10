-- Mathrix: run this ONCE in Supabase → SQL Editor if tables are missing.
-- Safe to re-run (uses IF NOT EXISTS / IF NOT EXISTS columns).

-- AI usage / cost telemetry — one row per served AI request.
create table if not exists public.ai_usage_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  mode text not null,
  category text,
  level text,
  tier text,
  cached boolean not null default false,
  confidence text,
  models text[] not null default '{}',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  est_cost_usd numeric not null default 0,
  cost_known boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ai_usage_log enable row level security;

drop policy if exists "Users can view own AI usage" on public.ai_usage_log;
create policy "Users can view own AI usage"
  on public.ai_usage_log for select
  using (auth.uid() = user_id);

create index if not exists idx_ai_usage_log_user on public.ai_usage_log (user_id, created_at desc);
create index if not exists idx_ai_usage_log_created on public.ai_usage_log (created_at desc);

-- KS2 shared lesson cache (saves OpenAI tokens across users)
create table if not exists ks2_lesson_cache (
  cache_key text primary key,
  topic_id text not null,
  subject text,
  topic_name text,
  target text not null,
  tier text not null,
  kind text not null,
  lesson_json jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  hit_count integer not null default 0
);

create index if not exists idx_ks2_lesson_cache_topic on ks2_lesson_cache (topic_id);

alter table ks2_lesson_cache enable row level security;

drop policy if exists "Authenticated users can read ks2 lesson cache" on ks2_lesson_cache;
create policy "Authenticated users can read ks2 lesson cache" on ks2_lesson_cache
  for select using (auth.role() = 'authenticated');

-- Student progress (parent chart, syncs across devices)
create table if not exists public.skill_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_key text not null,
  section text,
  subject text,
  year text,
  target text,
  tier text,
  mastered_at timestamptz,
  attempts integer not null default 0,
  correct integer not null default 0,
  last_seen timestamptz not null default now(),
  unique (user_id, skill_key)
);

alter table public.skill_progress enable row level security;

drop policy if exists "Users can view own progress" on public.skill_progress;
create policy "Users can view own progress"
  on public.skill_progress for select
  using (auth.uid() = user_id);

create index if not exists idx_skill_progress_user on public.skill_progress (user_id);

create or replace function public.record_skill_attempt(
  p_user_id uuid,
  p_skill_key text,
  p_correct_delta integer,
  p_section text default null,
  p_subject text default null,
  p_year text default null,
  p_target text default null,
  p_tier text default null,
  p_mastered boolean default false
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.skill_progress (
    user_id, skill_key, section, subject, year, target, tier,
    attempts, correct, mastered_at, last_seen
  )
  values (
    p_user_id, p_skill_key, p_section, p_subject, p_year, p_target, p_tier,
    1, greatest(p_correct_delta, 0),
    case when p_mastered then now() else null end, now()
  )
  on conflict (user_id, skill_key)
  do update set
    attempts = public.skill_progress.attempts + 1,
    correct = public.skill_progress.correct + greatest(p_correct_delta, 0),
    section = coalesce(excluded.section, public.skill_progress.section),
    subject = coalesce(excluded.subject, public.skill_progress.subject),
    year = coalesce(excluded.year, public.skill_progress.year),
    target = coalesce(excluded.target, public.skill_progress.target),
    tier = coalesce(excluded.tier, public.skill_progress.tier),
    mastered_at = case when p_mastered then coalesce(public.skill_progress.mastered_at, now())
                       else public.skill_progress.mastered_at end,
    last_seen = now();
end;
$$;

-- School / teacher fields on profiles
alter table public.profiles add column if not exists role text default 'student';
alter table public.profiles add column if not exists school text;
alter table public.profiles add column if not exists year_group text;

-- Teacher classes & assignments
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  join_code text not null unique,
  school text,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;

drop policy if exists "Teachers manage own classes" on public.classes;
create policy "Teachers manage own classes"
  on public.classes for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

drop policy if exists "Teachers manage own class members" on public.class_members;
create policy "Teachers manage own class members"
  on public.class_members for all
  using (
    exists (
      select 1 from public.classes c
      where c.id = class_members.class_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c.id = class_members.class_id and c.teacher_id = auth.uid()
    )
  );

create index if not exists idx_classes_teacher on public.classes (teacher_id);
create index if not exists idx_class_members_class on public.class_members (class_id);
create index if not exists idx_class_members_student on public.class_members (student_id);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  topic_id text not null,
  topic_name text not null,
  subject text,
  target text,
  tier text,
  due_date date,
  created_at timestamptz not null default now()
);

alter table public.assignments enable row level security;

drop policy if exists "Teachers manage own assignments" on public.assignments;
create policy "Teachers manage own assignments"
  on public.assignments for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

drop policy if exists "Students view their class assignments" on public.assignments;
create policy "Students view their class assignments"
  on public.assignments for select
  using (
    exists (
      select 1 from public.class_members m
      where m.class_id = assignments.class_id and m.student_id = auth.uid()
    )
  );

create index if not exists idx_assignments_class on public.assignments (class_id);
create index if not exists idx_assignments_teacher on public.assignments (teacher_id);
