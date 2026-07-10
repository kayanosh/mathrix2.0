/**
 * Fail-soft writer for AI usage/cost telemetry.
 *
 * Records one row per served AI request into `ai_usage_log` (user, mode, the
 * models used, token counts, estimated USD cost, whether it was a cache hit,
 * and the verification confidence). Never throws and never blocks the response
 * — telemetry problems must not affect the student's lesson.
 */
import { supabaseAdmin } from "./supabase/admin";
import { aggregateUsage, type CallUsage } from "./ai-cost";

export interface AiUsageEntry {
  userId?: string | null;
  /** 'solve' | 'hint' | 'teacher' | 'lesson' | 'followup' | 'cache' */
  mode: string;
  category?: string | null;
  level?: string | null;
  tier?: string | null;
  cached?: boolean;
  confidence?: string | null;
  /** All model calls made while serving this request. */
  calls: CallUsage[];
}

/**
 * Persist a usage record. Fire-and-forget friendly; resolves even on failure.
 */
export async function logAiUsage(entry: AiUsageEntry): Promise<void> {
  try {
    const agg = aggregateUsage(entry.calls || []);
    const models = Array.from(
      new Set((entry.calls || []).map((c) => c.model).filter(Boolean)),
    );

    const { error } = await supabaseAdmin.from("ai_usage_log").insert({
      user_id: entry.userId || null,
      mode: entry.mode,
      category: entry.category || null,
      level: entry.level || null,
      tier: entry.tier || null,
      cached: entry.cached ?? false,
      confidence: entry.confidence || null,
      models,
      input_tokens: agg.inputTokens,
      output_tokens: agg.outputTokens,
      est_cost_usd: agg.estCostUsd,
      cost_known: agg.allModelsKnown,
    });

    if (error) {
      console.warn("[AiUsageLog] Insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[AiUsageLog] Write threw:", (err as Error).message);
  }
}
