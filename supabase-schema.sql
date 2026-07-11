-- Supabase schema for Mathrix 2.0

-- 1. Profiles table — extends auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  subscription_status text not null default 'free' check (subscription_status in ('free', 'pro', 'cancelled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (but not subscription_status — that's webhook-only via service role)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. Daily usage table — tracks prompts per user per day
create table public.daily_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null default current_date,
  prompt_count integer not null default 0,
  unique (user_id, usage_date)
);

-- Enable RLS
alter table public.daily_usage enable row level security;

-- Users can read their own usage
create policy "Users can view own usage"
  on public.daily_usage for select
  using (auth.uid() = user_id);

-- Service role handles insert/update (no user-facing insert policy needed)

-- AI usage / cost telemetry — one row per served AI request.
-- Written server-side via the service role; users can read only their own rows.
create table if not exists public.ai_usage_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,  -- null = anonymous
  mode text not null,                 -- 'solve' | 'hint' | 'teacher' | 'lesson' | 'followup' | 'cache'
  category text,                      -- question category (e.g. 'algebra')
  level text,
  tier text,
  cached boolean not null default false,
  confidence text,                    -- 'high' | 'medium' | 'low' | null
  models text[] not null default '{}',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  est_cost_usd numeric not null default 0,
  cost_known boolean not null default true,  -- false when an unpriced model was used
  created_at timestamptz not null default now()
);

alter table public.ai_usage_log enable row level security;

create policy "Users can view own AI usage"
  on public.ai_usage_log for select
  using (auth.uid() = user_id);

create index if not exists idx_ai_usage_log_user on public.ai_usage_log (user_id, created_at desc);
create index if not exists idx_ai_usage_log_created on public.ai_usage_log (created_at desc);

-- Lesson playback sessions — per-user resume position + completed-lesson history.
create table if not exists public.lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_key text not null,          -- stable content hash from lesson-progress-key
  kind text not null default 'solve', -- 'solve' | 'lesson' | 'teacher'
  title text,
  topic text,
  subject text,
  level text,
  tier text,
  total_steps integer not null default 0,
  last_position integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, content_key)
);

alter table public.lesson_sessions enable row level security;

create policy "Users can view own lesson sessions"
  on public.lesson_sessions for select
  using (auth.uid() = user_id);

create index if not exists idx_lesson_sessions_user
  on public.lesson_sessions (user_id, updated_at desc);

