import { supabaseAdmin } from "./supabase/admin";
import type { TutorLesson } from "@/types";

/** Stable cache key: one shared lesson per topic + board + level + kind. */
export function tutorLessonCacheKey(
  topicId: string,
  examBoard: string | null | undefined,
  level: string | null | undefined,
  kind: string,
): string {
  return `${topicId}|${examBoard || "any"}|${level || "std"}|${kind}`;
}

export async function lookupTutorLessonCache(cacheKey: string): Promise<TutorLesson | null> {
  const { data, error } = await supabaseAdmin
    .from("tutor_lesson_cache")
    .select("lesson_json, hit_count")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (error || !data) return null;

  supabaseAdmin
    .from("tutor_lesson_cache")
    .update({ hit_count: ((data.hit_count as number) || 0) + 1 })
    .eq("cache_key", cacheKey)
    .then(() => {});

  return data.lesson_json as TutorLesson;
}

export async function writeTutorLessonCache(entry: {
  cacheKey: string;
  stageId: string;
  subject: string;
  examBoard?: string | null;
  topicId: string;
  topicName: string;
  level?: string | null;
  kind: string;
  lesson: TutorLesson;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("tutor_lesson_cache").upsert(
    {
      cache_key: entry.cacheKey,
      stage_id: entry.stageId,
      subject: entry.subject,
      exam_board: entry.examBoard || null,
      topic_id: entry.topicId,
      topic_name: entry.topicName,
      level: entry.level || null,
      kind: entry.kind,
      lesson_json: entry.lesson,
      hit_count: 0,
    },
    { onConflict: "cache_key" },
  );

  if (error) {
    console.error("[TutorLessonCache] Write failed:", error.message);
  }
}
