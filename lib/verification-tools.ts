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

import type { WhiteboardResponse, EquationStepBlock, LabeledShapeBlock, TableBlock } from "@/types/whiteboard";
import { evaluateExact, readMathsExpression } from "@/lib/maths-question";
import { rationalEquals } from "@/lib/maths-value";
import { assignedValues, plain } from "@/lib/answer-text";

/**
 * A plain number, or null if the text is anything else.
 *
 * parseFloat is NOT this. parseFloat("3*x+7") is 3 — it reads the leading
 * digits and ignores the rest — and nerdamer does not throw on an expression it
 * cannot reduce, it hands the expression back. Between them, every line of
 * algebra was "evaluated": 3x + 7 = 25 was checked as 3 = 25 and reported as a
 * failed step, on every equation, so this whole check could never pass one.
 */
function asNumber(text: string): number | null {
  const t = String(text).trim();
  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(t)) return null;
  const value = Number(t);
  return Number.isFinite(value) ? value : null;
}

/** Evaluate to a number, or null when unknowns remain or it cannot be read. */
function evaluateNumber(expression: string, scope?: Record<string, string>): number | null {
  // Nothing is not zero. "\text{Area} = 3 × 2" has no number on its left once
  // the word is taken away, and was being checked as 0 = 6 and failed.
  if (!expression.trim()) return null;
  return asNumber(nerdamer(expression, scope).evaluate().text());
}

// ── Public interfaces ─────────────────────────────────────────────────────────

export interface ToolCheckResult {
  check: string;
  passed: boolean;
  detail: string;
  /**
   * A failure that is certain: the numbers on the board contradict each other.
   * The answer is sent back to be corrected, with `detail` as the reason, even
   * if the reviewing model passed it.
   */
  decisive?: boolean;
}

export interface VerificationReport {
  /** Overall pass / fail */
  allPassed: boolean;
  /** Whether any check was applicable at all. `allPassed` is vacuously true when not. */
  ran: boolean;
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
  // A unit goes with its power: "40\text{ cm}^2" is 40, and was read as 40².
  s = s.replace(/\\,|\;|\\!/g, "");
  s = s.replace(/\\text\{[^}]*\}(?:\s*\^\s*\{?\s*[23]\s*\}?)?/g, "");
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

    const actual = evaluateNumber(exprNorm);
    const expected = evaluateNumber(expectedNorm);
    if (actual === null || expected === null) {
      return {
        check: `${expression} = ${expectedResult}`,
        passed: false,
        detail: "Could not evaluate: not a plain number",
      };
    }

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

    const lVal = evaluateNumber(lhs, { [variable]: valNorm });
    const rVal = evaluateNumber(rhs, { [variable]: valNorm });
    if (lVal === null || rVal === null) {
      return {
        check: `Sub ${variable}=${value} in ${equation}`,
        passed: false,
        detail: "Could not verify: not a plain number after substitution",
      };
    }

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

    const lVal = evaluateNumber(lhs, { x: String(x), y: String(y) });
    const rVal = evaluateNumber(rhs, { x: String(x), y: String(y) });
    if (lVal === null || rVal === null) {
      return {
        check: `Point (${x},${y}) on ${equation}`,
        passed: false,
        detail: "Could not verify: not a plain number after substitution",
      };
    }

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

    // A purely numeric line ("25 - 7 = 18"): both sides must be equal. A line
    // with an unknown in it is not a statement about numbers, and is checked
    // by verifyStepsAgainstAnswer below instead.
    if (after.includes("=")) {
      const [lhs, rhs] = after.split("=").map((s) => s.trim());
      try {
        const lNum = evaluateNumber(lhs);
        const rNum = evaluateNumber(rhs);

        if (lNum !== null && rNum !== null) {
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
        // Unreadable — skip
      }
    }
  }

  return results;
}

/**
 * Check every line of an equation's working against the answer it arrives at.
 *
 * If the working ends at x = 6, then x = 6 must make each earlier line true:
 * 3x + 7 = 25, 3x = 25 − 7, 3x = 18. A slip in the middle (3x = 19) is a line
 * the final answer does not satisfy. Uses exact fractions, and only lines that
 * are a single equation in the one unknown; anything else is left alone.
 *
 * With two roots, a line passes if at least one root satisfies it, because
 * working legitimately splits into a branch per root (x − 6 = 0 | x + 1 = 0).
 *
 * This checks that the working is CONSISTENT, not that the question was read
 * correctly — that is what the CAS checks are for.
 */
