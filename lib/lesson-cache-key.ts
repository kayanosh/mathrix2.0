/**
 * Pure cache-key helpers for topic lessons.
 *
 * Kept separate from lesson-cache.ts (which imports the Supabase admin client)
 * so these can be imported and unit-tested without any DB/env dependency.
 */
import { createHash } from "crypto";

/** Normalise a topic string so equivalent phrasings hash together. */
export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/['"]/g, "")
    .replace(/\.$/, "");
}

/** Stable cache key for a topic lesson. */
export function hashLessonKey(
  topic: string,
  level: string,
  tier?: string | null,
  /**
   * The topic's teaching plan and its version ("pythagoras@1"), when it has
   * one. A lesson saved before the plan existed, or under an older plan, is
   * then not found, and the topic is taught again from the current plan.
   * Topics without a plan keep the key they always had.
   */
  planVersion?: string,
): string {
  const input = [normalizeTopic(topic), level, tier || "", ...(planVersion ? [planVersion] : [])].join("|");
  return createHash("sha256").update(input).digest("hex");
}
