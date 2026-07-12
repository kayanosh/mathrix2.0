/**
 * Deterministic fraction compare/order builder.
 * LCD equivalents + unit number line with markers + optional bus-stop decimals.
 */

import type {
  EquationStep,
  EquationStepBlock,
  NumberLineBlock,
  TableBlock,
} from "@/types/whiteboard";
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

function simplify(f: Fraction): Fraction {
  const g = gcd(f.n, f.d);
  return { n: f.n / g, d: f.d / g };
}

function plain(f: Fraction): string {
  return `${f.n}/${f.d}`;
}

function latex(f: Fraction): string {
  return `\\frac{${f.n}}{${f.d}}`;
}

function valueOf(f: Fraction): number {
  return f.n / f.d;
}

/** Extract fraction tokens a/b from compare/order prompts. */
export function parseFractionCompare(text: string): Fraction[] | null {
  const t = normalizeMathText(text);
  const isCompare =
    /\b(compare|order|which\s+is\s+(?:greater|bigger|smaller|least|greatest)|from\s+smallest|from\s+largest|between)\b/i.test(
      t,
    ) ||
    /\bfractions?\s+on\s+(?:a\s+)?(?:number\s+)?line\b/i.test(t) ||
    /\bcompare\s*\/\s*order\b/i.test(t);
  if (!isCompare) return null;
  // Do not steal arithmetic: "1/2 + 1/3"
  if (/[+\-−×x*÷]|plus|minus|times|divided\s+by|\bof\b/i.test(t)) return null;

  const fracs: Fraction[] = [];
  const re = /(\d+)\s*\/\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const n = parseInt(m[1], 10);
    const d = parseInt(m[2], 10);
    if (d > 0) fracs.push(simplify({ n, d }));
  }
  if (fracs.length < 2) return null;
  // Dedupe by value+label
  const seen = new Set<string>();
  const unique: Fraction[] = [];
  for (const f of fracs) {
    const key = plain(f);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(f);
  }
  return unique.length >= 2 ? unique : null;
}

