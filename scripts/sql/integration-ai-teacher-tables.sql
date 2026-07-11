-- ============================================================================
-- Mathrix AI-teacher integration migration
-- Run ONCE in Supabase → SQL Editor to add the four tables introduced by the
-- integrated feature PRs (#7, #9, #11, #12). Idempotent and safe to re-run.
--
--   ai_usage_log      — per-request AI usage/cost telemetry (PR #11)
--   lesson_sessions   — per-user lesson resume position + history (PR #12)
--   topic_lesson_cache — cached "Teach me a topic" lessons (PR #7)
--   tts_cache         — narration audio cache metadata + hit counter (PR #9)
--
-- Audio bytes for tts_cache live in the Supabase Storage bucket `tts-cache`
-- (create that bucket separately; this script only records metadata).
-- ============================================================================

-- ── PR #11: AI usage / cost telemetry ───────────────────────────────────────
create table if not exists public.ai_usage_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,  -- null = anonymous
  mode text not null,                 -- 'solve' | 'hint' | 'teacher' | 'lesson' | 'followup' | 'cache'
  category text,
  level text,
  tier text,
  cached boolean not null default false,
  confidence text,                    -- 'high' | 'medium' | 'low' | null
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

-- ── PR #12: Lesson playback sessions (resume + completed history) ────────────
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

drop policy if exists "Users can view own lesson sessions" on public.lesson_sessions;
create policy "Users can view own lesson sessions"
  on public.lesson_sessions for select
  using (auth.uid() = user_id);

create index if not exists idx_lesson_sessions_user
  on public.lesson_sessions (user_id, updated_at desc);

-- ── PR #7: "Teach me a topic" lesson cache ───────────────────────────────────
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

drop policy if exists "Authenticated users can read topic lesson cache" on topic_lesson_cache;
create policy "Authenticated users can read topic lesson cache" on topic_lesson_cache
  for select using (auth.role() = 'authenticated');

-- ── PR #9: TTS narration cache metadata + hit counter ────────────────────────
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

create or replace function public.increment_tts_hit(p_hash text)
returns void
language sql
security definer
as $$
  update public.tts_cache set hit_count = hit_count + 1 where tts_hash = p_hash;
$$;
