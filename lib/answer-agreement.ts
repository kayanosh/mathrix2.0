/**
 * Does the answer the pupil is SHOWN agree with one worked out independently?
 *
 * WHY THIS EXISTS. The pipeline used to mark an answer "CAS verified" the moment
 * the CAS produced any answer at all — the two were never compared. A badge
 * reading "Independently verified" could sit on an answer nothing had looked at,
 * and (with the old question reader) next to a CAS result of "6" for 6 × 7.
 *
 * So the rule is: a check counts only if it actually compared something.
 *
 *   "agree"    — the displayed answer was found and equals the independent one.
 *   "disagree" — the displayed answer was found and differs. This is a red flag,
 *                not a shrug: the caller should say so, never show a badge.
 *   "unknown"  — the displayed answer could not be read with confidence. That is
 *                NOT agreement, and earns no badge either.
 *
 * Reading free text is imperfect, so the two failure directions are deliberately
 * unequal: when unsure this returns "unknown" (no claim) rather than "agree" (a
 * false claim). A missed badge on a right answer costs little; a badge on a
 * wrong answer is the thing this file exists to prevent.
 */
import type { WhiteboardResponse } from "@/types/whiteboard";
import { rationalEquals, type Rational } from "@/lib/maths-value";
import { assignedValues, numbersIn, plain, toRational } from "@/lib/answer-text";
import { readMathsExpression } from "@/lib/maths-question";
import { expressionsEquivalent } from "@/lib/cas-solver";
import { postVerifyCAS } from "@/lib/cas-post-verify";

export type Agreement = "agree" | "disagree" | "unknown";

interface DisplayedAnswer {
  /** Raw LaTeX of the last line of working, if the board has equation steps. */
  lastStepRaw: string | null;
  conclusionRaw: string;
  /** Explicit answer fields on blocks (column methods and similar). */
  blockAnswers: string[];
}

function displayedAnswer(board: WhiteboardResponse): DisplayedAnswer {
  let lastStepRaw: string | null = null;
  const blockAnswers: string[] = [];
  for (const block of board.blocks || []) {
    if (block.type === "equation_steps" && block.steps.length > 0) {
      lastStepRaw = block.steps[block.steps.length - 1].latexAfter || null;
    }
    const answer = (block as { answer?: unknown }).answer;
    if (typeof answer === "string" && answer.trim()) blockAnswers.push(answer);
  }
  return { lastStepRaw, conclusionRaw: board.conclusion || "", blockAnswers };
}

// ── Truth: "x = 5", "x = -1 | x = 6" ─────────────────────────────────────────

function sameSet(a: Rational[], b: Rational[]): boolean {
  const contains = (list: Rational[], value: Rational) => list.some((v) => rationalEquals(v, value));
  return a.every((value) => contains(b, value)) && b.every((value) => contains(a, value));
}

function compareAssignments(
  truth: Map<string, Rational[]>,
  shown: DisplayedAnswer,
): Agreement {
  const text = [shown.lastStepRaw, shown.conclusionRaw].filter(Boolean).map((t) => plain(t!)).join(" ; ");
  let agree = true;
  for (const [variable, expected] of truth) {
    const found = assignedValues(text, variable);
    if (found === "unreadable" || found.length === 0) return "unknown";
    if (!sameSet(found, expected)) agree = false;
  }
  return agree ? "agree" : "disagree";
}

// ── Truth: a single number ───────────────────────────────────────────────────

/**
 * Is `shown` a correct rounding of an inexact truth (2π → 6.283185…)?
 *
 *   "yes"   — correct to the precision shown, with at least two significant
 *             figures: 6.28, 6.283, 6.3, and 154 for 153.938.
 *   "maybe" — in the right region but too coarse, or written exactly (49π,
 *             √50) so there is no decimal to compare. Not a contradiction.
 *   "no"    — a different number.
 */