function verifyStepsAgainstAnswer(block: EquationStepBlock): ToolCheckResult[] {
  if (block.steps.length < 2) return [];

  const lines = block.steps.map((step) => {
    const text = plain(step.latexAfter || "");
    const parts = text.split("=");
    const lhs = parts.length === 2 ? readMathsExpression(parts[0]) : null;
    const rhs = parts.length === 2 ? readMathsExpression(parts[1]) : null;
    return { stepNumber: step.stepNumber, text, lhs, rhs };
  });

  const unknowns = new Set<string>();
  for (const line of lines) {
    for (const name of [...(line.lhs?.variables ?? []), ...(line.rhs?.variables ?? [])]) {
      unknowns.add(name);
    }
  }
  if (unknowns.size !== 1) return [];
  const [variable] = [...unknowns];

  const roots = assignedValues(lines[lines.length - 1].text, variable);
  if (roots === "unreadable" || roots.length === 0) return [];

  const results: ToolCheckResult[] = [];
  // The last line is the answer itself; it cannot fail to satisfy itself.
  for (const line of lines.slice(0, -1)) {
    if (!line.lhs || !line.rhs) continue;
    let evaluated = false;
    let satisfied = false;
    for (const root of roots) {
      const scope = { [variable]: root };
      const left = evaluateExact(line.lhs.expression, scope);
      const right = evaluateExact(line.rhs.expression, scope);
      if (!left || !right) continue;
      evaluated = true;
      if (rationalEquals(left, right)) satisfied = true;
    }
    if (!evaluated) continue;
    results.push({
      check: `Step ${line.stepNumber} holds for the final answer: ${line.text}`,
      passed: satisfied,
      detail: satisfied
        ? `True for the ${variable} found ✓`
        : `Not true for the ${variable} the working ends on`,
    });
  }
  return results;
}

// ── Geometry verification tools ───────────────────────────────────────────────

/**
 * Verify that angles in a labeled_shape triangle sum to 180°.
 */
function verifyTriangleAngleSum(block: LabeledShapeBlock): ToolCheckResult[] {
  const results: ToolCheckResult[] = [];

  if (block.shape !== "triangle" || !block.angles || block.angles.length === 0) {
    return results;
  }

  // An angle the question asks for is on the drawing too, as "x" with no size.
  // It is not an angle of zero degrees, and a triangle with one still to find
  // does not add up to 180 yet.
  const toFind = (a: { degrees: number; label: string }) =>
    a.degrees === 0 || /[a-z?]/i.test(String(a.label ?? "").replace(/°|deg(?:rees)?/gi, ""));
  if (block.angles.some(toFind)) return results;

  // Only check if all 3 angles are given (fully solved)
  if (block.angles.length === 3) {
    const sum = block.angles.reduce((acc, a) => acc + a.degrees, 0);
    const passed = Math.abs(sum - 180) < 0.5;
    results.push({
      check: `Triangle angle sum: ${block.angles.map((a) => `${a.label}=${a.degrees}°`).join(" + ")}`,
      passed,
      detail: passed
        ? `Sum = ${sum}° = 180° ✓`
        : `Sum = ${sum}° ≠ 180°`,
    });
  }

  // Check no individual angle is negative or >= 180
  for (const a of block.angles) {
    if (a.degrees <= 0 || a.degrees >= 180) {
      results.push({
        check: `Triangle angle validity: ${a.label}`,
        passed: false,
        detail: `Angle ${a.label} = ${a.degrees}° is invalid (must be 0° < angle < 180°)`,
      });
    }
  }

  return results;
}

/**
 * Verify Pythagoras' theorem on a triangle with a right angle.
 * Checks that a² + b² = c² where c is the hypotenuse.
 */
