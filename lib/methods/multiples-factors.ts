/**
 * Multiples on a number line / factor-pair table builders for KS2.
 */

import type { NumberLineBlock, TableBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export function parseMultiplesQuestion(
  text: string,
): { kind: "multiples"; n: number; count: number } | { kind: "factors"; n: number } | null {
  const t = normalizeMathText(text);
  const mult = t.match(
    /(?:first\s+)?(\d+)?\s*multiples?\s+of\s+(\d+)|multiples?\s+of\s+(\d+)/i,
  );
  if (mult || /\bmultiples?\b/i.test(t)) {
    const n = parseInt(mult?.[2] || mult?.[3] || "", 10);
    const count = parseInt(mult?.[1] || "10", 10) || 10;
    if (Number.isFinite(n) && n > 0) {
      return { kind: "multiples", n, count: Math.min(Math.max(count, 5), 12) };
    }
  }
  const fac = t.match(/factors?\s+of\s+(\d+)/i);
  if (fac) {
    const n = parseInt(fac[1], 10);
    if (Number.isFinite(n) && n > 0) return { kind: "factors", n };
  }
  return null;
}

export function buildMultiplesFactors(
  problem:
    | { kind: "multiples"; n: number; count: number }
    | { kind: "factors"; n: number },
): MethodBuildResult {
  if (problem.kind === "multiples") {
    const { n, count } = problem;
    const values = Array.from({ length: count }, (_, i) => n * (i + 1));
    const line: NumberLineBlock = {
      type: "number_line",
      range: [0, values[values.length - 1]],
      tickInterval: n,
      markers: values.map((v) => ({
        value: v,
        label: String(v),
        style: "filled" as const,
      })),
    };
    const teachingSteps: TeachingStep[] = [
      {
        title: `Skip-count in ${n}s`,
        explanation: `The first ${count} multiples of ${n} are ${values.join(", ")}.`,
        why: `Each jump adds another ${n}.`,
        narration: `Let's mark the multiples of ${n} on a number line.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
        showAnswer: true,
      },
    ];
    return {
      builderId: "multiples_number_line",
      block: line,
      teachingSteps,
      captions: teachingSteps.map((s) => s.explanation),
      answer: values.join(", "),
      intro: `Multiples of ${n} — jump along the number line in steps of ${n}.`,
    };
  }

  const { n } = problem;
  const factors: number[] = [];
  for (let i = 1; i <= n; i++) {
    if (n % i === 0) factors.push(i);
  }
  const pairs: string[][] = [];
  for (let i = 0; i < Math.ceil(factors.length / 2); i++) {
    const a = factors[i];
    const b = factors[factors.length - 1 - i];
    if (a <= b) pairs.push([String(a), String(b), `${a} × ${b} = ${n}`]);
  }
  const table: TableBlock = {
    type: "table",
    headers: ["Factor", "Partner", "Check"],
    rows: pairs,
    caption: `Factor pairs of ${n}`,
  };
  const teachingSteps: TeachingStep[] = [
    {
      title: `Factor pairs of ${n}`,
      explanation: `The factors of ${n} are ${factors.join(", ")}.`,
      why: "Factors come in pairs that multiply to make the number.",
      narration: `Let's list factor pairs of ${n}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    },
  ];
  return {
    builderId: "multiples_number_line",
    block: table,
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
    answer: factors.join(", "),
    intro: `Find all factor pairs of ${n}.`,
  };
}