function roundingVerdict(rawShown: string, truth: number, context: string): "yes" | "maybe" | "no" {
  const shown = Number(rawShown.replace(/\s/g, ""));
  if (!Number.isFinite(shown)) return "maybe";
  const decimals = /\.(\d+)$/.exec(rawShown.trim())?.[1].length ?? 0;
  const significant = rawShown.replace(/^-?0*\.?0*/, "").replace(/\./, "").length;
  const tolerance = 0.5 * 10 ** -decimals + 1e-9 * Math.max(1, Math.abs(truth));
  if (Math.abs(shown - truth) <= tolerance) return significant >= 2 ? "yes" : "maybe";
  // An exact form on the board ("49π cm²") has no decimal to hold against it.
  if (/π|\\pi|√|\\sqrt|\bpi\b/.test(context)) return "maybe";
  return Math.abs(shown - truth) <= 0.05 * Math.abs(truth) ? "maybe" : "no";
}

function compareNumber(
  truthRaw: string,
  truth: Rational,
  exact: boolean,
  shown: DisplayedAnswer,
): Agreement {
  const rawSources = [...shown.blockAnswers, shown.lastStepRaw || "", shown.conclusionRaw];
  const sources = rawSources.map(plain).filter(Boolean);
  const context = rawSources.join(" ");

  let sawAnyNumber = false;
  let nearMiss = false;
  for (const source of sources) {
    const numbers = numbersIn(source);
    if (numbers.length === 0) continue;
    sawAnyNumber = true;
    // The convention throughout this codebase: the last number is the answer.
    const last = numbers[numbers.length - 1];
    if (exact) {
      if (rationalEquals(last.value, truth)) return "agree";
      // The right value is on the board but not where an answer normally sits
      // — could be "42, which is 6 lots of 7". Not sure enough either way.
      if (numbers.some((n) => rationalEquals(n.value, truth))) nearMiss = true;
    } else {
      const verdicts = numbers.map((n) => roundingVerdict(n.raw, Number(truthRaw), context));
      if (verdicts[verdicts.length - 1] === "yes") return "agree";
      if (verdicts.some((v) => v !== "no")) nearMiss = true;
    }
  }
  if (!sawAnyNumber) return "unknown";
  return nearMiss ? "unknown" : "disagree";
}

// ── Truth: an expression ─────────────────────────────────────────────────────

