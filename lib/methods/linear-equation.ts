/**
 * Deterministic linear-equation builder: ax + b = c with term-transfer arrows.
 */

import type { EquationStep, EquationStepBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export interface LinearProblem {
  variable: string;
  a: number;
  b: number;
  c: number;
}

function signedTerm(n: number, withPlus = true): string {
  if (n === 0) return "0";
  if (n > 0) return withPlus ? `+ ${n}` : String(n);
  return `- ${Math.abs(n)}`;
}

function latexLinear(a: number, b: number, v: string): string {
  const coeff =
    a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`;
  if (b === 0) return coeff;
  return `${coeff} ${signedTerm(b)}`;
}

function plainLinear(a: number, b: number, v: string, c: number): string {
  return `${latexLinear(a, b, v)} = ${c}`.replace(/\\/g, "");
}

/**
 * Kill floating-point dust. 2/3 parses to 0.6666666666666666, so 4 ÷ (2/3)
 * lands on 6.000000000000001 — and this builder's output is shown to a child as
 * the answer. Twelve significant figures is well inside double precision and
 * well outside anything a GCSE question needs.
 */
function tidy(n: number): number {
  return Number(n.toPrecision(12));
}

/** One side of the equation, as `a·x + b`. */
interface LinearSide {
  a: number;
  b: number;
}

/**
 * Parse one side into `a·x + b`, or null if ANY of it is not understood.
 *
 * Full consumption is the whole point. The previous implementation matched a
 * regex anywhere in the string, so "4x + 3 = 2x + 11" matched the *substring*
 * "4x + 3 = 2" and silently answered a different equation. Here every character
 * must belong to a recognised term, or the parse fails.
 */
function parseLinearSide(raw: string, variable: string): LinearSide | null {
  // Collapse fractions to decimals first: normalizeMathText turns \frac{2}{3}
  // into (2)/(3), and a bare "2/3 x" is just as common in typed input.
  let text = raw
    .replace(/\((-?\d+(?:\.\d+)?)\)\s*\/\s*\((-?\d+(?:\.\d+)?)\)/g, (_m, n, d) =>
      Number(d) === 0 ? "NaN" : String(Number(n) / Number(d)),
    )
    .replace(/(?<![\d.])(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g, (_m, n, d) =>
      Number(d) === 0 ? "NaN" : String(Number(n) / Number(d)),
    )
    .replace(/\s+/g, "");

  if (!text) return null;
  // Brackets survive only if a fraction failed to collapse, or the question has
  // a bracketed expression like 3(x+2) — which this builder cannot expand, so it
  // declines rather than mis-reading it.
  if (/[()]/.test(text) || text.includes("NaN")) return null;

  let a = 0;
  let b = 0;
  let consumed = 0;
  let sawTerm = false;
  // A signed term: an optional coefficient with the variable, or a bare number.
  // Groups: sign | coeff? var (/divisor)? | bare number
  const term =
    /([+-]?)(?:(\d+(?:\.\d+)?)?\*?([a-zA-Z])(?:\/(\d+(?:\.\d+)?))?|(\d+(?:\.\d+)?))/g;
  let m: RegExpExecArray | null;
  while ((m = term.exec(text)) !== null) {
    if (m.index !== consumed) return null; // a gap means something unparsed
    consumed = m.index + m[0].length;
    if (m[0] === "") return null; // zero-width match: bail rather than loop
    const sign = m[1] === "-" ? -1 : 1;
    if (m[3] !== undefined) {
      if (m[3] !== variable) return null; // a second unknown — not linear in one variable
      const coeff = m[2] === undefined ? 1 : Number(m[2]);
      // "x/3" and "2x/3" are ordinary GCSE forms; a zero divisor is not.
      const divisor = m[4] === undefined ? 1 : Number(m[4]);
      if (!Number.isFinite(coeff) || !Number.isFinite(divisor) || divisor === 0) {
        return null;
      }
      a += (sign * coeff) / divisor;
    } else {
      const value = Number(m[5]);
      if (!Number.isFinite(value)) return null;
      b += sign * value;
    }
    sawTerm = true;
  }
  if (!sawTerm || consumed !== text.length) return null;
  // Deliberately NOT tidied here: rounding a coefficient BEFORE the division
  // loses precision rather than gaining it (tidying 2/3 to 0.666666666667 makes
  // 4 ÷ it land on 5.999999999997). The answer is tidied at the point of
  // division instead.
  return { a, b };
}

/**
 * Parse a single-variable linear equation into `a·x + b = c`.
 *
 * Returns null — deliberately and often — rather than risk a wrong answer. This
 * builder OVERRIDES the language model's answer on the solve path, so a
 * mis-parse does not merely produce a worse explanation: it replaces a correct
 * answer with an incorrect one, draws confident arrows on it, and (because the
 * CAS post-check re-reads the equation from the board the builder just wrote)
 * gets it stamped "verified".
 *
 * Measured before this rewrite, all four of these were shown to students:
 *   4x + 3 = 2x + 11  ->  x = -0.25   (correct: 4)
 *   7 - 2x = 1        ->  x = 0.5     (correct: 3)
 *   0.5x + 1 = 4      ->  x = 0.6     (correct: 6)
 *   2/3 x = 4         ->  x = 1.33    (correct: 6)
 *
 * The same "decline rather than guess" rule was written into the KS2 answer
 * layer after five wrong-answer defects (see reasonToDeclineNumericAnswer in
 * lib/ks2-maths-accuracy.ts); it had never been applied to algebra.
 */
export function parseLinearEquation(text: string): LinearProblem | null {
  const normalized = normalizeMathText(text)
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    .replace(/²/g, "^2");

  // Powers, inequalities and multi-equation input are all out of scope.
  if (/\^\s*[2-9]|²/.test(normalized)) return null;
  if (/[<>≤≥]/.test(normalized)) return null;

  // Strip the instruction words so "Solve 3x + 5 = 20 for x" reduces to the
  // equation itself; anything left that is not part of the equation will fail
  // full consumption below.
  const stripped = normalized
    // "for x" must go as a UNIT. Removing just the word "for" leaves a stray
    // "x" that then reads as a second unknown on the right-hand side, so
    // "Solve 3x + 5 = 20 for x" was declined as unknowns-both-sides.
    .replace(/\bfor\s+(?:the\s+(?:variable|value\s+of)\s+)?[a-zA-Z]\b/gi, " ")
    .replace(/\b(?:solve|simplify|find|calculate|work\s+out|determine|hence)\b/gi, " ")
    .replace(/[.,;:?]+\s*$/, "")
    .trim();

  const sides = stripped.split("=");
  if (sides.length !== 2) return null;

  // Exactly one unknown, and it must be a single letter.
  const letters = [...new Set(stripped.replace(/[^a-zA-Z]/g, "").split(""))];
  if (letters.length !== 1) return null;
  const variable = letters[0];

  let left = parseLinearSide(sides[0], variable);
  let right = parseLinearSide(sides[1], variable);
  if (!left || !right) return null;

  // "5 = 2x + 1" is the same equation written the other way round, and writing
  // it as "2x + 1 = 5" is what a teacher does at the board. Safe to swap; this
  // is NOT the unknowns-both-sides case, which is declined below.
  if (left.a === 0 && right.a !== 0) {
    [left, right] = [right, left];
  }

  // Collect the unknown on the left and the constants on the right.
  const a = left.a - right.a;
  const b = left.b;
  const c = right.b;

  // No unknown left (0 = 0, or 3 = 5) — not a linear equation to solve.
  if (a === 0) return null;

  // Unknowns on BOTH sides are declined for now. The value is correct either
  // way, but this builder's steps would jump straight to the collected form and
  // silently skip the "subtract 2x from both sides" move — which is exactly the
  // step a GCSE student needs to see, and the arrow that shows it. Better the
  // model teaches it in full than that we teach it with a step missing.
  if (right.a !== 0) return null;

  if (![a, b, c].every(Number.isFinite)) return null;
  return { variable, a, b, c };
}

export function buildLinearEquation(problem: LinearProblem): MethodBuildResult {
  const { variable: v, a, b, c } = problem;
  if (a === 0) throw new Error("coefficient of variable cannot be zero");

  const steps: EquationStep[] = [];
  const teachingSteps: TeachingStep[] = [];
  let stepNumber = 1;

  const start = `${latexLinear(a, b, v)} = ${c}`;
  // tidy(): 2/3 is 0.6666666666666666 as a double, so 4 ÷ it is
  // 6.000000000000001 — and this value is shown to a child as the answer.
  const solution = tidy((c - b) / a);
  if (!Number.isFinite(solution)) throw new Error("no finite solution");

  const pushTeaching = (
    title: string,
    explanation: string,
    narration: string,
    why?: string,
    showAnswer?: boolean,
  ) => {
    teachingSteps.push({
      title,
      explanation,
      why,
      narration,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer,
    });
  };

  // Step 1 — state
  steps.push({
    stepNumber: stepNumber++,
    operationLabel: "Starting equation",
    explanation: `Here's what we're working with. Our mission: get $${v}$ on its own.`,
    latexBefore: start,
    latexAfter: start,
    arrowDirection: "both_sides",
  });
  pushTeaching(
    "Starting equation",
    `Start with ${plainLinear(a, b, v, c)}.`,
    `Let's solve ${plainLinear(a, b, v, c)}. We need to get ${v} on its own.`,
  );

  if (b !== 0) {
    const inv = -b;
    const opWord = b > 0 ? "Subtract" : "Add";
    const opAbs = Math.abs(b);
    const balance = b > 0 ? `-${opAbs}` : `+${opAbs}`;
    const toLatex = inv > 0 ? `+ ${inv}` : `- ${Math.abs(inv)}`;

    const beforeTagged =
      b > 0
        ? `${a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`} + \\htmlId{arrow-1-from}{${b}} = ${c}`
        : `${a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`} - \\htmlId{arrow-1-from}{${Math.abs(b)}} = ${c}`;

    const afterTagged = `${a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`} = ${c} \\htmlId{arrow-1-to}{${toLatex}}`;

    steps.push({
      stepNumber: stepNumber++,
      operationLabel: `${opWord} ${opAbs} from both sides`,
      explanation: `That $${signedTerm(b, false).replace(" ", "")}$ is in the way — ${opWord.toLowerCase()} $${opAbs}$ on both sides so it cancels. Watch the arrow!`,
      rule: "Inverse operations",
      why:
        b > 0
          ? "Subtracting undoes the addition, isolating the term with the variable."
          : "Adding undoes the subtraction, isolating the term with the variable.",
      latexBefore: beforeTagged,
      latexAfter: afterTagged,
      arrowDirection: "both_sides",
      arrows: [
        {
          id: "arrow-1",
          label: `${opWord} ${opAbs}`,
          fromTerm: b > 0 ? `+${b}` : `${b}`,
          toTerm: inv > 0 ? `+${inv}` : `${inv}`,
          style: "curly",
          signRule:
            b > 0
              ? "adding becomes subtracting"
              : "subtracting becomes adding",
        },
      ],
      balanceNotation: balance,
    });
    pushTeaching(
      `${opWord} ${opAbs}`,
      `${opWord} ${opAbs} from both sides to isolate the ${v} term.`,
      `${opWord} ${opAbs} from both sides.`,
      "Inverse operations keep the equation balanced.",
    );

    const right = c - b;
    steps.push({
      stepNumber: stepNumber++,
      operationLabel: "Simplify the right side",
      explanation: `Quick arithmetic: $${c} ${signedTerm(-b)} = ${right}$.`,
      latexBefore: `${a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`} = ${c} ${signedTerm(-b)}`,
      latexAfter: `${a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`} = ${right}`,
      arrowDirection: "simplify",
    });
    pushTeaching(
      "Simplify",
      `The right side becomes ${right}.`,
      `${c} ${signedTerm(-b)} equals ${right}.`,
    );
  }

  const rightNow = c - b;

  if (a !== 1) {
    if (a === -1) {
      // Multiply both sides by -1
      steps.push({
        stepNumber: stepNumber++,
        operationLabel: "Multiply both sides by −1",
        explanation: `There's a minus in front of $${v}$. Multiply both sides by $-1$ to flip the sign.`,
        rule: "Inverse operations",
        why: "Multiplying by −1 undoes the leading minus.",
        latexBefore: `\\htmlId{arrow-2-from}{-${v}} = ${rightNow}`,
        latexAfter: `${v} = \\htmlId{arrow-2-to}{${-rightNow}}`,
        arrowDirection: "both_sides",
        arrows: [
          {
            id: "arrow-2",
            label: "× (−1)",
            fromTerm: `-${v}`,
            toTerm: String(-rightNow),
            style: "curly",
            signRule: "multiply both sides by −1",
          },
        ],
        balanceNotation: "\\times (-1)",
      });
      pushTeaching(
        "Multiply by −1",
        `Multiply both sides by −1 to get ${v} = ${-rightNow}.`,
        `Multiply both sides by negative one.`,
      );
    } else {
      steps.push({
        stepNumber: stepNumber++,
        operationLabel: `Divide both sides by ${a}`,
        explanation: `$${v}$ is being multiplied by $${a}$, so divide both sides by $${a}$ to free it.`,
        rule: "Inverse operations",
        why: "Dividing undoes the multiplication, leaving the variable on its own.",
        latexBefore: `\\htmlId{arrow-2-from}{${a}}${v} = ${rightNow}`,
        latexAfter: `${v} = \\htmlId{arrow-2-to}{\\frac{${rightNow}}{${a}}}`,
        arrowDirection: "both_sides",
        arrows: [
          {
            id: "arrow-2",
            label: `Divide by ${a}`,
            fromTerm: `\\times ${a}`,
            toTerm: `\\div ${a}`,
            style: "curly",
            signRule: "multiplying becomes dividing",
          },
        ],
        balanceNotation: `\\div ${a}`,
      });
      pushTeaching(
        `Divide by ${a}`,
        `Divide both sides by ${a}.`,
        `Divide both sides by ${a} to get ${v} on its own.`,
        "Dividing undoes multiplying.",
      );

      const simplified =
        Number.isInteger(solution) ? String(solution) : `\\frac{${rightNow}}{${a}}`;
      if (!Number.isInteger(solution) || rightNow / a !== rightNow) {
        // always add simplify when we showed a fraction, or when integer
        steps.push({
          stepNumber: stepNumber++,
          operationLabel: "Simplify",
          explanation: Number.isInteger(solution)
            ? `$${rightNow} \\div ${a} = ${solution}$. And we're done!`
            : `Leave as a fraction in simplest form: $${simplified}$.`,
          selfCheck: `Check: $${a}(${Number.isInteger(solution) ? solution : simplified}) ${signedTerm(b)} = ${c}$ ✓`,
          latexBefore: `${v} = \\frac{${rightNow}}{${a}}`,
          latexAfter: `${v} = \\htmlId{mark-1}{${Number.isInteger(solution) ? solution : simplified}}`,
          arrowDirection: "simplify",
          marks: [
            {
              targetId: "mark-1",
              style: "circle",
              label: "the answer",
            },
          ],
        });
        pushTeaching(
          "Answer",
          `${v} = ${Number.isInteger(solution) ? solution : `${rightNow}/${a}`}.`,
          `So ${v} equals ${Number.isInteger(solution) ? solution : `${rightNow} over ${a}`}.`,
          undefined,
          true,
        );
      }
    }
  }

  // Final answer step when a === 1 (or a === -1 already finished)
  const last = steps[steps.length - 1];
  const alreadyFinal = last?.marks?.some((m) => m.targetId === "mark-1");
  if (!alreadyFinal) {
    const ans = solution;
    const ansLatex = Number.isInteger(ans) ? String(ans) : String(ans);
    steps.push({
      stepNumber: stepNumber++,
      operationLabel: "Solution",
      explanation: `$${v} = ${ansLatex}$. That's our answer!`,
      selfCheck: `Check: $${a}(${ansLatex}) ${signedTerm(b)} = ${a * ans + b}$ ✓`,
      latexBefore: `${v} = ${ansLatex}`,
      latexAfter: `${v} = \\htmlId{mark-1}{${ansLatex}}`,
      arrowDirection: "simplify",
      marks: [{ targetId: "mark-1", style: "circle", label: "the answer" }],
    });
    pushTeaching(
      "Answer",
      `${v} = ${ansLatex}.`,
      `So ${v} equals ${ansLatex}.`,
      undefined,
      true,
    );
  }

  const block: EquationStepBlock = { type: "equation_steps", steps };

  return {
    builderId: "linear_equation",
    block,
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
    answer: `${v} = ${solution}`,
    intro: `Very well — we need to isolate $${v}$ on one side. Allow me to walk you through it.`,
  };
}
