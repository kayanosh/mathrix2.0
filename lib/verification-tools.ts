/**
 * Deterministic verification tools.
 *
 * These use nerdamer for exact arithmetic/algebra checks that the LLM
 * might get wrong. Used in the verification pipeline to supplement
 * the critic model with tool-level certainty.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const nerdamer = require("nerdamer");
require("nerdamer/Algebra");
require("nerdamer/Calculus");
require("nerdamer/Solve");
require("nerdamer/Extra");
/* eslint-enable @typescript-eslint/no-require-imports */

import type { WhiteboardResponse, EquationStepBlock } from "@/types/whiteboard";

// ── Public interfaces ─────────────────────────────────────────────────────────

export interface ToolCheckResult {
  check: string;
  passed: boolean;
  detail: string;
}

export interface VerificationReport {
  /** Overall pass / fail */
  allPassed: boolean;
  /** Individual check results */
  checks: ToolCheckResult[];
  /** How many checks were run */
  total: number;
  /** How many passed */
  passed: number;
}

// ── Normalisation (shared with cas-solver) ────────────────────────────────────

function normaliseLaTeX(expr: string): string {
  let s = expr.trim();
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");
  s = s.replace(/\\pm/g, "+");
  s = s.replace(/±/g, "+");
  s = s.replace(/−/g, "-");
  s = s.replace(/\\times/g, "*");
  s = s.replace(/\\cdot/g, "*");
  s = s.replace(/\\div/g, "/");
  s = s.replace(/\\pi/g, "pi");
  s = s.replace(/\\text\{[^}]*\}/g, "");
  s = s.replace(/\\(?:left|right)([()[\]])/g, "$1");
  s = s.replace(/\\htmlId\{[^}]+\}\{([^}]+)\}/g, "$1");
  s = s.replace(/\\[a-zA-Z]+\{([^}]+)\}/g, "$1");
  s = s.replace(/\\[a-zA-Z]+/g, "");
  s = s.replace(/(\d)([a-zA-Z(])/g, "$1*$2");
  s = s.replace(/\s+/g, "");
  return s;
}

// ── Individual verification tools ─────────────────────────────────────────────

/**
 * Verify that an arithmetic expression evaluates to the expected result.
 */
export function verifyArithmetic(
  expression: string,
  expectedResult: string
): ToolCheckResult {
  try {
    const exprNorm = normaliseLaTeX(expression);
    const expectedNorm = normaliseLaTeX(expectedResult);

    const actual = parseFloat(nerdamer(exprNorm).evaluate().text());
    const expected = parseFloat(nerdamer(expectedNorm).evaluate().text());

    const passed = Math.abs(actual - expected) < 1e-6;
    return {
      check: `${expression} = ${expectedResult}`,
      passed,
      detail: passed
        ? `Correct: ${actual}`
        : `Expected ${expected}, got ${actual}`,
    };
  } catch (e) {
    return {
      check: `${expression} = ${expectedResult}`,
      passed: false,
      detail: `Could not evaluate: ${(e as Error).message}`,
    };
  }
}

/**
 * Verify that substituting a value into an equation makes both sides equal.
 */
export function verifySubstitution(
  equation: string,
  variable: string,
  value: string
): ToolCheckResult {
  try {
    const eqNorm = normaliseLaTeX(equation);
    const valNorm = normaliseLaTeX(value);
    const [lhs, rhs] = eqNorm.split("=").map((s) => s.trim());
    if (!lhs || !rhs) {
      return { check: `Sub ${variable}=${value} in ${equation}`, passed: false, detail: "No = sign found" };
    }

    const lVal = parseFloat(nerdamer(lhs, { [variable]: valNorm }).evaluate().text());
    const rVal = parseFloat(nerdamer(rhs, { [variable]: valNorm }).evaluate().text());

    const passed = Math.abs(lVal - rVal) < 1e-6;
    return {
      check: `Substituting ${variable}=${value} into ${equation}`,
      passed,
      detail: passed
        ? `LHS=${lVal}, RHS=${rVal} ✓`
        : `LHS=${lVal} ≠ RHS=${rVal}`,
    };
  } catch (e) {
    return {
      check: `Sub ${variable}=${value} in ${equation}`,
      passed: false,
      detail: `Could not verify: ${(e as Error).message}`,
    };
  }
}

