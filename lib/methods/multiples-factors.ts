/**
 * Multiples on a number line / factor-pair table builders for KS2.
 */

import type { NumberLineBlock, TableBlock, VisualBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export type MultiplesProblem =
  | { kind: "multiples"; n: number; count: number }
  | {
      kind: "common_multiples";
      a: number;
      b: number;
      greaterThan?: number;
      atLeast?: number;
      lessThan?: number;
      findAll?: boolean;
    }
  | { kind: "factors"; n: number };

function positivePair(aRaw: string, bRaw: string): [number, number] | null {
  const a = parseInt(aRaw, 10);
  const b = parseInt(bRaw, 10);
  return Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0
    ? [a, b]
    : null;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

function sequenceThrough(base: number, end: number): number[] {
  const count = Math.floor(end / base);
  if (count <= 12) {
    return Array.from({ length: count }, (_, index) => base * (index + 1));
  }
  const first = Array.from({ length: 6 }, (_, index) => base * (index + 1));
  const last = Array.from(
    { length: 6 },
    (_, index) => base * (count - 5 + index),
  );
  return [...new Set([...first, ...last])].sort((left, right) => left - right);
}

function formatSequence(values: number[], base: number): string {
  return values
    .map((value, index) =>
      index > 0 && value - values[index - 1] > base
        ? `… ${value}`
        : String(value),
    )
    .join(", ");
}

export function parseMultiplesQuestion(text: string): MultiplesProblem | null {
  const t = normalizeMathText(text);

  const common =
    t.match(
      /(?:common|shared|lowest common|least common)\s+multiples?(?:\s+of)?\s+(\d+)\s+(?:and|&)\s+(\d+)/i,
    ) ||
    t.match(
      /multiples?\s+of\s+(?:both\s+)?(\d+)\s+(?:and|&)\s+(\d+)/i,
    ) ||
    t.match(/\blcm\s+(?:of\s+)?(\d+)\s+(?:and|&)\s+(\d+)/i);
  if (common) {
    const pair = positivePair(common[1], common[2]);
    if (pair) {
      const greater = t.match(/(?:greater|more)\s+than\s+(\d+)|above\s+(\d+)/i);
      const atLeast = t.match(/at\s+least\s+(\d+)/i);
      const between = t.match(/between\s+(\d+)\s+and\s+(\d+)/i);
      const less = t.match(/(?:less\s+than|below|under)\s+(\d+)/i);
      return {
        kind: "common_multiples",
        a: pair[0],
        b: pair[1],
        greaterThan: between
          ? parseInt(between[1], 10)
          : greater
            ? parseInt(greater[1] || greater[2], 10)
            : undefined,
        atLeast: atLeast ? parseInt(atLeast[1], 10) : undefined,
        lessThan: between
          ? parseInt(between[2], 10)
          : less
            ? parseInt(less[1], 10)
            : undefined,
        findAll:
          /\b(?:find|list|write)\s+(?:all\s+|the\s+)?common multiples\b/i.test(t) &&
          !/\b(?:smallest|first)\b/i.test(t),
      };
    }
  }

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
  problem: MultiplesProblem,
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

  if (problem.kind === "common_multiples") {
    const { a, b } = problem;
    const commonStep = lcm(a, b);
    const lowerExclusive = problem.greaterThan ?? -1;
    const lowerInclusive = problem.atLeast ?? 0;
    const minimum = Math.max(lowerExclusive + 1, lowerInclusive, 1);
    const firstAnswer = Math.ceil(minimum / commonStep) * commonStep;
    if (problem.lessThan !== undefined && firstAnswer >= problem.lessThan) {
      throw new Error("No common multiple satisfies the stated range");
    }

    const answerValues = [firstAnswer];
    if (problem.findAll && problem.lessThan !== undefined) {
      for (
        let value = firstAnswer + commonStep;
        value < problem.lessThan;
        value += commonStep
      ) {
        answerValues.push(value);
      }
    }
    const answer = answerValues[answerValues.length - 1];

    const aValues = sequenceThrough(a, answer);
    const bValues = sequenceThrough(b, answer);
    const values = [...new Set([...aValues, ...bValues, ...answerValues])].sort(
      (left, right) => left - right,
    );
    const rows: string[][] = [];
    values.forEach((value, index) => {
      if (
        index > 0 &&
        value - values[index - 1] > Math.max(a, b) * 2
      ) {
        rows.push(["…", "…"]);
      }
      rows.push([
        value % a === 0 ? String(value) : "",
        value % b === 0 ? String(value) : "",
      ]);
    });
    const answerRows = rows
      .map((row, index) =>
        answerValues.includes(Number(row[0])) &&
        answerValues.includes(Number(row[1]))
          ? index
          : -1,
      )
      .filter((index) => index >= 0);
    const table: TableBlock = {
      type: "table",
      headers: [`Multiples of ${a}`, `Multiples of ${b}`],
      rows,
      caption:
        problem.greaterThan !== undefined && problem.lessThan !== undefined
          ? `Build both lists from their first multiple, then apply “between ${problem.greaterThan} and ${problem.lessThan}”.`
          : problem.greaterThan !== undefined
          ? `Build both lists from their first multiple, then apply “greater than ${problem.greaterThan}”.`
          : problem.lessThan !== undefined
            ? `Build both lists from their first multiple, then check the stated range.`
            : "Build both ordered lists from their first multiple.",
      highlightCells:
        answerRows.length > 0
          ? answerRows.flatMap((row) => [
              [row, 0] as [number, number],
              [row, 1] as [number, number],
            ])
          : undefined,
    };

    const condition =
      problem.greaterThan !== undefined && problem.lessThan !== undefined
        ? `Only shared multiples between ${problem.greaterThan} and ${problem.lessThan} count.`
        : problem.greaterThan !== undefined
        ? `Only shared multiples greater than ${problem.greaterThan} count.`
        : problem.atLeast !== undefined
          ? `Only shared multiples from ${problem.atLeast} onwards count.`
          : problem.lessThan !== undefined
            ? `The shared multiple must also be below ${problem.lessThan}.`
            : "We need the first number that appears in both lists.";
    const teachingSteps: TeachingStep[] = [
      {
        title: `Start the ${a} sequence at ${a}`,
        explanation: `${formatSequence(aValues, a)}. Start with one group of ${a}, then add ${a} each time.`,
        why: `These are the multiples of ${a} in increasing order.`,
        narration: `Start at ${a} and count on in equal jumps of ${a}.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
      },
      {
        title: `Start the ${b} sequence at ${b}`,
        explanation: `${formatSequence(bValues, b)}. Start with one group of ${b}, then add ${b} each time.`,
        why: `These are the multiples of ${b} in increasing order.`,
        narration: `Start at ${b} and count on in equal jumps of ${b}.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
      },
      {
        title: "Apply the condition",
        explanation: condition,
        why: "A number must satisfy both the common-multiple rule and the question's range.",
        narration: condition,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
      },
      {
        title: problem.findAll ? "Find every allowed shared multiple" : "Find the first shared multiple",
        explanation: problem.findAll
          ? `${answerValues.join(", ")} are all the allowed numbers that appear in both ordered lists.`
          : `${firstAnswer} is the first allowed number that appears in both ordered lists.`,
        why: problem.findAll
          ? `Each answer divides exactly by ${a} and ${b}, and there are no other shared multiples in the range.`
          : `${firstAnswer} ÷ ${a} and ${firstAnswer} ÷ ${b} are both whole numbers.`,
        narration: problem.findAll
          ? `The allowed shared multiples are ${answerValues.join(", ")}.`
          : `The first allowed shared multiple is ${firstAnswer}.`,
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
      captions: teachingSteps.map((step) => step.explanation),
      answer: answerValues.join(", "),
      intro: `Start at ${a} and ${b}, build both multiple sequences in order, then compare them.`,
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

function numericColumn(block: TableBlock, column: number): number[] {
  return block.rows
    .map((row) => Number(row[column]))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function isOrderedMultiples(values: number[], base: number): boolean {
  return (
    values.length > 0 &&
    values[0] === base &&
    values.every((value, index) =>
      index === 0 ? true : value > values[index - 1] && value % base === 0,
    )
  );
}

/** Check that a multiples visual begins at one group and grows in order. */
export function validateMultiplesVisual(
  block: VisualBlock,
  question: string,
): string[] {
  const parsed = parseMultiplesQuestion(question);
  if (!parsed || parsed.kind === "factors") return [];

  if (parsed.kind === "multiples") {
    if (block.type === "number_line") {
      const values = (block.markers || [])
        .map((marker) => marker.value)
        .filter((value): value is number => Number.isFinite(value));
      return isOrderedMultiples(values, parsed.n)
        ? []
        : [`The multiples of ${parsed.n} must start at ${parsed.n} and move upwards in multiples of ${parsed.n}.`];
    }
    if (block.type === "table") {
      const headerIndex = block.headers.findIndex((header) =>
        new RegExp(`multiples?\\s+of\\s+${parsed.n}\\b`, "i").test(header),
      );
      const values = numericColumn(block, Math.max(0, headerIndex));
      return isOrderedMultiples(values, parsed.n)
        ? []
        : [`The multiples of ${parsed.n} must start at ${parsed.n} and move upwards in multiples of ${parsed.n}.`];
    }
    return [];
  }

  if (block.type !== "table") {
    return ["Common multiples need two ordered lists so both starting multiples can be checked."];
  }
  const aColumn = block.headers.findIndex((header) =>
    new RegExp(`multiples?\\s+of\\s+${parsed.a}\\b`, "i").test(header),
  );
  const bColumn = block.headers.findIndex((header) =>
    new RegExp(`multiples?\\s+of\\s+${parsed.b}\\b`, "i").test(header),
  );
  if (aColumn < 0 || bColumn < 0) {
    return [`The table must have separate labelled lists for ${parsed.a} and ${parsed.b}.`];
  }
  const aValues = numericColumn(block, aColumn);
  const bValues = numericColumn(block, bColumn);
  const errors: string[] = [];
  if (!isOrderedMultiples(aValues, parsed.a)) {
    errors.push(`The ${parsed.a} sequence must start at ${parsed.a} and move upwards in multiples of ${parsed.a}.`);
  }
  if (!isOrderedMultiples(bValues, parsed.b)) {
    errors.push(`The ${parsed.b} sequence must start at ${parsed.b} and move upwards in multiples of ${parsed.b}.`);
  }
  return errors;
}