function verifyPythagorasOnShape(block: LabeledShapeBlock): ToolCheckResult[] {
  const results: ToolCheckResult[] = [];

  if (block.shape !== "triangle") return results;

  // Check if there's a right angle
  // The right angle has to be at one of the triangle's own corners. The right
  // angle where a height meets the base is not one, and an isosceles triangle
  // with sides 10, 10 and 12 and its height drawn was failed for 10² + 10² ≠ 12².
  const corners = new Set((block.vertices ?? []).map((v) => v.label));
  const hasRightAngle = block.angles?.some(
    (a) => (a.isRightAngle || Math.abs(a.degrees - 90) < 0.5) && (corners.size === 0 || corners.has(a.vertex)),
  );
  if (!hasRightAngle) return results;

  // Need all 3 sides with numeric labels
  if (!block.sides || block.sides.length < 3) return results;

  const sideLengths: number[] = [];
  for (const s of block.sides) {
    // A height is not one of the three sides.
    if (/height|perpendicular/i.test(s.label)) continue;
    if (corners.size > 0 && !(corners.has(s.from) && corners.has(s.to))) continue;
    const num = parseFloat(s.label.replace(/\s*(?:cm|m|mm|km)\s*/i, ""));
    if (!isNaN(num) && num > 0) {
      sideLengths.push(num);
    }
  }

  if (sideLengths.length < 3) return results;

  // Sort so the largest is the hypotenuse
  sideLengths.sort((a, b) => a - b);
  const [a, b, c] = sideLengths;
  const lhs = a * a + b * b;
  const rhs = c * c;
  const passed = Math.abs(lhs - rhs) < 0.01;

  results.push({
    check: `Pythagoras check: ${a}² + ${b}² = ${c}²`,
    passed,
    detail: passed
      ? `${lhs} = ${rhs} ✓`
      : `${a}² + ${b}² = ${lhs}, but ${c}² = ${rhs}`,
  });

  return results;
}

/**
 * Verify quadrilateral angles sum to 360°.
 */
function verifyQuadrilateralAngleSum(block: LabeledShapeBlock): ToolCheckResult[] {
  const results: ToolCheckResult[] = [];
  const quadShapes = ["rectangle", "parallelogram", "trapezium"];

  if (!quadShapes.includes(block.shape) || !block.angles) return results;

  if (block.angles.length === 4) {
    const sum = block.angles.reduce((acc, a) => acc + a.degrees, 0);
    const passed = Math.abs(sum - 360) < 0.5;
    results.push({
      check: `Quadrilateral angle sum: ${block.angles.map((a) => `${a.degrees}°`).join(" + ")}`,
      passed,
      detail: passed
        ? `Sum = ${sum}° = 360° ✓`
        : `Sum = ${sum}° ≠ 360°`,
    });
  }

  return results;
}

/**
 * Scan equation_steps for geometry-specific arithmetic patterns
 * and verify the calculations.
 */
function verifyGeometryArithmetic(block: EquationStepBlock): ToolCheckResult[] {
  const results: ToolCheckResult[] = [];

  for (const step of block.steps) {
    const after = step.latexAfter;
    const rule = (step.rule || "").toLowerCase();
    const explanation = (step.explanation || "").toLowerCase();

    // Pythagoras pattern: detect √(a² + b²) or √(c² - a²) in steps
    const pythagorasCalc = after.match(
      /\\sqrt\{?\s*(\d+\.?\d*)\s*\^?\s*2?\s*[+]\s*(\d+\.?\d*)\s*\^?\s*2?\s*\}?/
    );
    if (pythagorasCalc || /pythagoras/i.test(rule)) {
      // Try to verify the numeric result
      const numAfter = normaliseLaTeX(after);
      if (numAfter.includes("=")) {
        const [, rhs] = numAfter.split("=").map((s) => s.trim());
        try {
          const val = evaluateNumber(rhs);
          if (val !== null && val > 0) {
            // Looks like a computed result — check if positive
            results.push({
              check: `Pythagoras result: step ${step.stepNumber}`,
              passed: val > 0,
              detail: `Result = ${val.toFixed(4)} (positive ✓)`,
            });
          }
        } catch {
          // Can't evaluate — skip
        }
      }
    }

    // Area formula check: if explanation mentions "area" and step has multiplication
    if (/area/i.test(explanation) && after.includes("=")) {
      const numAfter = normaliseLaTeX(after);
      const [lhs, rhs] = numAfter.split("=").map((s) => s.trim());
      try {
        const lVal = evaluateNumber(lhs);
        const rVal = evaluateNumber(rhs);
        if (lVal !== null && rVal !== null) {
          const passed = Math.abs(lVal - rVal) < 0.01;
          results.push({
            check: `Area calculation: step ${step.stepNumber}`,
            passed,
            detail: passed
              ? `${lVal} = ${rVal} ✓`
              : `${lVal} ≠ ${rVal}`,
          });
        }
      } catch {
        // Can't evaluate — skip
      }
    }
  }

  return results;
}

