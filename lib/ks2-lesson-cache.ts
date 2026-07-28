import { supabaseAdmin } from "./supabase/admin";
import type { VisualBlock } from "@/types/whiteboard";
import type {
  KS2CommonMistake,
  KS2PracticeItem,
  KS2TeachingBlock,
} from "@/types/ks2-lesson";
import type { TeachingStep } from "@/lib/methods/types";

export interface CachedKS2WorkedExampleWhiteboard {
  intro: string;
  blocks: VisualBlock[];
  conclusion: string;
}

export interface CachedKS2Lesson {
  intro: string;
  heroEmoji?: string;
  sections: { heading: string; body: string; emoji?: string }[];
  workedExample: {
    question: string;
    steps: string[];
    answer: string;
    emoji?: string;
    whiteboard?: CachedKS2WorkedExampleWhiteboard;
    teachingSteps?: TeachingStep[];
  };
  keyPoints: string[];
  tryThis?: { question: string; answer: string };

  /** Teaching Engine (schema v2) — optional for legacy cache rows */
  schemaVersion?: 2;
  learningObjective?: string;
  prerequisiteKnowledge?: string[];
  teachingBlocks?: KS2TeachingBlock[];
  commonMistakes?: KS2CommonMistake[];
  guidedPractice?: KS2PracticeItem[];
  independentPractice?: KS2PracticeItem[];
  quickCheck?: KS2PracticeItem;
  recap?: string;
  yearGroup?: string;
  strand?: string;
  skill?: string;
  method?: string;

  // ── Versioning / provenance (DEF-003) — descriptive only, see
  // types/ks2-lesson.ts for the full rationale on each field. ─────────────
  lessonId?: string;
  contentVersion?: string;
  curriculumObjectiveId?: string;
  modelVersion?: string;
  promptVersion?: string;
  reviewStatus?: "unreviewed" | "approved" | "rejected";
  teacherReviewer?: string;
  sourceReferences?: string[];
}

/** Stable cache key. v18 = multi-subject teaching engine (English/Science/Computing/Arabic). */
export function ks2LessonCacheKey(
  topicId: string,
  target: string,
  tier: string,
  kind: string,
  skill = "",
): string {
  return `v19|${topicId}|${target}|${tier}|${kind}|${skill
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")}`;
}

export async function lookupKS2LessonCache(
  cacheKey: string
): Promise<CachedKS2Lesson | null> {
  const { data, error } = await supabaseAdmin
    .from("ks2_lesson_cache")
    .select("lesson_json, hit_count")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (error || !data) return null;

  supabaseAdmin
    .from("ks2_lesson_cache")
    .update({ hit_count: ((data.hit_count as number) || 0) + 1 })
    .eq("cache_key", cacheKey)
    .then(() => {});

  return data.lesson_json as CachedKS2Lesson;
}

export async function writeKS2LessonCache(entry: {
  cacheKey: string;
  topicId: string;
  subject: string;
  topicName: string;
  target: string;
  tier: string;
  kind: string;
  lesson: CachedKS2Lesson;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("ks2_lesson_cache").upsert(
    {
      cache_key: entry.cacheKey,
      topic_id: entry.topicId,
      subject: entry.subject,
      topic_name: entry.topicName,
      target: entry.target,
      tier: entry.tier,
      kind: entry.kind,
      lesson_json: entry.lesson,
      hit_count: 0,
    },
    { onConflict: "cache_key" }
  );

  if (error) {
    console.error("[KS2LessonCache] Write failed:", error.message);
  }
}

export interface KS2LessonReviewRow {
  cacheKey: string;
  topicId: string;
  subject: string | null;
  topicName: string | null;
  target: string;
  tier: string;
  kind: string;
  hitCount: number;
  createdAt: string | null;
  lesson: CachedKS2Lesson;
}

/**
 * List cached lessons for teacher/admin review (DEF-003). reviewStatus lives
 * inside lesson_json (no separate DB column — see supabase-schema.sql), so
 * this filters client-side after fetching rather than via a DB-side WHERE.
 * The cache is small enough (hundreds of rows) that this is fine without an
 * index; do not use this for a much larger table.
 */
export async function listKS2LessonCacheForReview(
  status: "unreviewed" | "approved" | "rejected",
  limit = 50,
): Promise<KS2LessonReviewRow[]> {
  const { data, error } = await supabaseAdmin
    .from("ks2_lesson_cache")
    .select("cache_key, topic_id, subject, topic_name, target, tier, kind, lesson_json, hit_count, created_at")
    .order("hit_count", { ascending: false })
    .limit(2000);

  if (error || !data) {
    console.error("[KS2LessonCache] listForReview failed:", error?.message);
    return [];
  }

  const matches = data.filter((row) => {
    const lesson = row.lesson_json as CachedKS2Lesson;
    // Legacy rows cached before DEF-003 was fixed have no reviewStatus at
    // all — treat those as "unreviewed" too, not as a fourth silent state.
    const rowStatus = lesson.reviewStatus || "unreviewed";
    return rowStatus === status;
  });

  return matches.slice(0, limit).map((row) => ({
    cacheKey: row.cache_key as string,
    topicId: row.topic_id as string,
    subject: row.subject as string | null,
    topicName: row.topic_name as string | null,
    target: row.target as string,
    tier: row.tier as string,
    kind: row.kind as string,
    hitCount: (row.hit_count as number) || 0,
    createdAt: row.created_at as string | null,
    lesson: row.lesson_json as CachedKS2Lesson,
  }));
}

/**
 * Approve or reject a cached lesson (DEF-003 review workflow). A rejected
 * lesson is not deleted — app/api/ks2-lesson's serving path treats
 * reviewStatus:"rejected" as a cache miss and regenerates fresh content on
 * the next request, which then re-enters this queue as "unreviewed".
 */
export async function setKS2LessonReviewStatus(
  cacheKey: string,
  status: "approved" | "rejected",
  reviewerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error: readError } = await supabaseAdmin
    .from("ks2_lesson_cache")
    .select("lesson_json")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (readError || !data) {
    return { ok: false, error: readError?.message || "Lesson not found" };
  }

  const lesson = data.lesson_json as CachedKS2Lesson;
  lesson.reviewStatus = status;
  lesson.teacherReviewer = reviewerId;

  const { error: writeError } = await supabaseAdmin
    .from("ks2_lesson_cache")
    .update({ lesson_json: lesson })
    .eq("cache_key", cacheKey);

  if (writeError) {
    return { ok: false, error: writeError.message };
  }
  return { ok: true };
}
