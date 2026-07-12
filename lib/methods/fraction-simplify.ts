/**
 * Deterministic fraction simplify builder (UK KS2: HCF, not GCD).
 * Gold standard for "Simplify 12/16".
 */

import type {
  EquationStepBlock,
  FractionBarBlock,
  FractionGridBlock,
  TableBlock,
} from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";
import type { KS2MicroStep } from "@/lib/ks2-lesson-zod";

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

function factorsOf(n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) {
    if (n % i === 0) out.push(i);
  }
  return out;
}

export function parseFractionSimplify(
  text: string,
): { n: number; d: number } | null {
  const t = normalizeMathText(text);
  if (
    !/\bsimplif(?:y|ying)\b|\blowest terms\b|\bsimplest form\b|\bcancel\b/i.test(
      t,
    )
  ) {
    return null;
  }
  const m = t.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const d = parseInt(m[2], 10);
  if (!(d > 0) || n < 0) return null;
  return { n, d };
}

export function buildFractionSimplify(
  n: number,
  d: number,
): MethodBuildResult {
  if (d <= 0) throw new Error("denominator must be positive");
  const hcf = gcd(n, d);
  const sn = n / hcf;
  const sd = d / hcf;
  const factorsN = factorsOf(n);
  const factorsD = factorsOf(d);

  const bar: FractionBarBlock = {
    type: "fraction_bar",
    numerator: n,
    denominator: d,
    shaded: n,
    label: `${n}/${d} — ${n} parts shaded out of ${d}`,
  };

  const grid: FractionGridBlock = {
    type: "fraction_grid",
    numerator: n,
    denominator: d,
    shaded: n,
    groupSize: hcf,
    simplifiedNumerator: sn,
    simplifiedDenominator: sd,
    label: `Group into ${hcf}s: ${n}/${d} = ${sn}/${sd}`,
  };

  const table: TableBlock = {
    type: "table",
    headers: ["Number", "Factors"],
    rows: [
      [String(n), factorsN.join(", ")],
      [String(d), factorsD.join(", ")],
      ["HCF", String(hcf)],
    ],
    caption: "Highest common factor (HCF)",
    highlightCells: [[2, 1]],
  };

  const equation: EquationStepBlock = {
    type: "equation_steps",
    steps: [
      {
        stepNumber: 1,
        operationLabel: "Start",
        explanation: `We start with ${n}/${d}.`,
        latexBefore: `\\frac{${n}}{${d}}`,
        latexAfter: `\\frac{${n}}{${d}}`,
        arrowDirection: "simplify",
      },
      {
        stepNumber: 2,
        operationLabel: "Divide by HCF",
        explanation: `HCF is ${hcf}. Divide top and bottom by ${hcf}.`,
        latexBefore: `\\frac{${n}}{${d}}`,
        latexAfter: `\\frac{${n}\\div ${hcf}}{${d}\\div ${hcf}} = \\frac{${sn}}{${sd}}`,
        arrowDirection: "simplify",
        rule: "Simplify using HCF",
        why: "Dividing numerator and denominator by the same number keeps the fraction equivalent.",
      },
    ],
  };

  const micro: KS2MicroStep[] = [
    {
      stepNumber: 1,
      title: "Start with the fraction",
      teacherText: `We want to simplify ${n}/${d}.`,
      calculation: `${n}/${d}`,
      visualInstruction: "Look at the fraction bar with equal parts.",
      highlightedValues: [`${n}/${d}`],
    },
    {
      stepNumber: 2,
      title: "Name the parts",
      teacherText: `${n} is the numerator (how many parts we have). ${d} is the denominator (how many equal parts the whole is split into).`,
      highlightedValues: ["numerator", "denominator"],
      why: "Knowing the names helps us talk about the top and bottom clearly.",
    },
    {
      stepNumber: 3,
      title: "What simplifying means",
      teacherText:
        "Simplifying means writing an equivalent fraction using smaller numbers — the same amount, just fewer, bigger pieces.",
      why: "Equivalent fractions name the same portion of the whole.",
    },
    {
      stepNumber: 4,
      title: `Factors of ${n}`,
      teacherText: `List the factors of ${n}: ${factorsN.join(", ")}.`,
      calculation: factorsN.join(", "),
      visualInstruction: "Use the factor table.",
      highlightedValues: factorsN.map(String),
    },
    {
      stepNumber: 5,
      title: `Factors of ${d}`,
      teacherText: `List the factors of ${d}: ${factorsD.join(", ")}.`,
      calculation: factorsD.join(", "),
      highlightedValues: factorsD.map(String),
    },
    {
      stepNumber: 6,
      title: "Find the HCF",
      teacherText: `The highest common factor (HCF) of ${n} and ${d} is ${hcf} — the biggest number that is a factor of both.`,
      calculation: `HCF = ${hcf}`,
      highlightedValues: [String(hcf)],
      misconceptionWarning:
        "In UK primary we say HCF (highest common factor), not GCD.",
      why: "We use the highest shared factor so the fraction becomes as simple as possible in one go.",
    },
    {
      stepNumber: 7,
      title: "Divide both by the HCF",
      teacherText: `Divide the numerator and the denominator by ${hcf}.`,
      calculation: `${n} ÷ ${hcf} = ${sn},  ${d} ÷ ${hcf} = ${sd}`,
      visualInstruction: `Group the bar into groups of ${hcf}.`,
      highlightedValues: [String(hcf), String(sn), String(sd)],
      misconceptionWarning:
        "Do not divide only the numerator — divide both numbers by the same HCF.",
    },
    {
      stepNumber: 8,
      title: "Write the simplified fraction",
      teacherText: `So ${n}/${d} = ${sn}/${sd}.`,
      calculation: `${n}/${d} = ${sn}/${sd}`,
      highlightedValues: [`${sn}/${sd}`],
    },
    {
      stepNumber: 9,
      title: "Check",
      teacherText: `Check that ${sn} and ${sd} have no common factor bigger than 1. Their HCF is ${gcd(sn, sd)}, so ${sn}/${sd} is in its simplest form.`,
      calculation: `HCF(${sn}, ${sd}) = ${gcd(sn, sd)}`,
      why: "If the HCF is 1, the fraction cannot be simplified further.",
    },
  ];

  const teachingSteps: TeachingStep[] = micro.map((s) => ({
    title: s.title,
    explanation: [s.teacherText, s.calculation].filter(Boolean).join(" "),
    why: s.why || s.misconceptionWarning,
    narration: s.teacherText,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: s.stepNumber >= 8,
  }));

  return {
    builderId: "fraction_simplify",
    block: bar,
    extraBlocks: [grid, table, equation],
    teachingSteps,
    captions: teachingSteps.map((s) => `${s.title}: ${s.explanation}`),
    answer: `${sn}/${sd}`,
    intro: `Simplifying means writing an equivalent fraction with smaller numbers. We'll find the HCF of ${n} and ${d}.`,
  };
}
