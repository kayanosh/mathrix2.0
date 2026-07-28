-- DEF-002 remediation: cache real per-sentence timestamps alongside each
-- narration clip, so word-highlight/cursor timing can interpolate within a
-- sentence's real duration instead of across a whole multi-sentence clip.
--
-- Run this once in the Supabase SQL editor for this project
-- (see the URL printed by scripts/check-supabase.mjs).

alter table tts_cache
  add column if not exists segments jsonb;

comment on column tts_cache.segments is
  'Whisper transcription segments for this clip: [{"text","start","end"}, ...] in seconds. Null until backfilled/generated. Word-level timestamps are NOT used (verified unreliable for comma-formatted numbers, e.g. "62,403" transcribes as two words "62" and "403" — see MATHRIX_DEFECT_REGISTER.csv DEF-002).';
