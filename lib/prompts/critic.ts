/**
 * Critic prompt builder for the two-pass verification system.
 *
 * The critic acts as a strict GCSE examiner that independently reviews
 * the solver's draft solution. It checks arithmetic, algebra, sign handling,
 * constraint satisfaction, and branch selection.
 *
 * The critic output is parsed to decide: accept, retry, or fallback.
 */

/**
 * Build the system prompt for the critic model (Pass 2).
 */
export function buildCriticSystemPrompt(): string {
  return `You are a STRICT GCSE/A-Level maths examiner. Your ONLY job is to verify a proposed solution.

RULES:
• Do NOT trust the solution. Assume it may be wrong.
• Recompute EVERY arithmetic operation from scratch.
• Check EVERY algebraic transformation step by step.
• Verify signs at every step — sign errors are the #1 mistake.
• Check ALL conditions and constraints from the original question.
• If multiple solutions exist (e.g. quadratic, circle intersections), verify the correct branch was chosen.
• Check that the final answer actually answers what was asked.

You MUST respond with ONLY valid JSON matching this exact schema:

{
  "verified": true | false,
  "confidence": "high" | "medium" | "low",
  "finalAnswerCorrect": true | false,
  "issues": [
    {
      "step": <step number or 0 for general>,
      "type": "arithmetic" | "algebra" | "sign" | "constraint" | "branch" | "method" | "diagram" | "missing_step",
      "severity": "critical" | "minor",
      "description": "<what is wrong>",
      "correction": "<what it should be>"
    }
  ],
  "recomputedAnswer": "<your independently computed final answer>",
  "constraintChecks": [
    {
      "constraint": "<condition from the question>",
      "satisfied": true | false,
      "detail": "<how you checked>"
    }
  ]
}

CRITICAL:
• "verified" = true ONLY if you are confident the final answer is correct AND all constraints are satisfied.
• If you find even ONE critical issue, set "verified" = false.
• Minor issues (formatting, style) should not fail verification.
• Always include "recomputedAnswer" — solve the problem yourself from scratch.
• Always list constraint checks — extract every condition from the question.
• Output ONLY the JSON. No markdown fences. No explanation outside of JSON.`;
}

/**
 * Build the user message for the critic, containing the question and draft solution.
 */
export function buildCriticUserMessage(
  questionText: string,
  draftSolutionJSON: string,
  hasImage: boolean,
): string {
  const imageNote = hasImage
    ? `\n\nNOTE: The student uploaded an image. The solver read the image and extracted the problem. Verify that the solver's interpretation seems reasonable given the solution content.`
    : "";

  return `ORIGINAL QUESTION:
${questionText}${imageNote}

PROPOSED SOLUTION (JSON):
${draftSolutionJSON}

INSTRUCTIONS:
1. Extract all givens and constraints from the original question.
2. Re-solve the problem from scratch using school-level methods.
3. Compare your answer with the proposed solution's final answer.
4. Check every intermediate step in the proposed solution for correctness.
5. Verify all constraints are satisfied.
6. Return your verdict as JSON.`;
}

/**
 * Parsed critic response.
 */
export interface CriticIssue {
  step: number;
  type: "arithmetic" | "algebra" | "sign" | "constraint" | "branch" | "method" | "diagram" | "missing_step";
  severity: "critical" | "minor";
  description: string;
  correction?: string;
}

export interface ConstraintCheck {
  constraint: string;
  satisfied: boolean;
  detail?: string;
}

export interface CriticResult {
  verified: boolean;
  confidence: "high" | "medium" | "low";
  finalAnswerCorrect: boolean;
  issues: CriticIssue[];
  recomputedAnswer: string;
  constraintChecks: ConstraintCheck[];
}

/**
 * Parse the raw critic response into a structured CriticResult.
 * Returns null if parsing fails.
 */
export function parseCriticResponse(raw: string): CriticResult | null {
  try {
    // Strip markdown fences if present
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = (fenced ? fenced[1] : raw).trim();

    const parsed = JSON.parse(jsonStr);

    // Basic shape validation
    if (typeof parsed.verified !== "boolean") return null;
    if (!parsed.confidence) return null;

    return {
      verified: parsed.verified,
      confidence: parsed.confidence || "low",
      finalAnswerCorrect: parsed.finalAnswerCorrect ?? parsed.verified,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      recomputedAnswer: parsed.recomputedAnswer || "",
      constraintChecks: Array.isArray(parsed.constraintChecks)
        ? parsed.constraintChecks
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Build a correction message for the solver based on critic feedback.
 * Used when the critic finds critical issues and we need to retry.
 */
export function buildCorrectionMessage(critic: CriticResult): string {
  const criticalIssues = critic.issues.filter((i) => i.severity === "critical");
  const failedConstraints = critic.constraintChecks.filter((c) => !c.satisfied);

  let msg = `A maths examiner reviewed your solution and found errors. Fix them and output corrected JSON.\n\n`;

  if (criticalIssues.length > 0) {
    msg += `ERRORS FOUND:\n`;
    for (const issue of criticalIssues) {
      msg += `• Step ${issue.step}: [${issue.type}] ${issue.description}`;
      if (issue.correction) msg += ` → Should be: ${issue.correction}`;
      msg += `\n`;
    }
    msg += `\n`;
  }

  if (failedConstraints.length > 0) {
    msg += `CONSTRAINT VIOLATIONS:\n`;
    for (const c of failedConstraints) {
      msg += `• ${c.constraint}: ${c.detail || "not satisfied"}\n`;
    }
    msg += `\n`;
  }

  if (critic.recomputedAnswer) {
    msg += `The examiner's independently computed answer is: ${critic.recomputedAnswer}\n`;
    msg += `Your final answer MUST match this.\n\n`;
  }

  msg += `Output ONLY the corrected JSON. No explanation.`;

  return msg;
}
