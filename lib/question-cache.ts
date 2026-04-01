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
export function hashQuestion(
  normalizedText: string,
  level: string,
  tier?: string | null,
  examBoard?: string | null,
): string {
  const input = [normalizedText, level, tier || "", examBoard || ""].join("|");
  return createHash("sha256").update(input).digest("hex");
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
    { onConflict: "question_hash", ignoreDuplicates: true }
  );

  if (error) {
    console.error("[QuestionCache] Write failed:", error.message);
  }
}
