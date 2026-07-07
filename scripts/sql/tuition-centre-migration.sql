-- TUITION CENTRE PLATFORM — multi-tenant tutor portal (/portal)
-- Idempotent. Safe to re-run after mathrix-missing-tables.sql.
-- Order matters: add profiles.centre_id BEFORE any RLS policy references it.

-- 1. Centres table (no policies yet)
create table if not exists public.centres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  owner_id uuid references public.profiles(id) on delete set null,
  join_code text not null unique,
  subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'cancelled')),
  created_at timestamptz not null default now()
);

-- 2. Profile extensions (must exist before centre RLS policies)
alter table public.profiles add column if not exists centre_id uuid references public.centres(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'tutor', 'centre_owner', 'teacher', 'admin'));

create index if not exists idx_profiles_centre on public.profiles (centre_id);

-- 3. Other tables
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  full_name text not null,
  year_group text,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_students_centre on public.students (centre_id);

create table if not exists public.student_levels (
  id bigint generated always as identity primary key,
  centre_id uuid not null references public.centres(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id text not null,
  current_stage text,
  exam_board text,
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id)
);

create index if not exists idx_student_levels_student on public.student_levels (student_id);

create table if not exists public.student_topics (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  tutor_id uuid references public.profiles(id) on delete set null,
  student_id uuid not null references public.students(id) on delete cascade,
  stage_id text not null,
  subject_id text not null,
  topic_id text not null,
  topic_name text not null,
  exam_board text,
  level text,
  status text not null default 'taught'
    check (status in ('taught', 'practised', 'mastered')),
  notes text,
  studied_at timestamptz not null default now()
);

create index if not exists idx_student_topics_student on public.student_topics (student_id);
create index if not exists idx_student_topics_centre on public.student_topics (centre_id);

create table if not exists public.tutor_lesson_cache (
  id bigint generated always as identity primary key,
  cache_key text not null unique,
  stage_id text,
  subject text,
  exam_board text,
  topic_id text,
  topic_name text,
  level text,
  kind text,
  lesson_json jsonb not null,
  hit_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- 4. RLS (after profiles.centre_id exists)
alter table public.centres enable row level security;

drop policy if exists "Members view their centre" on public.centres;
create policy "Members view their centre"
  on public.centres for select
  using (
    id = (select p.centre_id from public.profiles p where p.id = auth.uid())
  );

drop policy if exists "Owner updates own centre" on public.centres;
create policy "Owner updates own centre"
  on public.centres for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table public.students enable row level security;

drop policy if exists "Centre members view students" on public.students;
create policy "Centre members view students"
  on public.students for select
  using (
    centre_id = (select p.centre_id from public.profiles p where p.id = auth.uid())
  );

alter table public.student_levels enable row level security;

drop policy if exists "Centre members view student levels" on public.student_levels;
create policy "Centre members view student levels"
  on public.student_levels for select
  using (
    centre_id = (select p.centre_id from public.profiles p where p.id = auth.uid())
  );

alter table public.student_topics enable row level security;

drop policy if exists "Centre members view student topics" on public.student_topics;
create policy "Centre members view student topics"
  on public.student_topics for select
  using (
    centre_id = (select p.centre_id from public.profiles p where p.id = auth.uid())
  );

alter table public.tutor_lesson_cache enable row level security;

drop policy if exists "Authenticated read tutor lesson cache" on public.tutor_lesson_cache;
create policy "Authenticated read tutor lesson cache"
  on public.tutor_lesson_cache for select
  using (auth.role() = 'authenticated');
