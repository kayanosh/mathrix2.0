/**
 * Deterministic fraction-ops builder for Year 5/6.
 * Covers: +/− with common denominators, ×/÷ by an integer, × fraction×fraction.
 * Output: equation_steps board + digit-level TeachingStep script.
 */

import type { EquationStep, EquationStepBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export interface Fraction {
  n: number;
  d: number;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

export function simplify(f: Fraction): Fraction {
  if (f.d === 0) throw new Error("denominator cannot be zero");
  const g = gcd(f.n, f.d);
  let n = f.n / g;
  let d = f.d / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return { n, d };
}

function latex(f: Fraction): string {
  if (f.d === 1) return String(f.n);
  return `\\frac{${f.n}}{${f.d}}`;
}

function plain(f: Fraction): string {
  if (f.d === 1) return String(f.n);
  return `${f.n}/${f.d}`;
}

export type FractionOp = "add" | "subtract" | "multiply" | "divide";

export interface FractionOpProblem {
  left: Fraction;
  right: Fraction;
  op: FractionOp;
}

function buildSteps(
  problem: FractionOpProblem,
): { steps: EquationStep[]; teachingSteps: TeachingStep[]; answer: Fraction } {
  const { left, right, op } = problem;
  const teachingSteps: TeachingStep[] = [];
  const steps: EquationStep[] = [];
  let stepNumber = 1;

  const push = (
    title: string,
    explanation: string,
    latexBefore: string,
    latexAfter: string,
    operationLabel: string,
    why?: string,
    showAnswer?: boolean,
  ) => {
    steps.push({
      stepNumber: stepNumber++,
      operationLabel,
      explanation,
      latexBefore,
      latexAfter,
      arrowDirection: "down",
      rule: title,
    });
    teachingSteps.push({
      title,
      explanation,
      why,
      narration: explanation,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer,
    });
  };

  const start = `${latex(left)} ${opSymbol(op)} ${latex(right)}`;
  push(
    "Write the calculation",
    `Start with ${plain(left)} ${opSymbol(op)} ${plain(right)}.`,
    start,
    start,
    "Set up",
    "We keep both fractions visible so each step is clear.",
  );

  if (op === "add" || op === "subtract") {
    if (left.d === right.d) {
      const raw =
        op === "add"
          ? { n: left.n + right.n, d: left.d }
          : { n: left.n - right.n, d: left.d };
      const after = latex(raw);
      push(
        op === "add" ? "Add the numerators" : "Subtract the numerators",
        op === "add"
          ? `Same denominator ${left.d}: ${left.n} + ${right.n} = ${raw.n}. Keep ${raw.d}.`
          : `Same denominator ${left.d}: ${left.n} − ${right.n} = ${raw.n}. Keep ${raw.d}.`,
        start,
        after,
        op === "add" ? "Add numerators" : "Subtract numerators",
        "Equal denominators mean the pieces are the same size.",
      );
      const ans = simplify(raw);
      if (ans.n !== raw.n || ans.d !== raw.d) {
        push(
          "Simplify",
          `Simplify ${plain(raw)} to ${plain(ans)}.`,
          after,
          latex(ans),
          "Simplify",
          "Divide numerator and denominator by their highest common factor.",
          true,
        );
      } else {
        teachingSteps[teachingSteps.length - 1].showAnswer = true;
      }
      return { steps, teachingSteps, answer: ans };
    }

    const den = lcm(left.d, right.d);
    const leftEq = { n: left.n * (den / left.d), d: den };
    const rightEq = { n: right.n * (den / right.d), d: den };
    const common = `${latex(leftEq)} ${opSymbol(op)} ${latex(rightEq)}`;
    push(
      "Find a common denominator",
      `Common denominator of ${left.d} and ${right.d} is ${den}. Rewrite as ${plain(leftEq)} ${opSymbol(op)} ${plain(rightEq)}.`,
      start,
      common,
      "Equivalent fractions",
      "Same-size pieces let us add or subtract the numerators.",
    );

    const raw =
      op === "add"
        ? { n: leftEq.n + rightEq.n, d: den }
        : { n: leftEq.n - rightEq.n, d: den };
    push(
      op === "add" ? "Add the numerators" : "Subtract the numerators",
      op === "add"
        ? `${leftEq.n} + ${rightEq.n} = ${raw.n}. Keep denominator ${den}.`
        : `${leftEq.n} − ${rightEq.n} = ${raw.n}. Keep denominator ${den}.`,
      common,
      latex(raw),
      op === "add" ? "Add numerators" : "Subtract numerators",
    );

    const ans = simplify(raw);
    if (ans.n !== raw.n || ans.d !== raw.d) {
      push(
        "Simplify",
        `Simplify ${plain(raw)} to ${plain(ans)}.`,
        latex(raw),
        latex(ans),
        "Simplify",
        "Always give the answer in its simplest form.",
        true,
      );
    } else {
      teachingSteps[teachingSteps.length - 1].showAnswer = true;
    }
    return { steps, teachingSteps, answer: ans };
  }

  if (op === "multiply") {
    const raw = { n: left.n * right.n, d: left.d * right.d };
    push(
      "Multiply numerators and denominators",
      `${left.n} × ${right.n} = ${raw.n} on top; ${left.d} × ${right.d} = ${raw.d} underneath.`,
      start,
      latex(raw),
      "Multiply",
      "Multiplying fractions means 'of' — multiply tops, multiply bottoms.",
    );
    const ans = simplify(raw);
    if (ans.n !== raw.n || ans.d !== raw.d) {
      push(
        "Simplify",
        `Simplify ${plain(raw)} to ${plain(ans)}.`,
        latex(raw),
        latex(ans),
        "Simplify",
        undefined,
        true,
      );
    } else {
      teachingSteps[teachingSteps.length - 1].showAnswer = true;
    }
    return { steps, teachingSteps, answer: ans };
  }

  // divide: a/b ÷ c/d = a/b × d/c
  const reciprocal = { n: right.d, d: right.n };
  const flipped = `${latex(left)} \\times ${latex(reciprocal)}`;
  push(
    "Multiply by the reciprocal",
    `Dividing by ${plain(right)} is the same as multiplying by ${plain(reciprocal)}.`,
    start,
    flipped,
    "Reciprocal",
    "÷ a fraction means × its flip.",
  );
  const raw = { n: left.n * reciprocal.n, d: left.d * reciprocal.d };
  push(
    "Multiply numerators and denominators",
    `${left.n} × ${reciprocal.n} = ${raw.n}; ${left.d} × ${reciprocal.d} = ${raw.d}.`,
    flipped,
    latex(raw),
    "Multiply",
  );
  const ans = simplify(raw);
  if (ans.n !== raw.n || ans.d !== raw.d) {
    push(
      "Simplify",
      `Simplify ${plain(raw)} to ${plain(ans)}.`,
      latex(raw),
      latex(ans),
      "Simplify",
      undefined,
      true,
    );
  } else {
    teachingSteps[teachingSteps.length - 1].showAnswer = true;
  }
  return { steps, teachingSteps, answer: ans };
}

function opSymbol(op: FractionOp): string {
  switch (op) {
    case "add":
      return "+";
    case "subtract":
      return "−";
    case "multiply":
      return "×";
    case "divide":
      return "÷";
  }
}

export function buildFractionOps(problem: FractionOpProblem): MethodBuildResult {
  if (
    !Number.isInteger(problem.left.n) ||
    !Number.isInteger(problem.left.d) ||
    !Number.isInteger(problem.right.n) ||
    !Number.isInteger(problem.right.d) ||
    problem.left.d <= 0 ||
    problem.right.d <= 0
  ) {
    throw new Error("fraction ops require integer numerators and positive denominators");
  }
  if (problem.op === "divide" && problem.right.n === 0) {
    throw new Error("cannot divide by zero");
  }

  const { steps, teachingSteps, answer } = buildSteps(problem);
  const answerPlain = plain(answer);
  teachingSteps.push({
    title: "Answer",
    explanation: `So ${plain(problem.left)} ${opSymbol(problem.op)} ${plain(problem.right)} = ${answerPlain}.`,
    narration: `The answer is ${answerPlain}.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });

  const block: EquationStepBlock = {
    type: "equation_steps",
    steps,
  };

  return {
    builderId: "fraction_ops",
    block,
    teachingSteps,
    captions: teachingSteps
      .filter((s) => s.title !== "Answer")
      .map((s) => s.explanation),
    answer: answerPlain,
  };
}

const FRAC = String.raw`(\d+)\s*\/\s*(\d+)`;
const OP = String.raw`([+\-−×x*÷/]|plus|minus|times|divided\s+by)`;

export function parseFractionOp(text: string): FractionOpProblem | null {
  const t = normalizeMathText(text);
  // a/b op c/d
  const m2 = t.match(
    new RegExp(`${FRAC}\\s*${OP}\\s*${FRAC}`, "i"),
  );
  if (m2) {
    const op = mapOp(m2[3]);
    if (!op) return null;
    return {
      left: { n: parseInt(m2[1], 10), d: parseInt(m2[2], 10) },
      right: { n: parseInt(m2[4], 10), d: parseInt(m2[5], 10) },
      op,
    };
  }
  // a/b op integer  OR  integer op a/b (multiply/divide)
  const mIntR = t.match(
    new RegExp(`${FRAC}\\s*${OP}\\s*(\\d+)(?!\\s*\\/)`, "i"),
  );
  if (mIntR) {
    const op = mapOp(mIntR[3]);
    if (!op) return null;
    return {
      left: { n: parseInt(mIntR[1], 10), d: parseInt(mIntR[2], 10) },
      right: { n: parseInt(mIntR[4], 10), d: 1 },
      op,
    };
  }
  const mIntL = t.match(
    new RegExp(`(\\d+)(?!\\s*\\/)\\s*${OP}\\s*${FRAC}`, "i"),
  );
  if (mIntL) {
    const op = mapOp(mIntL[2]);
    if (!op || (op !== "multiply" && op !== "divide")) return null;
    return {
      left: { n: parseInt(mIntL[1], 10), d: 1 },
      right: { n: parseInt(mIntL[3], 10), d: parseInt(mIntL[4], 10) },
      op,
    };
  }
  return null;
}

function mapOp(raw: string): FractionOp | null {
  const s = raw.toLowerCase().trim();
  if (s === "+" || s === "plus") return "add";
  if (s === "-" || s === "−" || s === "minus") return "subtract";
  if (s === "×" || s === "x" || s === "*" || s === "times") return "multiply";
  if (s === "÷" || s === "/" || s === "divided by") return "divide";
  return null;
}