function compareExpression(truthExpression: string, shown: DisplayedAnswer): Agreement {
  const candidates: string[] = [];
  if (shown.lastStepRaw) candidates.push(shown.lastStepRaw);
  const inline = [...shown.conclusionRaw.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
  if (inline.length > 0) candidates.push(inline[inline.length - 1]);

  let readAny = false;
  for (const candidate of candidates) {
    // "y = 3x² + 2" and "dy/dx = 3x² + 2": the answer is the right-hand side.
    const rhs = candidate.split("=").pop()!.replace(/\+\s*[cC]\s*$/, "");
    const read = readMathsExpression(rhs);
    if (!read) continue;
    readAny = true;
    if (expressionsEquivalent(read.expression, truthExpression)) return "agree";
  }
  return readAny ? "disagree" : "unknown";
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Compare the displayed answer with independently computed answers, as produced
 * by casSolve(): ["42"], ["5/4"], ["x = -1", "x = 6"], ["4+5*x"], ["x^2 + C"].
 */
export function compareWithGroundTruth(
  board: WhiteboardResponse,
  truthAnswers: string[],
): Agreement {
  const truths = (truthAnswers || []).map((t) => String(t).trim()).filter(Boolean);
  if (truths.length === 0) return "unknown";
  const shown = displayedAnswer(board);

  const assignments = truths.map((t) => /^([a-zA-Z])\s*=\s*(.+)$/.exec(t));
  if (assignments.every(Boolean)) {
    const byVariable = new Map<string, Rational[]>();
    for (const match of assignments) {
      const value = toRational(match![2]);
      if (!value) return "unknown"; // surds and the like: nothing exact to compare
      byVariable.set(match![1], [...(byVariable.get(match![1]) || []), value]);
    }
    return compareAssignments(byVariable, shown);
  }

  if (truths.length !== 1) return "unknown";
  const [truth] = truths;

  // "≈" is how the solvers mark a decimal approximation of an irrational
  // value. It is an explicit flag, not something inferred from digit count.
  const inexact = truth.startsWith("≈");
  const numeric = inexact ? truth.slice(1).trim() : truth;
  const value = toRational(numeric);
  if (value) return compareNumber(numeric, value, !inexact, shown);
  if (inexact) return "unknown";

  const expression = readMathsExpression(truth.replace(/\+\s*C\s*$/, ""));
  if (!expression) return "unknown";
  return compareExpression(expression.expression, shown);
}

export interface CasChecks {
  agreement: Agreement;
  /** The displayed answer equals the answer the CAS computed from the question. */
  preCasVerified: boolean;
  /** The displayed answer satisfies the question's own equation when substituted. */
  postCasVerified: boolean;
  warnings: string[];
}

/**
 * Both CAS checks, each of which compares the DISPLAYED answer with something
 * derived from the question alone. Neither is granted for the CAS merely having
 * produced an answer.
 */
export function runCasChecks(
  board: WhiteboardResponse,
  question: string,
  truthAnswers: string[] | null,
): CasChecks {
  const warnings: string[] = [];

  const agreement = truthAnswers?.length ? compareWithGroundTruth(board, truthAnswers) : "unknown";
  if (agreement === "disagree") {
    warnings.push(
      `Displayed answer does not match the independently computed answer (${truthAnswers!.join(", ")})`,
    );
  }

  const post = postVerifyCAS(board, question || undefined);
  if (post.attempted && !post.verified) warnings.push(...post.warnings);

  return {
    agreement,
    preCasVerified: agreement === "agree",
    // Only when the equation came from the QUESTION. Checked against the
    // board's own first line, a pass means the working is self-consistent —
    // true of a perfectly worked answer to a misread question.
    postCasVerified: post.attempted && post.verified && post.premise === "question",
    warnings,
  };
}

export interface VerificationSummary {
  confidence: "high" | "medium" | "low";
  /** How many of the four checks genuinely passed. */
  agreementCount: number;
  /** Whether the board may carry the "CAS verified" stamp. */
  casVerified: boolean;
}

/**
 * Roll the four checks into the confidence the badge is drawn from.
 *
 * A CAS that DISAGREES with the displayed answer overrides everything else: the
 * critic approving an answer the algebra engine contradicts is not "medium
 * confidence", it is a wrong answer with one model vouching for it.
 */
export function summariseVerification(checks: {
  agreement: Agreement;
  preCasVerified: boolean;
  postCasVerified: boolean;
  criticVerified: boolean;
  toolChecksPassed: boolean;
}): VerificationSummary {
  const agreementCount = [
    checks.preCasVerified,
    checks.postCasVerified,
    checks.criticVerified,
    checks.toolChecksPassed,
  ].filter(Boolean).length;

  if (checks.agreement === "disagree") {
    return { confidence: "low", agreementCount, casVerified: false };
  }
  return {
    confidence: agreementCount >= 3 ? "high" : agreementCount === 2 ? "medium" : "low",
    agreementCount,
    casVerified: checks.preCasVerified || checks.postCasVerified,
  };
}

/**
 * Do two solvers' answer lists say the same thing? Used to decide whether two
 * engines agree before either is trusted as ground truth. Each list is written
 * out as a one-line "board" and compared with the other, so this is exactly as
 * strict as the check applied to a pupil-facing answer.
 */
export function truthListsAgree(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const asBoard = (answers: string[]): WhiteboardResponse => ({
    intro: "",
    blocks: [],
    conclusion: answers
      .map((answer) => answer.replace(/^≈/, "").replace(/\+\s*C\s*$/, ""))
      .map((answer) => (/^[a-zA-Z]\s*=/.test(answer) ? answer : `$${answer}$`))
      .join(" and "),
  });
  return (
    compareWithGroundTruth(asBoard(b), a) === "agree" &&
    compareWithGroundTruth(asBoard(a), b) === "agree"
  );
}