/**
 * Verify gradient sign between two points.
 */
export function verifyGradientSign(
  x1: number, y1: number,
  x2: number, y2: number,
  expectedSign: "positive" | "negative"
): ToolCheckResult {
  const gradient = (y2 - y1) / (x2 - x1);
  const actualSign = gradient > 0 ? "positive" : gradient < 0 ? "negative" : "zero";
  const passed = actualSign === expectedSign;
  return {
    check: `Gradient between (${x1},${y1}) and (${x2},${y2}) should be ${expectedSign}`,
    passed,
    detail: `Gradient = ${gradient.toFixed(4)} (${actualSign})`,
  };
}

/**
 * Verify a point lies on a given equation.
 */
export function verifyPointOnCurve(
  equation: string,
  x: number,
  y: number
): ToolCheckResult {
  try {
    const eqNorm = normaliseLaTeX(equation);
    const [lhs, rhs] = eqNorm.split("=").map((s) => s.trim());
    if (!lhs || !rhs) {
      return { check: `Point (${x},${y}) on ${equation}`, passed: false, detail: "No = sign" };
    }

    const lVal = parseFloat(nerdamer(lhs, { x: String(x), y: String(y) }).evaluate().text());
    const rVal = parseFloat(nerdamer(rhs, { x: String(x), y: String(y) }).evaluate().text());

    const passed = Math.abs(lVal - rVal) < 1e-6;
    return {
      check: `(${x}, ${y}) lies on ${equation}`,
      passed,
      detail: passed
        ? `LHS=${lVal}, RHS=${rVal} ✓`
        : `LHS=${lVal} ≠ RHS=${rVal}`,
    };
  } catch (e) {
    return {
      check: `Point (${x},${y}) on ${equation}`,
      passed: false,
      detail: `Could not verify: ${(e as Error).message}`,
    };
  }
}

// ── Step-by-step arithmetic verification ──────────────────────────────────────

/**
 * Walk through equation_steps blocks and verify that each step's
 * latexAfter is arithmetically consistent where possible.
 */
function verifyEquationSteps(block: EquationStepBlock): ToolCheckResult[] {
  const results: ToolCheckResult[] = [];

  for (let i = 0; i < block.steps.length; i++) {
    const step = block.steps[i];
    const after = normaliseLaTeX(step.latexAfter);

    // If this step has an = sign, check both sides are equal
    if (after.includes("=")) {
      const [lhs, rhs] = after.split("=").map((s) => s.trim());
      try {
        // Try evaluating if it's purely numeric (no variables)
        const lVal = nerdamer(lhs).evaluate().text();
        const rVal = nerdamer(rhs).evaluate().text();
        const lNum = parseFloat(lVal);
        const rNum = parseFloat(rVal);

        if (!isNaN(lNum) && !isNaN(rNum)) {
          const passed = Math.abs(lNum - rNum) < 1e-6;
          results.push({
            check: `Step ${step.stepNumber}: ${lhs} = ${rhs}`,
            passed,
            detail: passed
              ? `${lNum} = ${rNum} ✓`
              : `${lNum} ≠ ${rNum}`,
          });
        }
      } catch {
        // Contains variables — can't evaluate numerically, skip
      }
    }
  }

  return results;
}

// ── Main verification function ────────────────────────────────────────────────

/**
 * Run all deterministic tool-based checks on a WhiteboardResponse.
 * These are fast, exact checks that supplement the LLM critic.
 */
export function runToolChecks(data: WhiteboardResponse): VerificationReport {
  const checks: ToolCheckResult[] = [];

  for (const block of data.blocks) {
    if (block.type === "equation_steps") {
      checks.push(...verifyEquationSteps(block));
    }
  }

  const passed = checks.filter((c) => c.passed).length;
  const allPassed = checks.every((c) => c.passed);

  if (checks.length > 0) {
    console.log(
      `[Tool Checks] ${passed}/${checks.length} passed${allPassed ? " ✓" : " ✗"}`
    );
    for (const c of checks.filter((ch) => !ch.passed)) {
      console.log(`  ✗ ${c.check}: ${c.detail}`);
    }
  }

  return { allPassed, checks, total: checks.length, passed };
}
