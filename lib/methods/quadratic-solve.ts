/**
 * Deterministic monic quadratic factor-solve builder.
 * x² + bx + c = 0 → factor → zero product → solve each linear factor with arrows.
 */

import type { EquationStep, EquationStepBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export interface QuadraticProblem {
  variable: string;
  /** Must be 1 for v1 */
  a: number;
  b: number;
  c: number;
}

function signedCoeff(n: number, bare = false): string {
  if (n === 0) return bare ? "0" : "";
  if (n > 0) return bare ? String(n) : `+ ${n}`;
  return bare ? String(n) : `- ${Math.abs(n)}`;
}

function latexQuadratic(v: string, b: number, c: number): string {
  let s = `${v}^{2}`;
  if (b !== 0) {
    s +=
      b === 1
        ? ` + ${v}`
        : b === -1
          ? ` - ${v}`
          : b > 0
            ? ` + ${b}${v}`
            : ` - ${Math.abs(b)}${v}`;
  }
  if (c !== 0) s += ` ${signedCoeff(c)}`;
  return `${s} = 0`;
}

function factorLatex(v: string, p: number, q: number): string {
  const left =
    p === 0 ? v : p > 0 ? `(${v} + ${p})` : `(${v} - ${Math.abs(p)})`;
  const right =
    q === 0 ? v : q > 0 ? `(${v} + ${q})` : `(${v} - ${Math.abs(q)})`;
  return `${left}${right} = 0`;
}

/** Integer factor pair p,q with p+q=b and p*q=c. Prefer more-negative first when tied. */
export function findFactorPair(
  b: number,
  c: number,
): { p: number; q: number } | null {
  if (c === 0) return { p: 0, q: b };
  const absC = Math.abs(c);
  const pairs: { p: number; q: number }[] = [];
  for (let i = 1; i <= absC; i++) {
    if (absC % i !== 0) continue;
    const j = absC / i;
    const candidates: [number, number][] = [
      [i, j],
      [-i, -j],
      [i, -j],
      [-i, j],
      [j, i],
      [-j, -i],
      [j, -i],
      [-j, i],
    ];
    for (const [p, q] of candidates) {
      if (p * q === c && p + q === b) pairs.push({ p, q });
    }
  }
  if (pairs.length === 0) return null;
  // Prefer conventional textbook order: (x - larger)(x + smaller) when possible
  // e.g. for -6,+1 choose p=-6, q=1
  pairs.sort((a, bPair) => a.p - bPair.p);
  return pairs[0];
}

/** Parse monic quadratics: x^2 - 5x - 6 = 0, x²+3x+2=0 */
export function parseQuadraticEquation(text: string): QuadraticProblem | null {
  const normalized = normalizeMathText(text)
    .replace(/²/g, "^2")
    .replace(/\$/g, "");

  // Pull out the first monic quadratic equation in the text.
  const eqMatch = normalized.match(
    /(?:^|[^a-zA-Z0-9])((?:1)?([a-zA-Z])\^2(?:\s*[+\-]\s*\d*\2)?(?:\s*[+\-]\s*\d+)?\s*=\s*0)/i,
  );
  if (!eqMatch) return null;

  const compact = eqMatch[1].replace(/\s+/g, "");

  const m = compact.match(
    /^(?:1)?([a-zA-Z])\^2(?:([+\-]\d*)\1)?([+\-]\d+)?=0$/,
  );
  if (!m) return null;
  return parseParts(m[1], m[2], m[3]);
}

function parseParts(
  v: string,
  bRaw: string | undefined,
  cRaw: string | undefined,
): QuadraticProblem | null {
  let b = 0;
  if (bRaw != null && bRaw !== "") {
    if (bRaw === "+" || bRaw === "") b = 1;
    else if (bRaw === "-") b = -1;
    else b = parseInt(bRaw, 10);
  }
  let c = 0;
  if (cRaw != null && cRaw !== "") {
    c = parseInt(cRaw, 10);
  }
  if (!Number.isFinite(b) || !Number.isFinite(c)) return null;
  return { variable: v, a: 1, b, c };
}

export function buildQuadraticFactorSolve(
  problem: QuadraticProblem,
): MethodBuildResult {
  const { variable: v, a, b, c } = problem;
  if (a !== 1) throw new Error("v1 quadratic builder is monic only");

  const pair = findFactorPair(b, c);
  if (!pair) throw new Error("quadratic does not factor over the integers");

  const { p, q } = pair;
  const root1 = -p;
  const root2 = -q;

  const steps: EquationStep[] = [];
  const teachingSteps: TeachingStep[] = [];
  let stepNumber = 1;

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

  const start = latexQuadratic(v, b, c);
  const factored = factorLatex(v, p, q);

  steps.push({
    stepNumber: stepNumber++,
    operationLabel: "Starting equation",
    explanation: `This is a quadratic equation — a polynomial of degree 2. We'll factorise it, then solve.`,
    latexBefore: start,
    latexAfter: start,
    arrowDirection: "simplify",
  });
  pushTeaching(
    "Starting equation",
    `Start with $${start}$.`,
    `Let's solve ${start.replace(/\\/g, "")}.`,
  );

  steps.push({
    stepNumber: stepNumber++,
    operationLabel: "Factorise",
    explanation: `Find two numbers that multiply to $${c}$ and add to $${b}$: $${p}$ and $${q}$. So we can write it as a product of brackets.`,
    rule: "Factorising quadratics",
    why: `We need a pair whose product is $c=${c}$ and whose sum is $b=${b}$.`,
    latexBefore: start,
    latexAfter: factored,
    arrowDirection: "simplify",
  });
  pushTeaching(
    "Factorise",
    `Factorise as $${factored}$ using the pair ${p} and ${q}.`,
    `Two numbers that multiply to ${c} and add to ${b} are ${p} and ${q}.`,
    "Factorising turns one equation into a product equal to zero.",
  );

  steps.push({
    stepNumber: stepNumber++,
    operationLabel: "Zero product property",
    explanation: `If two things multiply to make zero, at least one of them must be zero. So either $${v} ${signedCoeff(p)} = 0$ or $${v} ${signedCoeff(q)} = 0$.`,
    rule: "Zero product property",
    why: "A product is zero only when one of the factors is zero.",
    latexBefore: factored,
    latexAfter: `${v} ${signedCoeff(p)} = 0 \\quad \\text{or} \\quad ${v} ${signedCoeff(q)} = 0`,
    arrowDirection: "simplify",
  });
  pushTeaching(
    "Zero product",
    `Set each bracket equal to zero.`,
    `Either factor can be zero.`,
  );

  // Solve first factor with arrow
  const solveFactor = (
    constTerm: number,
    arrowId: string,
  ): void => {
    const root = -constTerm;
    if (constTerm === 0) {
      steps.push({
        stepNumber: stepNumber++,
        operationLabel: `Solve ${v} = 0`,
        explanation: `This bracket is already $${v} = 0$.`,
        latexBefore: `${v} = 0`,
        latexAfter: `${v} = \\htmlId{mark-${arrowId}}{0}`,
        arrowDirection: "simplify",
        marks: [{ targetId: `mark-${arrowId}`, style: "circle", label: "a solution" }],
      });
      pushTeaching(`Solve ${v} = 0`, `${v} = 0.`, `${v} equals zero.`);
      return;
    }

    const opWord = constTerm > 0 ? "Subtract" : "Add";
    const opAbs = Math.abs(constTerm);
    const before =
      constTerm > 0
        ? `${v} + \\htmlId{${arrowId}-from}{${constTerm}} = 0`
        : `${v} - \\htmlId{${arrowId}-from}{${opAbs}} = 0`;
    const after = `${v} = \\htmlId{${arrowId}-to}{${root}}`;

    steps.push({
      stepNumber: stepNumber++,
      operationLabel: `${opWord} ${opAbs} from both sides`,
      explanation:
        constTerm > 0
          ? `Move the $+${constTerm}$ across: subtract $${constTerm}$ from both sides.`
          : `Move the $-${opAbs}$ across: add $${opAbs}$ to both sides.`,
      rule: "Inverse operations",
      why: "Whatever we do to one side, we do to the other — the equation stays balanced.",
      latexBefore: before,
      latexAfter: after,
      arrowDirection: "both_sides",
      arrows: [
        {
          id: arrowId,
          label: `${opWord} ${opAbs}`,
          fromTerm: constTerm > 0 ? `+${constTerm}` : `-${opAbs}`,
          toTerm: String(root),
          style: "curly",
          signRule:
            constTerm > 0
              ? "adding becomes subtracting"
              : "subtracting becomes adding",
        },
      ],
      balanceNotation: constTerm > 0 ? `-${opAbs}` : `+${opAbs}`,
    });
    pushTeaching(
      `${opWord} ${opAbs}`,
      `${v} = ${root}.`,
      `So ${v} equals ${root}.`,
    );
  };

  solveFactor(p, "arrow-q1");
  solveFactor(q, "arrow-q2");

  steps.push({
    stepNumber: stepNumber++,
    operationLabel: "Solutions",
    explanation: `The solutions are $${v} = ${root1}$ and $${v} = ${root2}$.`,
    selfCheck: `Check by substituting: both $${root1}$ and $${root2}$ make the original expression equal $0$ ✓`,
    latexBefore: `${v} = ${root1} \\quad \\text{or} \\quad ${v} = ${root2}`,
    latexAfter: `${v} = \\htmlId{mark-final-1}{${root1}} \\quad \\text{or} \\quad ${v} = \\htmlId{mark-final-2}{${root2}}`,
    arrowDirection: "simplify",
    marks: [
      { targetId: "mark-final-1", style: "circle", label: "root" },
      { targetId: "mark-final-2", style: "circle", label: "root" },
    ],
  });
  pushTeaching(
    "Solutions",
    `${v} = ${root1} or ${v} = ${root2}.`,
    `The solutions are ${v} equals ${root1} and ${v} equals ${root2}.`,
    undefined,
    true,
  );

  // Fix unused toSide - remove it from solveFactor. I left toSide unused - remove in mind, already not in after.

  const block: EquationStepBlock = { type: "equation_steps", steps };

  return {
    builderId: "quadratic_solve",
    block,
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
    answer: `${v} = ${root1}, ${v} = ${root2}`,
    intro: `Let's solve this quadratic equation step by step — factorise, then use the zero product property.`,
  };
}