-- 3. Auto-create profile on sign-up (trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Increment usage helper (called from API route via service role)
create or replace function public.increment_usage(p_user_id uuid, p_date date)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.daily_usage (user_id, usage_date, prompt_count)
  values (p_user_id, p_date, 1)
  on conflict (user_id, usage_date)
  do update set prompt_count = daily_usage.prompt_count + 1;
end;
$$;

-- 5. Updated_at auto-update for profiles
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- QUESTION CACHE TABLE — Global cache of solved questions
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists question_cache (
  id uuid primary key default gen_random_uuid(),
  question_hash text not null,
  question_text text not null,
  level text not null default 'GCSE',
  tier text,                          -- 'foundation' | 'higher' | null
  exam_board text,                    -- 'AQA' | 'Edexcel' | 'OCR' | null
  category text not null,             -- 'algebra', 'geometry', etc.
  response_json jsonb not null,       -- full WhiteboardResponse
  verification_json jsonb,            -- VerificationStatus
  ground_truth text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  hit_count integer not null default 0
);

-- Unique index on question_hash for fast lookups (one entry per hash)
create unique index if not exists idx_question_cache_hash
  on question_cache (question_hash);

-- RLS for question_cache
alter table question_cache enable row level security;

-- All authenticated users can read cached answers
create policy "Authenticated users can read cache" on question_cache
  for select using (auth.role() = 'authenticated');

-- Only service role can insert/update (done server-side)
-- No insert/update policy for authenticated users — service role bypasses RLS

-- ═══════════════════════════════════════════════════════════════════════════
-- KS2 LESSON CACHE — Shared Learn / Guided lessons (one per topic+target+tier)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists ks2_lesson_cache (
  cache_key text primary key,
  topic_id text not null,
  subject text,
  topic_name text,
  target text not null,
  tier text not null,
  kind text not null,                 -- 'lesson' | 'guided'
  lesson_json jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  hit_count integer not null default 0
);

create index if not exists idx_ks2_lesson_cache_topic on ks2_lesson_cache (topic_id);

alter table ks2_lesson_cache enable row level security;

create policy "Authenticated users can read ks2 lesson cache" on ks2_lesson_cache
  for select using (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════════════════
-- TOPIC LESSON CACHE — "Teach me a topic" lessons (one per topic+level+tier)
-- Mirrors question_cache: shared, read-only to clients, written server-side.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists topic_lesson_cache (
  id uuid primary key default gen_random_uuid(),
  lesson_hash text not null,
  topic text not null,
  level text not null default 'GCSE',
  tier text,                          -- 'foundation' | 'higher' | KS2 tier | null
  response_json jsonb not null,       -- full WhiteboardResponse (the lesson)
  contract_json jsonb,                -- LessonContractResult metadata (sections/warnings)
  created_at timestamp with time zone default timezone('utc'::text, now()),
  hit_count integer not null default 0
);

create unique index if not exists idx_topic_lesson_cache_hash
  on topic_lesson_cache (lesson_hash);

alter table topic_lesson_cache enable row level security;

create policy "Authenticated users can read topic lesson cache" on topic_lesson_cache
  for select using (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════════════════
-- TTS NARRATION CACHE — metadata for cached narration audio
-- The mp3 bytes live in the Storage bucket 'tts-cache' (create it once, private).
-- This table only holds lightweight metadata + hit telemetry; audio is served
-- through the /api/tts route using the service-role key.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists tts_cache (
  tts_hash text primary key,          -- sha256 of normalised text + voice + speed
  text_preview text,                  -- first 200 chars, for debugging
  voice text not null default 'onyx',
  speed numeric not null default 1,
  byte_size integer,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  hit_count integer not null default 0
);

alter table tts_cache enable row level security;
-- No client policies: browsers never read this table or the bucket directly.

create or replace function public.increment_tts_hit(p_hash text)
returns void
language sql
security definer
as $$
  update public.tts_cache set hit_count = hit_count + 1 where tts_hash = p_hash;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- EXAM PAPERS TABLE — Metadata for downloadable past papers
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists exam_papers (
  id uuid primary key default gen_random_uuid(),
  exam_board text not null,           -- 'AQA' | 'Edexcel' | 'OCR'
  tier text not null,                 -- 'foundation' | 'higher'
  year integer not null,
  paper_number text not null,         -- e.g. 'Paper 1', 'Paper 2', 'Paper 3'
  title text not null,
  storage_path text not null,         -- Supabase Storage bucket path
  is_mark_scheme boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for exam_papers
alter table exam_papers enable row level security;

-- All authenticated users can read exam papers
create policy "Authenticated users can read exam papers" on exam_papers
  for select using (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════════════════
-- CONTENT CHUNKS TABLE — Extracted chunks from GCSE content PDFs (RAG)
-- Requires pgvector extension: run `create extension if not exists vector;`
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists vector;

create table if not exists content_chunks (
  id uuid primary key default gen_random_uuid(),
  source_file text not null,           -- original PDF filename
  topic text not null,                 -- mapped topic (algebra, geometry, etc.)
  subtopic text,                       -- mapped subtopic if possible
  tier text not null default 'both',   -- 'foundation' | 'higher' | 'both'
  chunk_text text not null,            -- extracted text content
  page_number integer not null,
  embedding vector(1536),              -- OpenAI text-embedding-3-small
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Index for fast vector similarity search
create index if not exists idx_content_chunks_embedding
  on content_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- RLS for content_chunks
alter table content_chunks enable row level security;

-- All authenticated users can read content chunks
create policy "Authenticated users can read content chunks" on content_chunks
  for select using (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTION: increment_cache_hit — Atomically increment hit_count
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function increment_cache_hit(p_hash text)
returns void as $$
begin
  update question_cache
    set hit_count = hit_count + 1
    where question_hash = p_hash;
end;
$$ language plpgsql security definer;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTION: match_content_chunks — Vector similarity search for RAG
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function match_content_chunks(
  query_embedding text,
  match_threshold float default 0.3,
  match_count int default 5,
  filter_topic text default null,
  filter_tier text default null
)
returns table (
  id uuid,
  chunk_text text,
  topic text,
  subtopic text,
  tier text,
  page_number int,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    cc.id,
    cc.chunk_text,
    cc.topic,
    cc.subtopic,
    cc.tier,
    cc.page_number,
    1 - (cc.embedding <=> query_embedding::vector) as similarity
  from content_chunks cc
  where
    (filter_topic is null or cc.topic = filter_topic)
    and (filter_tier is null or cc.tier = filter_tier or cc.tier = 'both')
    and 1 - (cc.embedding <=> query_embedding::vector) > match_threshold
  order by cc.embedding <=> query_embedding::vector
  limit match_count;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SKILL PROGRESS TABLE — Per-user, per-skill mastery (persists across devices)
-- Enables the personalised progress chart that parents view via the student login.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.skill_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_key text not null,              -- "Topic — subtopic"
  section text,                         -- 'curriculum' | 'sats' | 'eleven_plus' | null
  subject text,                         -- 'maths' | 'english' | 'science' | 'arabic' | 'vr' | 'nvr' | null
  year text,                            -- 'Year 5' | 'Year 6' | null
  target text,                          -- 'curriculum' | 'sats' | 'eleven_plus' | null
  tier text,                            -- 'developing' | 'secure' | 'greater_depth' | null
  mastered_at timestamptz,              -- set when a mastery quiz is passed
  attempts integer not null default 0,
  correct integer not null default 0,
  last_seen timestamptz not null default now(),
  unique (user_id, skill_key)
);

-- For pre-existing deployments: add the newer columns if missing.
alter table public.skill_progress add column if not exists target text;
alter table public.skill_progress add column if not exists tier text;
alter table public.skill_progress add column if not exists mastered_at timestamptz;

alter table public.skill_progress enable row level security;

-- Users can read their own progress (this is what powers the parent-facing chart)
create policy "Users can view own progress"
  on public.skill_progress for select
  using (auth.uid() = user_id);

create index if not exists idx_skill_progress_user
  on public.skill_progress (user_id);

-- Insert/update is handled server-side via the service role (see app/api/progress).

-- Atomic upsert + increment of a skill attempt.
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
    -- keep the first time mastery was reached
    mastered_at = case when p_mastered then coalesce(public.skill_progress.mastered_at, now())
                       else public.skill_progress.mastered_at end,
    last_seen = now();
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROFILE EXTENSIONS — roles & school grouping (bulk-provisioned students)
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists role text not null default 'student'
    check (role in ('student', 'teacher', 'admin'));
alter table public.profiles add column if not exists school text;
alter table public.profiles add column if not exists year_group text;

-- ═══════════════════════════════════════════════════════════════════════════
-- TEACHER CLASSES — rosters & per-pupil tracking
-- ═══════════════════════════════════════════════════════════════════════════

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

-- Teachers manage only their own classes.
create policy "Teachers manage own classes"
  on public.classes for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- Teachers manage membership for classes they own.
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

-- ═══════════════════════════════════════════════════════════════════════════
-- ASSIGNMENTS — teachers set work for a class with a target/tier
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  topic_id text not null,
  topic_name text not null,
  subject text,
  target text,                 -- 'curriculum' | 'sats' | 'eleven_plus'
  tier text,                   -- 'developing' | 'secure' | 'greater_depth'
  due_date date,
  created_at timestamptz not null default now()
);

alter table public.assignments enable row level security;

-- Teachers manage their own assignments.
create policy "Teachers manage own assignments"
  on public.assignments for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- Students can read assignments for classes they belong to.
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

-- ═══════════════════════════════════════════════════════════════════════════
-- TUITION CENTRE PLATFORM — multi-tenant tutor portal
-- (Also available as a standalone migration in supabase-tuition-migration.sql.)
--   centres            — a tuition centre (the tenant); each has its own login(s)
--   profiles.centre_id — links a tutor / centre owner to their centre
--   students           — tutor-managed student records (NOT auth users)
--   student_levels     — the current stage/board a student works at per subject
--   student_topics     — the log of what each student studied and at what level
--   tutor_lesson_cache — shared AI lesson cache (mirrors ks2_lesson_cache)
-- ═══════════════════════════════════════════════════════════════════════════

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

drop policy if exists "Members view their centre" on public.centres;
create policy "Members view their centre"
  on public.centres for select
  using (id = (select p.centre_id from public.profiles p where p.id = auth.uid()));

drop policy if exists "Owner updates own centre" on public.centres;
create policy "Owner updates own centre"
  on public.centres for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table public.profiles add column if not exists centre_id uuid references public.centres(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'tutor', 'centre_owner', 'teacher', 'admin'));

create index if not exists idx_profiles_centre on public.profiles (centre_id);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  full_name text not null,
  year_group text,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;

drop policy if exists "Centre members view students" on public.students;
create policy "Centre members view students"
  on public.students for select
  using (centre_id = (select p.centre_id from public.profiles p where p.id = auth.uid()));

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

alter table public.student_levels enable row level security;

drop policy if exists "Centre members view student levels" on public.student_levels;
create policy "Centre members view student levels"
  on public.student_levels for select
  using (centre_id = (select p.centre_id from public.profiles p where p.id = auth.uid()));

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

alter table public.student_topics enable row level security;

drop policy if exists "Centre members view student topics" on public.student_topics;
create policy "Centre members view student topics"
  on public.student_topics for select
  using (centre_id = (select p.centre_id from public.profiles p where p.id = auth.uid()));

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

alter table public.tutor_lesson_cache enable row level security;

drop policy if exists "Authenticated read tutor lesson cache" on public.tutor_lesson_cache;
create policy "Authenticated read tutor lesson cache"
  on public.tutor_lesson_cache for select
  using (auth.role() = 'authenticated');