// ── Checks added after testing photo questions ───────────────────────────────

const plainNumber = (cell: string): number | null => {
  const text = String(cell ?? "").replace(/[$,\s]/g, "");
  return /^-?\d+(?:\.\d+)?$/.test(text) ? Number(text) : null;
};

/**
 * The mean from a frequency table, against the mean in the answer.
 *
 * A photo of a table (scores 1 to 4, frequencies 3, 5, 8, 4) was read and
 * multiplied out correctly, 53 over 20, and then answered "2.6". The mean is
 * 2.65. Nothing checked the last line against the table it sat under.
 */
function verifyFrequencyTableMean(block: TableBlock, conclusion: string): ToolCheckResult[] {
  if (!/\bmean\b/i.test(conclusion)) return [];
  const freq = block.headers.findIndex((h) => /freq/i.test(h));
  const value = block.headers.findIndex((h, i) => i !== freq && !/f\s*(?:\\times|×|x|\*)\s*x|\bfx\b|product|total/i.test(h));
  if (freq < 0 || value < 0) return [];

  let sumF = 0;
  let sumFx = 0;
  for (const row of block.rows) {
    const x = plainNumber(row[value]);
    const f = plainNumber(row[freq]);
    // A totals row, or a grouped table (10–20) that needs midpoints: not this check.
    if (x === null || f === null) {
      if (/total|sum/i.test(row.join(" "))) continue;
      return [];
    }
    sumF += f;
    sumFx += f * x;
  }
  if (sumF <= 0) return [];
  const mean = sumFx / sumF;

  // The sentence may hold other numbers ("to 1 decimal place", "of the 20
  // students"). A mean is nearly always a decimal, so decimals are looked at
  // first, and whole numbers only when there are none.
  const numbers = conclusion.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/g) ?? [];
  const decimals = numbers.filter((n) => n.includes("."));
  const candidates = decimals.length > 0 ? decimals : numbers;
  if (candidates.length === 0) return [];

  // Right if it is the mean, or the mean correctly rounded to the places given.
  const matches = (text: string) => {
    const value = Number(text);
    const places = (text.split(".")[1] ?? "").length;
    const rounded = Math.round((mean + Number.EPSILON) * 10 ** places) / 10 ** places;
    return Math.abs(value - mean) < 1e-9 || Math.abs(value - rounded) < 1e-9;
  };
  const passed = candidates.some(matches);
  const stated = candidates[0];
  return [
    {
      check: "Mean from the frequency table",
      passed,
      decisive: !passed,
      detail: passed
        ? `${sumFx} ÷ ${sumF} = ${Number(mean.toFixed(4))} ✓`
        : `the table gives ${sumFx} ÷ ${sumF} = ${Number(mean.toFixed(4))}, but the answer says ${stated}. Do not round unless the question asks.`,
    },
  ];
}

/**
 * The six sides of an L-shape, as read, have to fit together.
 *
 * Going round an L-shape the sides alternate across and down. The longest side
 * across is the other two added together, and the same for the sides going
 * down. A photo of an L-shape (10, 4, 4, 4, 6, 8) was read as 10, 4, 4, 6, 8,
 * 8, which cannot be drawn, and the area came out as 72 instead of 64.
 */
