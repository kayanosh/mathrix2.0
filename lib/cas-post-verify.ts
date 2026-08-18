/**
 * Post-response CAS verification.
 *
 * After GPT-4o produces a WhiteboardResponse, this module:
 *   1. Extracts the final answer from the conclusion / last equation step
 *   2. Extracts the original equation from the first equation step
 *   3. Uses nerdamer to verify the answer by substitution
 *
 * This is especially useful for image uploads where the CAS pre-solver
 * couldn't parse the question (since it was in an image).
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const nerdamer = require("nerdamer");
require("nerdamer/Algebra");
require("nerdamer/Calculus");
require("nerdamer/Solve");
require("nerdamer/Extra");
/* eslint-enable @typescript-eslint/no-require-imports */

import type {
  WhiteboardResponse,
  EquationStepBlock,
  VisualBlock,
} from "@/types/whiteboard";

// ── Public interface ──────────────────────────────────────────────────────────

export interface PostVerifyResult {
  /** Whether the CAS could verify the answer */
  verified: boolean;
  /** Any issues found (empty if verified or if CAS couldn't check) */
  warnings: string[];
  /** Whether the CAS had enough info to attempt verification */
  attempted: boolean;
}

// ── LaTeX / text extraction helpers ───────────────────────────────────────────

/**
 * Extract variable = value assignments from text that may contain
 * inline LaTeX ($...$) or plain text.
 *
 * Matches patterns like:
 *   $x = 3$, $y = -5$, x = 3, x = 3/8, $x = \frac{3}{8}$
 */
function extractAssignments(
  text: string
): Array<{ variable: string; value: string }> {
  const results: Array<{ variable: string; value: string }> = [];

  // Strip $ delimiters for uniform processing
  const cleaned = text.replace(/\$/g, "");

  // Match: variable = value (handles fracs, negatives, decimals, surds)
  const pattern =
    /\b([a-zA-Z])\s*=\s*([-+]?\s*(?:\\frac\{[^}]+\}\{[^}]+\}|\\sqrt\{[^}]+\}|[0-9./±\\pm\s]+))/g;

  let m: RegExpExecArray | null;
  while ((m = pattern.exec(cleaned)) !== null) {
    const variable = m[1];
    let value = m[2].trim();
    // Normalise LaTeX fractions → nerdamer form
    value = normaliseLaTeX(value);
    if (value && !isNaN(parseFloat(value)) || value.includes("/")) {
      results.push({ variable, value });
    }
  }

  return results;
}

/**
 * Convert common LaTeX constructs to nerdamer-parseable form.
 */
function normaliseLaTeX(expr: string): string {
  let s = expr.trim();

  // \frac{a}{b} → (a)/(b)
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");
  // \sqrt{x} → sqrt(x)
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");
  // \pm → just take the first value (positive)
  s = s.replace(/\\pm/g, "+");
  s = s.replace(/±/g, "+");
  // Unicode minus
  s = s.replace(/−/g, "-");
  // \times → *
  s = s.replace(/\\times/g, "*");
  s = s.replace(/\\cdot/g, "*");
  // \div → /
  s = s.replace(/\\div/g, "/");
  // \pi → pi
  s = s.replace(/\\pi/g, "pi");
  // Strip \text{...}
  s = s.replace(/\\text\{[^}]*\}/g, "");
  // Strip \left \right
  s = s.replace(/\\(?:left|right)([()[\]])/g, "$1");
  // Strip remaining backslash commands
  s = s.replace(/\\[a-zA-Z]+\{([^}]+)\}/g, "$1");
  s = s.replace(/\\[a-zA-Z]+/g, "");
  // Implicit multiplication
  s = s.replace(/(\d)([a-zA-Z(])/g, "$1*$2");
  // Clean whitespace
  s = s.replace(/\s+/g, "");

  return s;
}

/**
 * Extract an equation from a LaTeX string.
 * Strips \htmlId{...}{content} wrappers, keeping only the content.
 */
function stripHtmlId(latex: string): string {
  // \htmlId{id}{content} → content
  return latex.replace(/\\htmlId\{[^}]+\}\{([^}]+)\}/g, "$1");
}

/**
 * Extract the original equation from the first equation_steps block.
 */
/**
 * Pull the equation out of the ORIGINAL question text.
 *
 * This exists because verifying against the whiteboard was self-referential. A
 * deterministic builder rewrites step 1 to whatever it parsed, so when the
 * linear builder mis-read "4x + 3 = 2x + 11" as "4x + 3 = 2" it also WROTE that
 * into step 1 — and this module then confirmed the wrong answer against the
 * wrong premise and reported "verified". The board cannot be its own witness.
 */
function extractEquationFromQuestion(question: string): string | null {
  if (!question) return null;
  const text = question
    .replace(/\$+/g, " ")
    .replace(/\\left|\\right/g, " ")
    .replace(/\b(?:solve|find|calculate|work\s+out|determine|for|hence|simplify)\b/gi, " ");
  // First "<expr> = <expr>" that mentions a variable; stop at sentence enders so
  // trailing prose does not leak into the expression.
  const m = text.match(/([^=,;.?\n]*[a-zA-Z][^=,;.?\n]*)=([^=,;.?\n]+)/);
  if (!m) return null;
  const eq = `${m[1].trim()}=${m[2].trim()}`;
  if (!/[a-zA-Z]/.test(eq)) return null;
  return normaliseLaTeX(stripHtmlId(eq));
}

