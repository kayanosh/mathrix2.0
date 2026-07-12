import { supabaseAdmin } from "./supabase/admin";
import type { VisualBlock } from "@/types/whiteboard";
import type {
  KS2CommonMistake,
  KS2PracticeItem,
  KS2TeachingBlock,
} from "@/types/ks2-lesson";

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
}

/** Stable cache key. v18 = multi-subject teaching engine (English/Science/Computing/Arabic). */
export function ks2LessonCacheKey(
  topicId: string,
  target: string,
  tier: string,
  kind: string
): string {
  return `v18|${topicId}|${target}|${tier}|${kind}`;
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
