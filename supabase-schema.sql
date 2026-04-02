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
