/**
 * DEF-003: bump this whenever the KS2 lesson-generation prompt materially
 * changes (the system prompt in app/api/ks2-lesson/route.ts, the required
 * JSON shape, or a subject-pedagogy prompt it includes), so a lesson's
 * promptVersion field can be traced back to a specific prompt revision.
 *
 * Deliberately not tied to ks2LessonCacheKey's "v19" — that version tracks
 * the cache-key SHAPE (which cache rows a given request can hit), not the
 * generation prompt's content. The two change for different reasons.
 */
export const KS2_PROMPT_VERSION = "2026-07-28.1";
