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

/** Parse forms like 2x+4=10, x-3=7, -3x+1=10. Rejects quadratics. */
export function parseLinearEquation(text: string): LinearProblem | null {
  const normalized = normalizeMathText(text)
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    .replace(/²/g, "^2");

  if (/[a-zA-Z]\s*\^\s*2|[a-zA-Z]²/.test(normalized)) return null;

  // Prefer an explicit equation substring
  const slice =
    normalized.match(/(-?\d*)\s*([a-zA-Z])\s*([+\-]\s*\d+)?\s*=\s*(-?\d+(?:\.\d+)?)/)?.[0] ||
    normalized;

  const eq = slice.match(
    /(-?\d*)\s*([a-zA-Z])\s*([+\-]\s*\d+)?\s*=\s*(-?\d+(?:\.\d+)?)/,
  );
  if (!eq) {
    const flipped = normalized.match(
      /(-?\d+)\s*([+\-])\s*(-?\d*)\s*([a-zA-Z])\s*=\s*(-?\d+(?:\.\d+)?)/,
    );
    if (!flipped) return null;
    const constant = parseInt(flipped[1], 10);
    const varSign = flipped[2] === "-" ? -1 : 1;
    let aCoeff = 1;
    if (flipped[3] === "" || flipped[3] === "+") aCoeff = 1;
    else if (flipped[3] === "-") aCoeff = -1;
    else aCoeff = parseInt(flipped[3], 10);
    aCoeff *= varSign;
    return {
      variable: flipped[4],
      a: aCoeff,
      b: constant,
      c: parseFloat(flipped[5]),
    };
  }

  let a = 1;
  if (eq[1] === "" || eq[1] === "+") a = 1;
  else if (eq[1] === "-") a = -1;
  else a = parseInt(eq[1], 10);

  let b = 0;
  if (eq[3]) {
    b = parseInt(eq[3].replace(/\s+/g, ""), 10);
  }

  const c = parseFloat(eq[4]);
  if (!Number.isFinite(a) || a === 0 || !Number.isFinite(b) || !Number.isFinite(c)) {
    return null;
  }

  return { variable: eq[2], a, b, c };
}

export function buildLinearEquation(problem: LinearProblem): MethodBuildResult {
  const { variable: v, a, b, c } = problem;
  if (a === 0) throw new Error("coefficient of variable cannot be zero");

  const steps: EquationStep[] = [];
  const teachingSteps: TeachingStep[] = [];
  let stepNumber = 1;

  const start = `${latexLinear(a, b, v)} = ${c}`;
  const solution = (c - b) / a;
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

  let afterConstant = `${a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`} = ${c}`;
  if (b !== 0) {
    const inv = -b;
    const opWord = b > 0 ? "Subtract" : "Add";
    const opAbs = Math.abs(b);
    const balance = b > 0 ? `-${opAbs}` : `+${opAbs}`;
    const fromLatex = b > 0 ? String(b) : String(b); // -3 shown as -3
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
    afterConstant = `${a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`} = ${right}`;
  }

  const rightNow = c - b;

  if (a !== 1) {
    const absA = Math.abs(a);
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
