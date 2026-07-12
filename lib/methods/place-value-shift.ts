/**
 * Place-value shift builder for × / ÷ by 10, 100, 1000.
 */

import type { TableBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";

const HEADERS = [
  "Hundred Thousands",
  "Ten Thousands",
  "Thousands",
  "Hundreds",
  "Tens",
  "Ones",
];

function digitsInPlaces(n: number, width = 6): string[] {
  const s = String(Math.abs(n)).padStart(width, " ").slice(-width);
  return s.split("").map((ch) => (ch === " " ? "" : ch));
}

export function buildPlaceValueShift(
  value: number,
  factor: 10 | 100 | 1000,
  operation: "multiply" | "divide",
): MethodBuildResult {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("place-value shift requires a non-negative integer");
  }
  if (operation === "divide" && value % factor !== 0) {
    throw new Error("dividend must be divisible by the factor for this builder");
  }

  const shifts = factor === 10 ? 1 : factor === 100 ? 2 : 3;
  const result =
    operation === "multiply" ? value * factor : value / factor;

  const rows: string[][] = [];
  let current = value;
  rows.push(digitsInPlaces(current));

  const teachingSteps: TeachingStep[] = [];
  teachingSteps.push({
    title: "Start with the number",
    explanation: `Begin with ${value} in the place-value columns.`,
    why: "Each column is ten times the one on its right.",
    narration: `Let's ${operation === "multiply" ? "multiply" : "divide"} ${value} by ${factor}. Here's ${value} in the place-value grid.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
  });

  for (let s = 1; s <= shifts; s++) {
    current = operation === "multiply" ? current * 10 : current / 10;
    rows.push(digitsInPlaces(current));
    teachingSteps.push({
      title: operation === "multiply" ? `× 10 (shift ${s})` : `÷ 10 (shift ${s})`,
      explanation:
        operation === "multiply"
          ? `Multiply by 10: every digit moves one place to the left. Now we have ${current}.`
          : `Divide by 10: every digit moves one place to the right. Now we have ${current}.`,
      why:
        operation === "multiply"
          ? "×10 means each digit is worth ten times as much — one column left."
          : "÷10 means each digit is worth one tenth as much — one column right.",
      narration:
        operation === "multiply"
          ? `Times 10: slide every digit one place left. We get ${current}.`
          : `Divide by 10: slide every digit one place right. We get ${current}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: s === shifts,
    });
  }

  const highlightRow = rows.length - 1;
  const highlightCells: [number, number][] = [];
  rows[highlightRow].forEach((d, ci) => {
    if (d) highlightCells.push([highlightRow, ci]);
  });

  const block: TableBlock = {
    type: "table",
    headers: HEADERS,
    rows,
    caption:
      operation === "multiply"
        ? `Digits shift ${shifts} place${shifts > 1 ? "s" : ""} left when ×${factor}`
        : `Digits shift ${shifts} place${shifts > 1 ? "s" : ""} right when ÷${factor}`,
    highlightCells,
  };

  teachingSteps[teachingSteps.length - 1].explanation += ` So ${value} ${operation === "multiply" ? "×" : "÷"} ${factor} = ${result}.`;

  return {
    builderId: "place_value_shift",
    block,
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
  };
}

import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export function parsePlaceValueShift(
  text: string,
): { value: number; factor: 10 | 100 | 1000; operation: "multiply" | "divide" } | null {
  const normalized = normalizeMathText(text);
  const mult = normalized.match(/(\d{1,6})\s*[×x*]\s*(10|100|1000)\b/);
  if (mult) {
    return {
      value: parseInt(mult[1], 10),
      factor: parseInt(mult[2], 10) as 10 | 100 | 1000,
      operation: "multiply",
    };
  }
  const div = normalized.match(/(\d{1,6})\s*[÷/]\s*(10|100|1000)\b/);
  if (div) {
    const value = parseInt(div[1], 10);
    const factor = parseInt(div[2], 10) as 10 | 100 | 1000;
    if (value % factor !== 0) return null;
    return { value, factor, operation: "divide" };
  }
  return null;
}
