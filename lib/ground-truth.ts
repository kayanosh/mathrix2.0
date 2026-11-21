/**
 * Ground-truth builder — merges SymPy and Nerdamer results into a single
 * GroundTruthResult that gets injected into the solver and critic prompts.
 *
 * Priority: SymPy (broader coverage) > Nerdamer (fast local fallback)
 */

import type { CASResult } from "@/lib/cas-solver";
import type { SympyResult } from "@/lib/sympy-solver";
import { truthListsAgree } from "@/lib/answer-agreement";

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
 * When both engines answer they must agree, or there is no ground truth.
 * When only one answers, that one is used.
 */
export function buildGroundTruth(
  sympy: SympyResult | null,
  nerdamer: CASResult | null,
): GroundTruthResult {
  const sympyOk = !!(sympy?.success && sympy.answers && sympy.answers.length > 0);
  const nerdamerOk = !!(nerdamer?.verified && nerdamer.answers && nerdamer.answers.length > 0);

  if (sympyOk && nerdamerOk) {
    // Two engines, one question. If they agree, that is the strongest ground
    // truth there is. If they DISAGREE, at least one is wrong and nothing here
    // can say which — so there is no ground truth, rather than a coin-flip
    // presented as one. ("Agree" used to mean "returned the same NUMBER of
    // answers", and SymPy's answer was used regardless.)
    if (!truthListsAgree(sympy!.answers!, nerdamer!.answers)) {
      console.warn(
        `[GroundTruth] SymPy (${sympy!.answers!.join(", ")}) and Nerdamer ` +
          `(${nerdamer!.answers.join(", ")}) disagree — using neither`,
      );
      return { source: "none", answers: [], answersLatex: [], verified: false, sympyVerified: false };
    }
    return {
      source: "both",
      // Nerdamer's wording is the one the rest of the pipeline was built on.
      answers: nerdamer!.answers,
      answersLatex: nerdamer!.answersLatex,
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