function decimalApprox(f: Fraction, places = 3): string {
  const v = valueOf(f);
  const s = v.toFixed(places).replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

export function buildFractionNumberLine(fractions: Fraction[]): MethodBuildResult {
  if (fractions.length < 2) throw new Error("need at least two fractions");
  if (fractions.some((f) => f.d <= 0 || f.n < 0)) {
    throw new Error("fractions must be non-negative with positive denominators");
  }

  const lcd = fractions.reduce((acc, f) => lcm(acc, f.d), 1);
  const equiv = fractions.map((f) => ({
    original: f,
    converted: { n: (f.n * lcd) / f.d, d: lcd },
  }));
  const sorted = [...equiv].sort(
    (a, b) => valueOf(a.original) - valueOf(b.original),
  );

  const markers = fractions.map((f) => ({
    value: valueOf(f),
    label: plain(f),
    style: "filled" as const,
  }));

  // Cap ticks so the line stays readable (max ~12)
  let tickInterval = 1 / lcd;
  if (lcd > 12) {
    tickInterval = 1 / 12;
  }

  const line: NumberLineBlock = {
    type: "number_line",
    range: [0, 1],
    tickInterval,
    markers,
  };

  const table: TableBlock = {
    type: "table",
    headers: ["Fraction", `Equivalent (/${lcd})`, "Decimal (≈)"],
    rows: equiv.map((e) => [
      plain(e.original),
      plain(e.converted),
      decimalApprox(e.original),
    ]),
    caption: `Common denominator ${lcd}`,
    highlightCells: sorted.map((_, i) => [i, 0] as [number, number]),
  };

  const steps: EquationStep[] = [];
  let stepNumber = 1;
  const listLatex = fractions.map(latex).join(",\\ ");
  steps.push({
    stepNumber: stepNumber++,
    operationLabel: "Fractions to compare",
    explanation: `We will order ${fractions.map(plain).join(", ")} from smallest to largest.`,
    latexBefore: listLatex,
    latexAfter: listLatex,
    arrowDirection: "simplify",
  });
  steps.push({
    stepNumber: stepNumber++,
    operationLabel: `Find a common denominator (${lcd})`,
    explanation: `The lowest common multiple of the denominators is ${lcd}. Rewrite each fraction with denominator ${lcd}.`,
    rule: "Common denominator",
    why: "Same-sized pieces make comparing fair — like lining up on a number line.",
    latexBefore: listLatex,
    latexAfter: equiv.map((e) => latex(e.converted)).join(",\\ "),
    arrowDirection: "simplify",
  });
  for (const e of equiv) {
    const mult = lcd / e.original.d;
    steps.push({
      stepNumber: stepNumber++,
      operationLabel: `Convert ${plain(e.original)}`,
      explanation: `Multiply top and bottom by ${mult}: ${plain(e.original)} = ${plain(e.converted)}.`,
      latexBefore: latex(e.original),
      latexAfter: latex(e.converted),
      arrowDirection: "simplify",
    });
  }
  // Bus-stop style decimal check for each
  for (const f of fractions) {
    steps.push({
      stepNumber: stepNumber++,
      operationLabel: `Bus stop: ${f.n} ÷ ${f.d}`,
      explanation: `Divide ${f.n} by ${f.d} (short division / bus stop) ≈ ${decimalApprox(f)}.`,
      rule: "Short division",
      why: "Turning each fraction into a decimal is another way to compare size.",
      latexBefore: `${f.n} \\div ${f.d}`,
      latexAfter: decimalApprox(f),
      arrowDirection: "simplify",
    });
  }
  const orderedPlain = sorted.map((s) => plain(s.original)).join(", ");
  const orderedLatex = sorted.map((s) => latex(s.original)).join(",\\ ");
  steps.push({
    stepNumber: stepNumber++,
    operationLabel: "Order smallest → largest",
    explanation: `On the number line (and by common denominator), the order is ${orderedPlain}.`,
    latexBefore: listLatex,
    latexAfter: orderedLatex,
    arrowDirection: "simplify",
    selfCheck: `Check: each marker sits at the right place between 0 and 1.`,
  });

  const equationBlock: EquationStepBlock = {
    type: "equation_steps",
    steps,
  };

  const teachingSteps: TeachingStep[] = [
    {
      title: "Find a common denominator",
      explanation: `Rewrite each fraction with denominator ${lcd}.`,
      why: "Equal-sized pieces make comparing fair.",
      narration: `Let's find a common denominator. The LCD is ${lcd}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    ...equiv.map((e) => ({
      title: `Convert ${plain(e.original)}`,
      explanation: `${plain(e.original)} = ${plain(e.converted)}.`,
      why: `Multiply top and bottom by ${lcd / e.original.d}.`,
      narration: `${plain(e.original)} becomes ${plain(e.converted)}.`,
      cellKeys: [] as string[],
      carryKeys: [] as string[],
      noteKeys: [] as string[],
    })),
    {
      title: "Place on the number line",
      explanation: `Mark ${fractions.map(plain).join(", ")} between 0 and 1.`,
      why: "Further right means larger.",
      narration: `Now place each fraction on the number line from 0 to 1.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Bus-stop decimals (check)",
      explanation: fractions
        .map((f) => `${plain(f)} ≈ ${decimalApprox(f)}`)
        .join("; "),
      why: "Dividing numerator by denominator confirms the order.",
      narration: `We can also divide to get decimals and check.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Order smallest to largest",
      explanation: orderedPlain,
      why: "Compare the rewritten numerators (or the positions on the line).",
      narration: `From smallest to largest: ${orderedPlain}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    },
  ];

  return {
    builderId: "fraction_number_line",
    block: line,
    extraBlocks: [table, equationBlock],
    teachingSteps,
    captions: teachingSteps.map((s) => `${s.title}: ${s.explanation}`),
    answer: orderedPlain,
    intro: `Let's compare these fractions using a common denominator and a number line from 0 to 1.`,
  };
}
