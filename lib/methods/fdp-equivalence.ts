/**
 * FDP equivalence: fraction ↔ decimal ↔ percentage with table + unit line.
 */

import type { EquationStepBlock, NumberLineBlock, TableBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export interface FdpProblem {
  kind: "fraction" | "decimal" | "percent";
  n?: number;
  d?: number;
  decimal?: number;
  percent?: number;
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

export function parseFdpEquivalence(text: string): FdpProblem | null {
  const t = normalizeMathText(text);
  if (
    !/\b(equivalent|as a (?:fraction|decimal|percentage|percent)|convert|fdp|fraction.*decimal|percent)/i.test(
      t,
    )
  ) {
    return null;
  }
  const frac = t.match(/(\d+)\s*\/\s*(\d+)/);
  if (frac) {
    return { kind: "fraction", n: parseInt(frac[1], 10), d: parseInt(frac[2], 10) };
  }
  const pct = t.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return { kind: "percent", percent: parseFloat(pct[1]) };
  const dec = t.match(/\b0?\.(\d+)\b/) || t.match(/\b(\d+\.\d+)\b/);
  if (dec) {
    const v = parseFloat(dec[0].startsWith(".") ? `0${dec[0]}` : dec[1] || dec[0]);
    if (v > 0 && v <= 1) return { kind: "decimal", decimal: v };
  }
  return null;
}

export function buildFdpEquivalence(problem: FdpProblem): MethodBuildResult {
  let n: number;
  let d: number;
  let decimal: number;
  let percent: number;

  if (problem.kind === "fraction" && problem.n != null && problem.d != null) {
    n = problem.n;
    d = problem.d;
    decimal = n / d;
    percent = decimal * 100;
  } else if (problem.kind === "percent" && problem.percent != null) {
    percent = problem.percent;
    decimal = percent / 100;
    // Convert to fraction in hundredths then simplify
    n = Math.round(percent);
    d = 100;
    const g = gcd(n, d);
    n /= g;
    d /= g;
  } else if (problem.kind === "decimal" && problem.decimal != null) {
    decimal = problem.decimal;
    percent = decimal * 100;
    const places = (String(decimal).split(".")[1] || "").length;
    d = 10 ** Math.min(places, 4);
    n = Math.round(decimal * d);
    const g = gcd(n, d);
    n /= g;
    d /= g;
  } else {
    throw new Error("invalid FDP problem");
  }

  const fracPlain = `${n}/${d}`;
  const decPlain = Number(decimal.toFixed(4)).toString();
  const pctPlain = `${Number(percent.toFixed(2))}%`;

  const table: TableBlock = {
    type: "table",
    headers: ["Fraction", "Decimal", "Percentage"],
    rows: [[fracPlain, decPlain, pctPlain]],
    caption: "FDP equivalence",
    highlightCells: [[0, 0], [0, 1], [0, 2]],
  };

  const line: NumberLineBlock = {
    type: "number_line",
    range: [0, 1],
    tickInterval: 0.1,
    markers: [
      { value: decimal, label: fracPlain, style: "filled" },
      { value: decimal, label: pctPlain, style: "open" },
    ],
  };

  const steps: EquationStepBlock = {
    type: "equation_steps",
    steps: [
      {
        stepNumber: 1,
        operationLabel: "Start",
        explanation: `We will show ${problem.kind === "fraction" ? fracPlain : problem.kind === "percent" ? pctPlain : decPlain} in all three forms.`,
        latexBefore:
          problem.kind === "fraction"
            ? `\\frac{${n}}{${d}}`
            : problem.kind === "percent"
              ? `${percent}\\%`
              : String(decimal),
        latexAfter:
          problem.kind === "fraction"
            ? `\\frac{${n}}{${d}}`
            : problem.kind === "percent"
              ? `${percent}\\%`
              : String(decimal),
        arrowDirection: "simplify",
      },
      {
        stepNumber: 2,
        operationLabel: "Fraction",
        explanation: `As a fraction: ${fracPlain}.`,
        latexBefore: `\\frac{${n}}{${d}}`,
        latexAfter: `\\frac{${n}}{${d}}`,
        arrowDirection: "simplify",
      },
      {
        stepNumber: 3,
        operationLabel: "Decimal",
        explanation: `Divide ${n} ÷ ${d} = ${decPlain} (bus stop / short division).`,
        rule: "Short division",
        latexBefore: `${n} \\div ${d}`,
        latexAfter: decPlain,
        arrowDirection: "simplify",
      },
      {
        stepNumber: 4,
        operationLabel: "Percentage",
        explanation: `Multiply the decimal by 100: ${decPlain} × 100 = ${pctPlain}.`,
        latexBefore: `${decPlain} \\times 100`,
        latexAfter: `${percent}\\%`,
        arrowDirection: "simplify",
      },
    ],
  };

  const teachingSteps: TeachingStep[] = [
    {
      title: "Fraction form",
      explanation: fracPlain,
      narration: `As a fraction this is ${fracPlain}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Decimal (bus stop)",
      explanation: `${n} ÷ ${d} = ${decPlain}`,
      why: "Dividing numerator by denominator gives the decimal.",
      narration: `Divide ${n} by ${d} to get ${decPlain}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Percentage",
      explanation: pctPlain,
      why: "Percentage means out of 100.",
      narration: `As a percentage that is ${pctPlain}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    },
  ];

  return {
    builderId: "fdp_equivalence",
    block: table,
    extraBlocks: [line, steps],
    teachingSteps,
    captions: teachingSteps.map((s) => `${s.title}: ${s.explanation}`),
    answer: `${fracPlain} = ${decPlain} = ${pctPlain}`,
    intro: `Let's show this value as a fraction, a decimal, and a percentage.`,
  };
}