function verifyLShapeSides(block: LabeledShapeBlock): ToolCheckResult[] {
  if ((block.vertices?.length ?? 0) !== 6 || (block.sides?.length ?? 0) !== 6) return [];
  const order = block.vertices!.map((v) => v.label);
  const lengths: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = order[i];
    const b = order[(i + 1) % 6];
    const side = block.sides!.find((s) => (s.from === a && s.to === b) || (s.from === b && s.to === a));
    const found = side?.label.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
    if (!found) return [];
    lengths.push(Number(found[0]));
  }
  const fits = (three: number[]) => {
    const [big, ...rest] = [...three].sort((p, q) => q - p);
    return Math.abs(big - (rest[0] + rest[1])) < 1e-9;
  };
  const across = [lengths[0], lengths[2], lengths[4]];
  const down = [lengths[1], lengths[3], lengths[5]];
  const passed = fits(across) && fits(down);
  return [
    {
      check: "L-shape sides fit together",
      passed,
      decisive: !passed,
      detail: passed
        ? `${across.join(", ")} across and ${down.join(", ")} down ✓`
        : `the side lengths read from the shape (${lengths.join(", ")} going round) cannot make an L-shape: the longest side one way must equal the other two that way added together. Read each label on the diagram again and match it to its own side.`,
    },
  ];
}

/**
 * Each step of working with a formula in it must keep its value.
 *
 * "Area = ½ × (10 + 6) × 4" becoming "Area = ½ × 16 × 4" becoming "Area = 32"
 * is three lines that must all be worth the same. The existing checks only
 * read a line that is numbers on both sides, so working written the way a
 * formula is used, with "Area =" or "c² =" on one side, was never checked at
 * all. That is every area, volume, Pythagoras and trigonometry answer, and it
 * is why correct shape answers were shown with the red "not verified" badge:
 * nothing had been able to check them.
 *
 * A later line may be the earlier one rounded (153.938… then 153.9).
 */
function verifyWorkingKeepsItsValue(block: EquationStepBlock): ToolCheckResult[] {
  const sides = (raw: string | undefined) => {
    if (!raw) return null;
    const latex = raw
      .replace(/\\approx|≈/g, "=")
      // sin 35° is the sine of 35 degrees. Models also write the degree sign as
      // a raised 0 or o.
      .replace(
        /\\(sin|cos|tan)\s*\(?\s*(\d+(?:\.\d+)?)\s*(?:\^\s*\{?\s*(?:\\circ|0|o)\s*\}?|°)\s*\)?/g,
        "$1($2*pi/180)",
      );
    // A line with no "=" at all is one expression: "80 - 12", then "68".
    if (!latex.includes("=")) {
      const lone = latex.replace(/\\text\{[^}]*\}(?:\s*\^\s*\{?[23]\}?)?/g, "").trim();
      if (!lone || /\d\s*\\[dt]?frac/.test(lone) || /[a-zA-Z]/.test(lone.replace(/\\(?:frac|times|div|cdot|sqrt|pi|left|right)|sin|cos|tan|pi/g, ""))) return null;
      let only: number | null = null;
      try {
        only = evaluateNumber(normaliseLaTeX(lone).replace(/[{}]/g, ""));
      } catch {
        only = null;
      }
      return only === null ? null : { left: "", right: lone.replace(/\s+/g, ""), leftValue: null, rightValue: only };
    }
    if ((latex.match(/=/g) ?? []).length !== 1) return null;
    // Units and words are not part of the sum.
    const [left, right] = latex
      .replace(/\\htmlId\{[^}]*\}/g, "")
      .replace(/\\textcolor\{[^}]*\}/g, "")
      .replace(/\\,|\;|\\!|\\ /g, " ")
      .split("=");
    const value = (side: string) => {
      const stripped = side.replace(/\\text\{[^}]*\}(?:\s*\^\s*\{?[23]\}?)?/g, "").trim();
      // A whole number then a fraction is a mixed number, which this reader
      // would multiply. Leave those lines alone.
      if (/\d\s*\\[dt]?frac/.test(stripped)) return null;
      if (!stripped || /[a-zA-Z]/.test(stripped.replace(/\\(?:frac|times|div|cdot|sqrt|pi|left|right)|sin|cos|tan|pi/g, ""))) return null;
      try {
        return evaluateNumber(normaliseLaTeX(stripped).replace(/[{}]/g, ""));
      } catch {
        return null;
      }
    };
    return { left: left.replace(/\s+/g, ""), right: right.replace(/\s+/g, ""), leftValue: value(left), rightValue: value(right) };
  };
  const same = (earlier: number, later: number, laterText: string) => {
    if (Math.abs(earlier - later) < 1e-6 * Math.max(1, Math.abs(earlier))) return true;
    const places = (laterText.match(/\.(\d+)/)?.[1] ?? "").length;
    const rounded = Math.round((earlier + Number.EPSILON) * 10 ** places) / 10 ** places;
    return Math.abs(rounded - later) < 1e-9;
  };

  const results: ToolCheckResult[] = [];
  for (const step of block.steps) {
    const before = sides(step.latexBefore);
    const after = sides(step.latexAfter);
    if (!before || !after) continue;
    // The same thing is being worked out on both lines: "Area =" or "= c²".
    let pair: [number, number, string] | null = null;
    if (before.left === after.left && before.leftValue === null && before.rightValue !== null && after.rightValue !== null) {
      pair = [before.rightValue, after.rightValue, after.right];
    } else if (before.right === after.right && before.rightValue === null && before.leftValue !== null && after.leftValue !== null) {
      pair = [before.leftValue, after.leftValue, after.left];
    }
    if (!pair || before.left + before.right === after.left + after.right) continue;
    const passed = same(pair[0], pair[1], pair[2]);
    results.push({
      check: `Step ${step.stepNumber} keeps its value`,
      passed,
      detail: passed
        ? `${Number(pair[0].toFixed(4))} → ${Number(pair[1].toFixed(4))} ✓`
        : `the line before is worth ${Number(pair[0].toFixed(4))} but the line after says ${Number(pair[1].toFixed(4))}`,
    });
  }
  return results;
}

