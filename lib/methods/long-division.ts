/**
 * Deterministic long-division (bus-stop) builder for Year 5/6.
 * Full working rows + digit-level TeachingStep[] aligned to the grid.
 */

import type { ColumnMethodBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

function rowKeys(row: number, text: string, width: number): string[] {
  const padded = text.padStart(width, " ");
  const keys: string[] = [];
  for (let ci = 0; ci < width; ci++) {
    if (padded[ci] !== " ") keys.push(cellKey(row, ci));
  }
  return keys;
}

interface Stage {
  qDigit: number;
  current: number;
  product: number;
  remainder: number;
  /** Index of last dividend digit included in `current` */
  endDigitIndex: number;
  bringDown?: string;
}

function planStages(dividend: number, divisor: number): Stage[] {
  const digits = String(dividend).split("").map(Number);
  const stages: Stage[] = [];
  let i = 0;
  let current = 0;
  let started = false;

  while (i < digits.length) {
    current = current * 10 + digits[i];
    const endDigitIndex = i;
    i += 1;

    if (!started && current < divisor && i < digits.length) {
      continue;
    }
    started = true;

    const qDigit = Math.floor(current / divisor);
    const product = qDigit * divisor;
    const remainder = current - product;
    const stage: Stage = {
      qDigit,
      current,
      product,
      remainder,
      endDigitIndex,
    };
    if (i < digits.length) {
      stage.bringDown = String(digits[i]);
    }
    stages.push(stage);
    current = remainder;
  }

  return stages;
}

/**
 * Build bus-stop long division. Example: buildLongDivision(384, 12) → 32
 */
export function buildLongDivision(
  dividend: number,
  divisor: number,
): MethodBuildResult {
  if (
    !Number.isInteger(dividend) ||
    !Number.isInteger(divisor) ||
    dividend < 0 ||
    divisor <= 0
  ) {
    throw new Error(
      "long division requires non-negative dividend and positive divisor",
    );
  }

  const quotient = Math.floor(dividend / divisor);
  const remFinal = dividend % divisor;
  const dStr = String(dividend);
  const qStr = String(quotient);
  const divStr = String(divisor);
  const stages = planStages(dividend, divisor);

  const left = divStr.length + 1; // "12)"
  const width = left + dStr.length;

  const placeAt = (value: string, endCol: number): string => {
    const start = endCol - value.length + 1;
    return (" ".repeat(Math.max(0, start)) + value).padEnd(width, " ");
  };

  const rows: string[] = [];
  // Quotient digits sit above the dividend digit that completed each stage
  const qRow = Array.from({ length: width }, () => " ");
  stages.forEach((stage, si) => {
    const col = left + stage.endDigitIndex;
    const ch = qStr[si] ?? String(stage.qDigit);
    if (col >= 0 && col < width) qRow[col] = ch;
  });
  rows.push(qRow.join(""));
  rows.push(`${divStr})${dStr}`.padEnd(width, " "));

  const teachingSteps: TeachingStep[] = [];
  teachingSteps.push({
    title: "Set up the bus stop",
    explanation: `Write ${dividend} inside the bracket and ${divisor} outside.`,
    why: "The bus-stop layout keeps the quotient on top as we work left to right.",
    narration: `Let's divide ${dividend} ÷ ${divisor} using long division. ${dividend} goes inside; ${divisor} sits outside.`,
    cellKeys: rowKeys(1, rows[1], width),
    carryKeys: [],
    noteKeys: [],
  });

  stages.forEach((stage, si) => {
    const endCol = left + stage.endDigitIndex;
    const qCol = endCol;
    const productRow = rows.length;
    rows.push(placeAt(String(stage.product), endCol));

    const afterRow = rows.length;
    if (stage.bringDown !== undefined) {
      // Remainder + brought-down digit under the next column
      rows.push(placeAt(`${stage.remainder}${stage.bringDown}`, endCol + 1));
    } else {
      rows.push(placeAt(String(stage.remainder), endCol));
    }

    teachingSteps.push({
      title: `Divide ${stage.current}`,
      explanation: `${divisor} goes into ${stage.current} ${stage.qDigit} time${
        stage.qDigit === 1 ? "" : "s"
      }. Write ${stage.qDigit} on top.`,
      why: "We write the next quotient digit above the place we're working on.",
      narration: `How many times does ${divisor} go into ${stage.current}? ${stage.qDigit}. Write ${stage.qDigit} on top.`,
      cellKeys: [cellKey(0, qCol)],
      carryKeys: [],
      noteKeys: [],
    });

    teachingSteps.push({
      title: `Multiply ${stage.qDigit} × ${divisor}`,
      explanation: `${stage.qDigit} × ${divisor} = ${stage.product}. Write ${stage.product} under ${stage.current}.`,
      why: "Multiply back to see how much to take away.",
      narration: `${stage.qDigit} times ${divisor} is ${stage.product}. Write that underneath.`,
      cellKeys: rowKeys(productRow, rows[productRow], width),
      carryKeys: [],
      noteKeys: [],
    });

    teachingSteps.push({
      title: stage.bringDown !== undefined ? "Subtract and bring down" : "Subtract",
      explanation:
        stage.bringDown !== undefined
          ? `${stage.current} − ${stage.product} = ${stage.remainder}. Bring down the ${stage.bringDown}.`
          : `${stage.current} − ${stage.product} = ${stage.remainder}.`,
      why: "Subtract, then bring down the next digit to continue.",
      narration:
        stage.bringDown !== undefined
          ? `${stage.current} take away ${stage.product} leaves ${stage.remainder}. Bring down ${stage.bringDown}.`
          : `${stage.current} take away ${stage.product} leaves ${stage.remainder}.`,
      cellKeys: rowKeys(afterRow, rows[afterRow], width),
      carryKeys: [],
      noteKeys: [],
      showAnswer: si === stages.length - 1 && remFinal === 0,
    });
  });

  const answer =
    remFinal === 0 ? String(quotient) : `${quotient} r ${remFinal}`;

  teachingSteps.push({
    title: "Answer",
    explanation:
      remFinal === 0
        ? `So ${dividend} ÷ ${divisor} = ${quotient}.`
        : `So ${dividend} ÷ ${divisor} = ${quotient} remainder ${remFinal}.`,
    narration:
      remFinal === 0
        ? `The digits on top give the answer: ${dividend} ÷ ${divisor} equals ${quotient}.`
        : `The answer is ${quotient} remainder ${remFinal}.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });

  const seps: number[] = [0];
  for (let ri = 2; ri < rows.length - 1; ri += 2) seps.push(ri);

  const block: ColumnMethodBlock = {
    type: "column_method",
    method: "long_division",
    rows,
    separatorAfterRows: seps,
    question: `${dividend} ÷ ${divisor}`,
    answer,
  };

  return {
    builderId: "long_division",
    block,
    teachingSteps,
    captions: teachingSteps
      .filter((s) => s.title !== "Answer")
      .map((s) => s.explanation),
  };
}

export function parseDivisionOperands(
  text: string,
): { a: number; b: number } | null {
  const m = normalizeMathText(text).match(
    /(\d{1,6})\s*(?:[÷/]|divided\s+by\b)\s*(\d{1,6})/i,
  );
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (b === 0) return null;
  return { a, b };
}
