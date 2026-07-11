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
): string {
  const input = [normalizeTopic(topic), level, tier || ""].join("|");
  return createHash("sha256").update(input).digest("hex");
}
