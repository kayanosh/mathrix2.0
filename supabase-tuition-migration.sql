-- ═══════════════════════════════════════════════════════════════════════════
-- TUITION CENTRE PLATFORM — multi-tenant tutor portal
--
-- Idempotent migration. Safe to run on an existing Mathrix deployment that
-- already has the base schema (profiles, skill_progress, classes, …).
--
-- Model:
--   centres           — a tuition centre (the tenant); each has its own login(s)
--   profiles.centre_id — links a tutor / centre owner to their centre
--   students          — tutor-managed student records (NOT auth users)
--   student_levels    — the current stage/board a student is working at per subject
--   student_topics    — the log of what each student studied and at what level
--   tutor_lesson_cache — shared AI lesson cache (mirrors ks2_lesson_cache)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. CENTRES ─────────────────────────────────────────────────────────────────
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

alter table public.centres enable row level security;

-- Members of a centre may read it.
drop policy if exists "Members view their centre" on public.centres;
create policy "Members view their centre"
  on public.centres for select
  using (
    id = (select p.centre_id from public.profiles p where p.id = auth.uid())
  );

-- The owner may update their own centre.
drop policy if exists "Owner updates own centre" on public.centres;
create policy "Owner updates own centre"
  on public.centres for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 2. PROFILE EXTENSIONS ───────────────────────────────────────────────────────
alter table public.profiles add column if not exists centre_id uuid references public.centres(id) on delete set null;

-- Widen the role check to include tutor / centre_owner.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'tutor', 'centre_owner', 'teacher', 'admin'));

create index if not exists idx_profiles_centre on public.profiles (centre_id);

-- 3. STUDENTS (tutor-managed records, not auth users) ─────────────────────────
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  full_name text not null,
  year_group text,               -- friendly label e.g. "Year 8"
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;

-- Centre members can view students belonging to their centre.
drop policy if exists "Centre members view students" on public.students;
create policy "Centre members view students"
  on public.students for select
  using (
    centre_id = (select p.centre_id from public.profiles p where p.id = auth.uid())
  );

create index if not exists idx_students_centre on public.students (centre_id);

-- 4. STUDENT LEVELS (current stage/board per subject) ─────────────────────────
create table if not exists public.student_levels (
  id bigint generated always as identity primary key,
  centre_id uuid not null references public.centres(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id text not null,        -- 'maths' | 'english' | 'science'
  current_stage text,              -- stage id e.g. 'year-3' | 'gcse' | 'a-level'
  exam_board text,                 -- 'AQA' | 'Edexcel' | 'OCR' | ... (GCSE/A-Level)
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id)
);

alter table public.student_levels enable row level security;

drop policy if exists "Centre members view student levels" on public.student_levels;
create policy "Centre members view student levels"
  on public.student_levels for select
  using (
    centre_id = (select p.centre_id from public.profiles p where p.id = auth.uid())
  );

create index if not exists idx_student_levels_student on public.student_levels (student_id);

-- 5. STUDENT TOPICS (the study log — core tracking) ───────────────────────────
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
  level text,                      -- 'foundation' | 'higher' | 'core' | tutor free-text
  status text not null default 'taught'
    check (status in ('taught', 'practised', 'mastered')),
  notes text,
  studied_at timestamptz not null default now()
);

alter table public.student_topics enable row level security;

drop policy if exists "Centre members view student topics" on public.student_topics;
create policy "Centre members view student topics"
  on public.student_topics for select
  using (
    centre_id = (select p.centre_id from public.profiles p where p.id = auth.uid())
  );

create index if not exists idx_student_topics_student on public.student_topics (student_id);
create index if not exists idx_student_topics_centre on public.student_topics (centre_id);

-- 6. TUTOR LESSON CACHE (shared AI lessons; mirrors ks2_lesson_cache) ─────────
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

alter table public.tutor_lesson_cache enable row level security;

drop policy if exists "Authenticated read tutor lesson cache" on public.tutor_lesson_cache;
create policy "Authenticated read tutor lesson cache"
  on public.tutor_lesson_cache for select
  using (auth.role() = 'authenticated');

-- Inserts/updates for students/levels/topics/centres/cache are performed
-- server-side through the service-role client (see app/api/*), which bypasses
-- RLS. The select policies above give centre members read access.
