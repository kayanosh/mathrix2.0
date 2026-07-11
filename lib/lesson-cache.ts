/**
 * Persistence for "Teach me a topic" lessons.
 *
 * Full topic lessons are expensive to generate (long structured output +
 * a contract-enforcement retry), and the same topic at the same level/tier
 * produces an equivalent lesson every time. We cache the generated
 * WhiteboardResponse (plus the lesson-contract result as metadata) keyed on
 * topic + level + tier, mirroring the question_cache / ks2_lesson_cache pattern.
 */
import { supabaseAdmin } from "./supabase/admin";
import type { WhiteboardResponse } from "@/types/whiteboard";
import type { LessonContractResult } from "./lesson-contract";
import { normalizeTopic, hashLessonKey } from "./lesson-cache-key";

// Re-export the pure key helpers so existing imports from "@/lib/lesson-cache" keep working.
export { normalizeTopic, hashLessonKey };

export interface LessonCacheHit {
  response_json: WhiteboardResponse;
  contract_json: LessonContractResult | null;
}

/**
 * Look up a cached lesson by hash. Returns null on miss or any error
 * (so a missing/unconfigured DB simply degrades to live generation).
 */
export async function lookupLessonCache(
  lessonHash: string,
): Promise<LessonCacheHit | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("topic_lesson_cache")
      .select("response_json, contract_json, hit_count")
      .eq("lesson_hash", lessonHash)
      .maybeSingle();

    if (error || !data) return null;

    // Fire-and-forget hit count bump.
    supabaseAdmin
      .from("topic_lesson_cache")
      .update({ hit_count: ((data.hit_count as number) || 0) + 1 })
      .eq("lesson_hash", lessonHash)
      .then(() => {});

    return {
      response_json: data.response_json as WhiteboardResponse,
      contract_json: (data.contract_json as LessonContractResult) ?? null,
    };
  } catch (err) {
    console.warn("[LessonCache] Lookup failed:", (err as Error).message);
    return null;
  }
}

/**
 * Persist a generated lesson. Uses upsert (first write wins) so concurrent
 * generations of the same topic don't error.
 */
export async function writeLessonCache(entry: {
  lessonHash: string;
  topic: string;
  level: string;
  tier?: string | null;
  responseJson: WhiteboardResponse;
  contractJson?: LessonContractResult | null;
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("topic_lesson_cache").upsert(
      {
        lesson_hash: entry.lessonHash,
        topic: entry.topic,
        level: entry.level,
        tier: entry.tier || null,
        response_json: entry.responseJson,
        contract_json: entry.contractJson || null,
        hit_count: 0,
      },
      { onConflict: "lesson_hash", ignoreDuplicates: true },
    );

    if (error) {
      console.error("[LessonCache] Write failed:", error.message);
    }
  } catch (err) {
    console.warn("[LessonCache] Write threw:", (err as Error).message);
  }
}
