/**
 * Ground-truth builder — merges SymPy and Nerdamer results into a single
 * GroundTruthResult that gets injected into the solver and critic prompts.
 *
 * Priority: SymPy (broader coverage) > Nerdamer (fast local fallback)
 */

import type { CASResult } from "@/lib/cas-solver";
import type { SympyResult } from "@/lib/sympy-solver";

export type GroundTruthSource = "sympy" | "nerdamer" | "both" | "none";

export interface GroundTruthResult {
  /** Which computation engine(s) produced this result */
  source: GroundTruthSource;
  /** Answer strings (plain text, e.g. "x = 3") */
  answers: string[];
  /** LaTeX-formatted answers */
  answersLatex: string[];
  /** Whether at least one engine successfully computed an answer */
  verified: boolean;
  /** Whether SymPy specifically verified this */
  sympyVerified: boolean;
}

/**
 * Merge SymPy and Nerdamer results.
 * Prefer SymPy when available; fall back to Nerdamer.
 * When both agree, set source = "both" for maximum confidence.
 */
export function buildGroundTruth(
  sympy: SympyResult | null,
  nerdamer: CASResult | null,
): GroundTruthResult {
  const sympyOk = !!(sympy?.success && sympy.answers && sympy.answers.length > 0);
  const nerdamerOk = !!(nerdamer?.verified && nerdamer.answers && nerdamer.answers.length > 0);

  if (sympyOk && nerdamerOk) {
    // Both succeeded — check if they agree on the same number of answers
    const sympyCount = sympy!.answers!.length;
    const nerdamerCount = nerdamer!.answers.length;
    const source: GroundTruthSource = sympyCount === nerdamerCount ? "both" : "sympy";

    return {
      source,
      answers: sympy!.answers!,
      answersLatex: sympy!.answersLatex || nerdamer!.answersLatex,
      verified: true,
      sympyVerified: true,
    };
  }

  if (sympyOk) {
    return {
      source: "sympy",
      answers: sympy!.answers!,
      answersLatex: sympy!.answersLatex || sympy!.answers!,
      verified: true,
      sympyVerified: true,
    };
  }

  if (nerdamerOk) {
    return {
      source: "nerdamer",
      answers: nerdamer!.answers,
      answersLatex: nerdamer!.answersLatex,
      verified: nerdamer!.verified,
      sympyVerified: false,
    };
  }

  return {
    source: "none",
    answers: [],
    answersLatex: [],
    verified: false,
    sympyVerified: false,
  };
}

/**
 * Build the ground-truth block to inject into the solver system prompt.
 */
export function buildGroundTruthPromptBlock(gt: GroundTruthResult): string {
  if (gt.source === "none" || gt.answers.length === 0) return "";

  const sourceLabel =
    gt.source === "both"
      ? "SymPy + Nerdamer (both agree)"
      : gt.source === "sympy"
      ? "SymPy"
      : "Nerdamer";

  return `
━━━ GROUND TRUTH ANSWER (Independent Symbolic Computation) ━━━

A symbolic mathematics engine independently solved this problem BEFORE you.

Source: ${sourceLabel}
Answer(s): ${gt.answers.join(" , ")}

CRITICAL RULES:
• Your final answer MUST match this ground truth.
• Build a clear step-by-step explanation that ARRIVES at this answer.
• Include a "selfCheck" field on the final equation step verifying the answer.
• If you think the ground truth is wrong, still use it — trust the CAS over your own computation.
━━━`;
}
