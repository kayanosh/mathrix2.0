import { createHash } from "crypto";
import { supabaseAdmin } from "./supabase/admin";
import type { WhiteboardResponse, VerificationStatus } from "@/types/whiteboard";

/**
 * Normalize a question string for consistent hashing.
 * Lowercases, trims, collapses whitespace, and strips trivial punctuation differences.
 */
export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")          // collapse whitespace
    .replace(/['"]/g, "")          // strip quotes
    .replace(/\s*([=+\-*/^])\s*/g, "$1") // normalize around operators
    .replace(/\.$/, "");           // strip trailing period
}

/**
 * Create a SHA-256 hash of the normalized question + context params.
 * Same question at different tiers or levels produces different hashes.
 */
/**
 * Bump to stop every answer saved so far being served again.
 *
 * 2: answers saved before this could have had their working replaced by a
 *    sub-calculation lifted from it. "Area of a trapezium, parallel sides 6 cm
 *    and 10 cm, 4 cm apart" was saved, and would have been served to everyone
 *    who asked it, as "1/2 × 16 = 8". A saved answer is the working after that
 *    replacement, so the rows cannot be repaired, only solved again.
 * 3: every topic now has a teaching plan. An answer saved before that was
 *    written without one, and would be served in place of a planned lesson.
 * 4: six topics were being answered by a built-in method written for a
 *    different one ("Simplify the ratio 18 : 24" saved as "the ratio has 42
 *    parts"), and those answers were saved. The teaching instructions also
 *    changed: whole lines of working, and the idea stated at the start.
 * 5: answers rated "low" by the checks were being saved like any other.
 *    They are no longer saved, and the ones already saved are left behind.
 * 6: the answers saved while these changes were being tested, some of them
 *    wrong, are left behind. The checks that would now send them back did not
 *    exist when they were saved.
 */
const CACHE_VERSION = 6;

export function hashQuestion(
  normalizedText: string,
  level: string,
  tier?: string | null,
  examBoard?: string | null,
): string {
  const input = [normalizedText, level, tier || "", examBoard || "", `v${CACHE_VERSION}`].join("|");
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Whether an answer is good enough to be served again to someone else.
 *
 * A saved answer has no expiry and goes to every pupil who asks the same
 * question, so the bar for saving is higher than the bar for showing: not
 * contradicted by the algebra engine, and not rated "low" by the checks.
 */
export function worthSaving(casAgreement: string | null | undefined, confidence: string | null | undefined): boolean {
  return casAgreement !== "disagree" && confidence !== "low";
}

/**
 * Check whether a question is cacheable.
 * Only standalone first-message questions are cached (not follow-ups).
 */
export function isCacheable(
  messages: Array<{ role: string; content: string }>
): boolean {
  // Only cache when this is the first user message (no prior conversation)
  const userMessages = messages.filter((m) => m.role === "user");
  return userMessages.length === 1;
}

export interface CacheHit {
  response_json: WhiteboardResponse;
  verification_json: VerificationStatus | null;
  category: string;
  ground_truth: string | null;
}

/**
 * Look up a cached answer by question hash.
 * Returns null if no cache entry exists.
 */
export async function lookupCache(
  questionHash: string
): Promise<CacheHit | null> {
  const { data, error } = await supabaseAdmin
    .from("question_cache")
    .select("response_json, verification_json, category, ground_truth")
    .eq("question_hash", questionHash)
    .single();

  if (error || !data) return null;

  // Increment hit count asynchronously (fire-and-forget)
  supabaseAdmin
    .rpc("increment_cache_hit", { p_hash: questionHash })
    .then(({ error: rpcErr }) => {
      if (rpcErr) {
        // Fallback: direct update
        supabaseAdmin
          .from("question_cache")
          .update({ hit_count: (data as Record<string, unknown>).hit_count as number + 1 })
          .eq("question_hash", questionHash)
          .then(() => {});
      }
    });

  return {
    response_json: data.response_json as WhiteboardResponse,
    verification_json: data.verification_json as VerificationStatus | null,
    category: data.category as string,
    ground_truth: data.ground_truth as string | null,
  };
}

/**
 * Write a solved question to the cache.
 * Uses upsert to handle race conditions (first write wins, subsequent ones are ignored).
 */
export async function writeCache(entry: {
  questionHash: string;
  questionText: string;
  level: string;
  tier?: string | null;
  examBoard?: string | null;
  category: string;
  responseJson: WhiteboardResponse;
  verificationJson?: VerificationStatus | null;
  groundTruth?: string | null;
  /**
   * Replace an existing row instead of leaving it. Only for a row that was
   * found to hold an answer the CAS contradicts; the default keeps first-write-
   * wins, which is what makes concurrent solves of the same question safe.
   */
  overwrite?: boolean;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("question_cache").upsert(
    {
      question_hash: entry.questionHash,
      question_text: entry.questionText,
      level: entry.level,
      tier: entry.tier || null,
      exam_board: entry.examBoard || null,
      category: entry.category,
      response_json: entry.responseJson,
      verification_json: entry.verificationJson || null,
      ground_truth: entry.groundTruth || null,
      hit_count: 0,
    },
    { onConflict: "question_hash", ignoreDuplicates: !entry.overwrite }
  );

  if (error) {
    console.error("[QuestionCache] Write failed:", error.message);
  }
}
