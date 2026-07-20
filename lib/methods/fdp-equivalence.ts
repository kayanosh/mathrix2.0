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

// ── Ordering fractions, decimals and percentages ─────────────────────────────

export interface FdpOrderValue {
  /** Original notation as written in the question, e.g. "1/4", "0.3", "40%". */
  text: string;
  value: number;
}

export interface FdpOrderProblem {
  kind: "order";
  values: FdpOrderValue[];
  ascending: boolean;
}

/**
 * Parse "Order 1/4, 0.3 and 40% from smallest to largest" (and friends).
 * Returns null unless at least two comparable values are present.
 */
export function parseFdpOrder(text: string): FdpOrderProblem | null {
  const t = normalizeMathText(text);
  if (!/\b(order|ascending|descending|smallest|largest|biggest|compare)\b/i.test(t)) {
    return null;
  }
  const values: FdpOrderValue[] = [];
  const token = /(\d+\s*\/\s*\d+)|(\d+(?:\.\d+)?\s*%)|(\d+\.\d+)|(\d+)/g;
  for (const m of t.matchAll(token)) {
    if (m[1]) {
      const [n, d] = m[1].split("/").map((s) => parseFloat(s));
      if (!d) continue;
      values.push({ text: m[1].replace(/\s+/g, ""), value: n / d });
    } else if (m[2]) {
      values.push({ text: m[2].replace(/\s+/g, ""), value: parseFloat(m[2]) / 100 });
    } else if (m[3] !== undefined && m[3] !== "") {
      values.push({ text: m[3], value: parseFloat(m[3]) });
    }
  }
  // De-duplicate identical tokens (e.g. "0.5" and "0.5") but keep equal values in different forms.
  const seen = new Set<string>();
  const unique = values.filter((v) => (seen.has(v.text) ? false : (seen.add(v.text), true)));
  if (unique.length < 2) return null;
  // Direction: "from smallest to largest" contains BOTH words, so decide by
  // the starting end of the range, not by word presence alone.
  let ascending = true;
  const fromMatch = t.match(/from\s+(smallest|largest|biggest)\s+to/i);
  if (fromMatch) {
    ascending = /smallest/i.test(fromMatch[1]);
  } else if (/descending/i.test(t)) {
    ascending = false;
  } else if (/(?:largest|biggest)\s+(?:first|to\s+smallest)/i.test(t)) {
    ascending = false;
  }
  return { kind: "order", values: unique, ascending };
}

/** Deterministic ordering lesson: number line with every value placed. */
export function buildFdpOrder(problem: FdpOrderProblem): MethodBuildResult {
  const sorted = [...problem.values].sort((a, b) =>
    problem.ascending ? a.value - b.value : b.value - a.value,
  );
  const answer = sorted.map((v) => v.text).join(", ");
  const max = Math.max(...problem.values.map((v) => v.value), 0.1);
  const top = max <= 1 ? 1 : Math.ceil(max);
  const tickInterval = top <= 1 ? 0.1 : top <= 5 ? 0.5 : 1;

  const line: NumberLineBlock = {
    type: "number_line",
    range: [0, top],
    tickInterval,
    markers: problem.values.map((v) => ({
      value: v.value,
      label: v.text,
      style: "filled",
    })),
  };

  const decimalList = problem.values
    .map((v) => `${v.text} = ${Number(v.value.toFixed(4))}`)
    .join(", ");

  // fraction_compare contract: number line AND conversion table.
  const table: TableBlock = {
    type: "table",
    headers: ["Value", "As a decimal"],
    rows: problem.values.map((v) => [v.text, String(Number(v.value.toFixed(4)))]),
    caption: "Convert everything to decimals to compare",
    highlightCells: problem.values.map((_, i) => [i, 1] as [number, number]),
  };

  const steps: EquationStepBlock = {
    type: "equation_steps",
    steps: [
      {
        stepNumber: 1,
        operationLabel: "Convert",
        explanation: `Write every value as a decimal so they are easy to compare: ${decimalList}.`,
        latexBefore: problem.values[0].text,
        latexAfter: String(Number(problem.values[0].value.toFixed(4))),
        arrowDirection: "simplify",
      },
      {
        stepNumber: 2,
        operationLabel: "Compare",
        explanation: `Place each one on the number line — the line shows which is ${problem.ascending ? "smallest" : "largest"}.`,
        latexBefore: decimalList,
        latexAfter: sorted.map((v) => Number(v.value.toFixed(4))).join(" < "),
        arrowDirection: "simplify",
      },
    ],
  };

  const teachingSteps: TeachingStep[] = [
    {
      title: "Convert to decimals",
      explanation: decimalList,
      why: "Decimals all use the same units, so we can compare sizes fairly.",
      narration: `First, turn every value into a decimal: ${decimalList}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Place on the number line",
      explanation: `Each value is marked on the line from 0 to ${top}.`,
      why: "The number line shows the order visually.",
      narration: `Look at the number line — every value has its own marker.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Write the order",
      explanation: answer,
      narration: `In order: ${answer}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    },
  ];

  return {
    builderId: "fdp_equivalence",
    block: line,
    extraBlocks: [table, steps],
    teachingSteps,
    captions: teachingSteps.map((s) => `${s.title}: ${s.explanation}`),
    intro: "To order fractions, decimals and percentages, first write them all as decimals.",
    answer,
  };
}
