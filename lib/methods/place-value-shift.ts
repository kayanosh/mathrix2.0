/**
 * Place-value shift builder for × / ÷ by 10, 100, 1000.
 */

import type { EquationStepBlock, TableBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

const PLACE_NAMES: Record<number, string> = {
  6: "Millions",
  5: "Hundred Thousands",
  4: "Ten Thousands",
  3: "Thousands",
  2: "Hundreds",
  1: "Tens",
  0: "Ones",
  [-1]: "Tenths",
  [-2]: "Hundredths",
  [-3]: "Thousandths",
  [-4]: "Ten-thousandths",
  [-5]: "Hundred-thousandths",
  [-6]: "Millionths",
};

function plain(value: number): string {
  return String(Number(value.toFixed(10)));
}

function occupiedPlaces(value: number): { max: number; min: number } {
  const [wholeRaw, fractionRaw = ""] = plain(Math.abs(value)).split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "");
  const fraction = fractionRaw.replace(/0+$/, "");
  return {
    max: Math.max(0, whole.length - 1),
    min: fraction.length > 0 ? -fraction.length : 0,
  };
}

function digitsInPlaces(value: number, max: number, min: number): string[] {
  const [wholeRaw, fractionRaw = ""] = plain(Math.abs(value)).split(".");
  const whole = wholeRaw.padStart(max + 1, "0");
  const fraction = fractionRaw.padEnd(Math.max(0, -min), "0");
  return Array.from({ length: max - min + 1 }, (_, index) => {
    const exponent = max - index;
    if (exponent >= 0) {
      const offset = whole.length - 1 - exponent;
      const digit = whole[offset] || "0";
      return digit === "0" && exponent > occupiedPlaces(value).max ? "" : digit;
    }
    return fraction[-exponent - 1] || "0";
  });
}

export function buildPlaceValueShift(
  value: number,
  factor: 10 | 100 | 1000,
  operation: "multiply" | "divide",
): MethodBuildResult {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("place-value shift requires a non-negative number");
  }

  const shifts = factor === 10 ? 1 : factor === 100 ? 2 : 3;
  const result = Number(
    (operation === "multiply" ? value * factor : value / factor).toFixed(10),
  );

  let current = value;
  const values = [value];
  for (let shift = 1; shift <= shifts; shift += 1) {
    current = Number(
      (operation === "multiply" ? current * 10 : current / 10).toFixed(10),
    );
    values.push(current);
  }
  const maxPlace = Math.max(...values.map((item) => occupiedPlaces(item).max));
  const minPlace = Math.min(...values.map((item) => occupiedPlaces(item).min));
  const headers = Array.from(
    { length: maxPlace - minPlace + 1 },
    (_, index) => PLACE_NAMES[maxPlace - index] || `10^${maxPlace - index}`,
  );
  const rows = values.map((item) => digitsInPlaces(item, maxPlace, minPlace));

  const teachingSteps: TeachingStep[] = [];
  teachingSteps.push({
    title: "Start with the number",
    explanation: `Begin with ${plain(value)} in the place-value columns.`,
    why: "Each column is ten times the one on its right.",
    narration: `Let's ${operation === "multiply" ? "multiply" : "divide"} ${plain(value)} by ${factor}. Here's ${plain(value)} in the place-value grid.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
  });

  for (let s = 1; s <= shifts; s++) {
    current = values[s];
    teachingSteps.push({
      title: operation === "multiply" ? `× 10 (shift ${s})` : `÷ 10 (shift ${s})`,
      explanation:
        operation === "multiply"
          ? `Multiply by 10: every digit moves one place to the left. Now we have ${plain(current)}.`
          : `Divide by 10: every digit moves one place to the right. Now we have ${plain(current)}.`,
      why:
        operation === "multiply"
          ? "×10 means each digit is worth ten times as much — one column left."
          : "÷10 means each digit is worth one tenth as much — one column right.",
      narration:
        operation === "multiply"
          ? `Times 10: slide every digit one place left. We get ${plain(current)}.`
          : `Divide by 10: slide every digit one place right. We get ${plain(current)}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: false,
    });
  }

  teachingSteps.push({
    title: "Check the final place value",
    explanation: `${plain(value)} ${operation === "multiply" ? "×" : "÷"} ${factor} = ${plain(result)}.`,
    why:
      operation === "multiply"
        ? `The digits moved ${shifts} place${shifts === 1 ? "" : "s"} left.`
        : `The digits moved ${shifts} place${shifts === 1 ? "" : "s"} right.`,
    narration: `The final answer is ${plain(result)}.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });

  const highlightRow = rows.length - 1;
  const highlightCells: [number, number][] = [];
  rows[highlightRow].forEach((d, ci) => {
    if (d) highlightCells.push([highlightRow, ci]);
  });

  const block: TableBlock = {
    type: "table",
    headers,
    rows,
    caption:
      operation === "multiply"
        ? `Digits shift ${shifts} place${shifts > 1 ? "s" : ""} left when ×${factor}`
        : `Digits shift ${shifts} place${shifts > 1 ? "s" : ""} right when ÷${factor}`,
    highlightCells,
  };

  const equationSteps: EquationStepBlock = {
    type: "equation_steps",
    steps: [
      {
        stepNumber: 1,
        operationLabel: "Start",
        explanation: "Write the starting number in the place-value table.",
        latexBefore: plain(value),
        latexAfter: plain(value),
        arrowDirection: "down",
        rule: "Place value",
      },
      ...values.slice(1).map((next, index) => ({
        stepNumber: index + 2,
        operationLabel: operation === "multiply" ? "× 10" : "÷ 10",
        explanation:
          operation === "multiply"
            ? "Move every digit one place left."
            : "Move every digit one place right.",
        latexBefore: plain(values[index]),
        latexAfter: `${plain(values[index])} ${operation === "multiply" ? "\\times" : "\\div"} 10 = ${plain(next)}`,
        arrowDirection: "simplify" as const,
        rule: "Place value",
        why:
          operation === "multiply"
            ? "Each digit becomes ten times as valuable."
            : "Each digit becomes one tenth as valuable.",
        selfCheck:
          index === values.length - 2
            ? `${plain(value)} ${operation === "multiply" ? "×" : "÷"} ${factor} = ${plain(result)} ✓`
            : undefined,
      })),
    ],
  };

  return {
    builderId: "place_value_shift",
    block,
    extraBlocks: [equationSteps],
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
    answer: plain(result),
    intro: `Use place value to work out ${plain(value)} ${operation === "multiply" ? "×" : "÷"} ${factor}.`,
  };
}

export function parsePlaceValueShift(
  text: string,
): { value: number; factor: 10 | 100 | 1000; operation: "multiply" | "divide" } | null {
  const normalized = normalizeMathText(text);
  const mult = normalized.match(
    /(\d{1,6}(?:\.\d{1,6})?)\s*(?:[×x*]|times\b|multiplied\s+by\b)\s*(10|100|1000)\b/i,
  );
  if (mult) {
    return {
      value: parseFloat(mult[1]),
      factor: parseInt(mult[2], 10) as 10 | 100 | 1000,
      operation: "multiply",
    };
  }
  const div = normalized.match(
    /(\d{1,6}(?:\.\d{1,6})?)\s*(?:[÷/]|divided\s+by\b)\s*(10|100|1000)\b/i,
  );
  if (div) {
    const value = parseFloat(div[1]);
    const factor = parseInt(div[2], 10) as 10 | 100 | 1000;
    return { value, factor, operation: "divide" };
  }
  return null;
}