function extractOriginalEquation(
  blocks: VisualBlock[]
): string | null {
  const eqBlock = blocks.find(
    (b): b is EquationStepBlock => b.type === "equation_steps"
  );
  if (!eqBlock || eqBlock.steps.length === 0) return null;

  const firstStep = eqBlock.steps[0];
  // Use latexBefore of step 1 (the original equation)
  const raw = firstStep.latexBefore || firstStep.latexAfter;
  if (!raw || !raw.includes("=")) return null;

  const cleaned = stripHtmlId(raw);
  return normaliseLaTeX(cleaned);
}

/**
 * Extract the final answer from the last equation step's latexAfter.
 */
function extractFinalFromSteps(
  blocks: VisualBlock[]
): Array<{ variable: string; value: string }> {
  const eqBlock = blocks.find(
    (b): b is EquationStepBlock => b.type === "equation_steps"
  );
  if (!eqBlock || eqBlock.steps.length === 0) return [];

  const lastStep = eqBlock.steps[eqBlock.steps.length - 1];
  const raw = stripHtmlId(lastStep.latexAfter);
  return extractAssignments(raw);
}

// ── Verification logic ────────────────────────────────────────────────────────

/**
 * Verify a single variable = value by substituting into the equation.
 */
function verifyBySubstitution(
  equation: string,
  variable: string,
  value: string
): boolean {
  try {
    const [lhs, rhs] = equation.split("=").map((s) => s.trim());
    if (!lhs || !rhs) return false;

    const lVal = nerdamer(lhs, { [variable]: value }).evaluate().text();
    const rVal = nerdamer(rhs, { [variable]: value }).evaluate().text();

    return Math.abs(parseFloat(lVal) - parseFloat(rVal)) < 1e-6;
  } catch {
    return false;
  }
}

/**
 * Try to re-solve the equation via nerdamer and compare answers.
 */
function verifyBySolving(
  equation: string,
  variable: string,
  expectedValue: string
): boolean {
  try {
    const solutions = nerdamer(equation).solveFor(variable);
    const solArr = Array.isArray(solutions)
      ? solutions.map((s: { toString: () => string }) => s.toString())
      : [solutions.toString()];

    const expectedNum = parseFloat(
      nerdamer(expectedValue).evaluate().text()
    );

    return solArr.some((sol: string) => {
      const solNum = parseFloat(nerdamer(sol).evaluate().text());
      return Math.abs(solNum - expectedNum) < 1e-6;
    });
  } catch {
    return false;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Attempts to verify the GPT-4o WhiteboardResponse answer using CAS.
 *
 * Returns { verified, warnings, attempted }.
 * - If the response doesn't contain equation_steps, returns attempted=false.
 * - If it does, tries substitution and/or re-solving.
 */
export function postVerifyCAS(
  data: WhiteboardResponse,
  originalQuestion?: string,
): PostVerifyResult {
  const warnings: string[] = [];

  // 1. The equation to check against. The QUESTION wins when we have it: the
  //    whiteboard is written by the same pipeline whose answer we are checking,
  //    and a deterministic builder overwrites step 1 with whatever it parsed —
  //    so checking the board against itself verified a mis-parse. The board is
  //    still the fallback for image questions, where there is no question text
  //    to read and post-verification is the only check available at all.
  const fromQuestion = originalQuestion
    ? extractEquationFromQuestion(originalQuestion)
    : null;
  const equation = fromQuestion ?? extractOriginalEquation(data.blocks);
  if (!equation) {
    return { verified: false, warnings: [], attempted: false };
  }

  // 2. Extract answer(s) from last step and/or conclusion
  let assignments = extractFinalFromSteps(data.blocks);

  // Also try the conclusion
  if (assignments.length === 0) {
    assignments = extractAssignments(data.conclusion);
  }

  if (assignments.length === 0) {
    return {
      verified: false,
      warnings: ["Could not extract final answer for verification"],
      attempted: false,
    };
  }

  // 3. Verify each assignment
  let allVerified = true;

  for (const { variable, value } of assignments) {
    // Try substitution first
    let ok = verifyBySubstitution(equation, variable, value);

    // Fallback: try re-solving
    if (!ok) {
      ok = verifyBySolving(equation, variable, value);
    }

    if (!ok) {
      allVerified = false;
      warnings.push(
        `CAS post-check: ${variable} = ${value} could not be verified against ${equation}`
      );
    }
  }

  if (allVerified) {
    console.log(
      `[CAS Post-Verify] ✓ Answer verified: ${assignments.map((a) => `${a.variable}=${a.value}`).join(", ")}`
    );
  } else {
    console.log(
      `[CAS Post-Verify] ✗ Verification failed: ${warnings.join("; ")}`
    );
  }

  return { verified: allVerified, warnings, attempted: true };
}
