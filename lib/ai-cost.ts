/**
 * Pure cost-estimation helpers for AI usage telemetry.
 *
 * Prices are approximate USD per 1,000,000 tokens and are easy to update in one
 * place. Unknown models estimate as 0 and are flagged via `isKnownModel` so the
 * telemetry can record "cost unknown" rather than a misleading number.
 *
 * No side effects / no external deps — fully unit-testable.
 */

export interface ModelPrice {
  /** USD per 1,000,000 input tokens. */
  inputPerM: number;
  /** USD per 1,000,000 output tokens. */
  outputPerM: number;
}

/** Prices per 1M tokens. Keep in sync with provider pricing pages. */
export const MODEL_PRICING: Record<string, ModelPrice> = {
  // Anthropic
  "claude-sonnet-4-6-20250514": { inputPerM: 3, outputPerM: 15 },
  "claude-sonnet-4": { inputPerM: 3, outputPerM: 15 },
  // OpenAI
  "gpt-4o": { inputPerM: 2.5, outputPerM: 10 },
  "gpt-4o-mini": { inputPerM: 0.15, outputPerM: 0.6 },
};

export function isKnownModel(model: string): boolean {
  return Object.prototype.hasOwnProperty.call(MODEL_PRICING, model);
}

/**
 * Estimate the USD cost of a single model call. Returns 0 for unknown models
 * (check isKnownModel to distinguish "free" from "unpriced").
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = MODEL_PRICING[model];
  if (!price) return 0;
  const inTok = Math.max(0, inputTokens || 0);
  const outTok = Math.max(0, outputTokens || 0);
  const cost = (inTok / 1_000_000) * price.inputPerM + (outTok / 1_000_000) * price.outputPerM;
  // Round to 6 dp (micro-dollars) to avoid float noise.
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export interface CallUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AggregatedUsage {
  inputTokens: number;
  outputTokens: number;
  estCostUsd: number;
  /** True if every priced-in call used a known model. */
  allModelsKnown: boolean;
}

/**
 * Sum token counts and estimated cost across all the model calls made while
 * serving one request (solver + retries + critic, etc.).
 */
export function aggregateUsage(calls: CallUsage[]): AggregatedUsage {
  let inputTokens = 0;
  let outputTokens = 0;
  let estCostUsd = 0;
  let allModelsKnown = true;

  for (const call of calls) {
    inputTokens += Math.max(0, call.inputTokens || 0);
    outputTokens += Math.max(0, call.outputTokens || 0);
    estCostUsd += estimateCost(call.model, call.inputTokens, call.outputTokens);
    if (!isKnownModel(call.model)) allModelsKnown = false;
  }

  return {
    inputTokens,
    outputTokens,
    estCostUsd: Math.round(estCostUsd * 1_000_000) / 1_000_000,
    allModelsKnown,
  };
}