/**
 * The area or perimeter of an L-shape on the board, against the answer given.
 * The shape is four numbers, so its area is not a matter of opinion.
 */
function verifyLShapeAnswer(block: LabeledShapeBlock, conclusion: string): ToolCheckResult[] {
  const r = block.rectilinear;
  if (block.shape !== "rectilinear" || !r) return [];
  const wantsArea = /\barea\b/i.test(conclusion);
  const wantsPerimeter = /\bperimeter\b/i.test(conclusion);
  if (wantsArea === wantsPerimeter) return [];
  const exact = wantsArea ? r.width * r.height - r.notchWidth * r.notchHeight : 2 * (r.width + r.height);
  const stated = conclusion
    .replace(/(?:mm|cm|km|m)\s*(?:²|³|\^\s*\{?\s*[23]\s*\}?)/g, " ")
    .match(/-?\d+(?:\.\d+)?/g)
    ?.map(Number);
  if (!stated?.length) return [];
  const passed = stated.some((n) => Math.abs(n - exact) < 1e-9);
  return [
    {
      check: `L-shape ${wantsArea ? "area" : "perimeter"} matches the drawing`,
      passed,
      decisive: !passed,
      detail: passed
        ? `${exact} ✓`
        : `the shape drawn has ${wantsArea ? "an area" : "a perimeter"} of ${exact}, but the answer says ${stated.join(", ")}`,
    },
  ];
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
      checks.push(...verifyStepsAgainstAnswer(block));
      checks.push(...verifyGeometryArithmetic(block));
      checks.push(...verifyWorkingKeepsItsValue(block));
    }
    if (block.type === "table") {
      checks.push(...verifyFrequencyTableMean(block, data.conclusion || ""));
    }
    if (block.type === "labeled_shape") {
      checks.push(...verifyLShapeSides(block));
      checks.push(...verifyLShapeAnswer(block, data.conclusion || ""));
      checks.push(...verifyTriangleAngleSum(block));
      checks.push(...verifyPythagorasOnShape(block));
      checks.push(...verifyQuadrilateralAngleSum(block));
    }
  }

  const passed = checks.filter((c) => c.passed).length;
  // NOTE the empty case: [].every() === true, so a response with NO applicable
  // check used to report allPassed === true and was then counted as a passing
  // verification SOURCE — i.e. "we checked nothing" scored the same as "we
  // checked and it was right". `ran` makes the distinction explicit so callers
  // cannot accidentally treat silence as agreement.
  const allPassed = checks.every((c) => c.passed);

  if (checks.length > 0) {
    console.log(
      `[Tool Checks] ${passed}/${checks.length} passed${allPassed ? " ✓" : " ✗"}`
    );
    for (const c of checks.filter((ch) => !ch.passed)) {
      console.log(`  ✗ ${c.check}: ${c.detail}`);
    }
  }

  return { allPassed, ran: checks.length > 0, checks, total: checks.length, passed };
}
