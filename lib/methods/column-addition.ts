/**
 * Deterministic column addition / subtraction builders for Year 5/6.
 */

import type { ColumnMethodBlock, ColumnMethodMove } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

const PLACE = ["ones", "tens", "hundreds", "thousands", "ten-thousands"];

function placeLabel(fromRight: number): string {
  return PLACE[fromRight] || "next";
}

export function buildColumnAddition(a: number, b: number): MethodBuildResult {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    throw new Error("column addition requires non-negative integers");
  }
  const sum = a + b;
  const aStr = String(a);
  const bStr = String(b);
  const sumStr = String(sum);
  const gridCols = Math.max(aStr.length, bStr.length, sumStr.length);
  const rows = [aStr, `+${bStr}`, sumStr];

  const carries: { row: number; col: number; digit: string }[] = [];
  const moves: ColumnMethodMove[] = [];
  const teachingSteps: TeachingStep[] = [];

  const setup: string[] = [];
  for (let ci = 0; ci < gridCols; ci++) {
    if (ci >= gridCols - aStr.length) setup.push(cellKey(0, ci));
    if (ci >= gridCols - bStr.length) setup.push(cellKey(1, ci));
  }
  teachingSteps.push({
    title: "Set up the columns",
    explanation: `Write ${a} and ${b} in columns, ones under ones.`,
    why: "Lining up place value stops us adding the wrong digits.",
    narration: `Let's add ${a} + ${b} using the column method.`,
    cellKeys: setup,
    carryKeys: [],
    noteKeys: [],
  });

  let carry = 0;
  for (let i = 0; i < gridCols; i++) {
    const col = gridCols - 1 - i;
    const da = digitAt(aStr, gridCols, col);
    const db = digitAt(bStr, gridCols, col);
    const raw = da + db + carry;
    const write = raw % 10;
    const carryOut = Math.floor(raw / 10);
    const cellKeys = [cellKey(2, col)];
    const carryKeys: string[] = [];

    if (carryOut > 0 && col - 1 >= 0) {
      carries.push({ row: 0, col: col - 1, digit: String(carryOut) });
      moves.push({
        fromRow: 2,
        fromCol: col,
        toRow: 0,
        toCol: col - 1,
        label: `carry ${carryOut}`,
        kind: "carry",
      });
      carryKeys.push(cellKey(0, col - 1));
    }

    teachingSteps.push({
      title: `Add the ${placeLabel(i)}`,
      explanation:
        carry > 0
          ? `${da} + ${db} + carry ${carry} = ${raw}. Write ${write}${carryOut ? ` and carry ${carryOut}` : ""}.`
          : `${da} + ${db} = ${raw}. Write ${write}${carryOut ? ` and carry ${carryOut}` : ""}.`,
      why: carryOut
        ? `Ten ${placeLabel(i)} make one ${placeLabel(i + 1)} — that's the carry.`
        : undefined,
      narration:
        carry > 0
          ? `In the ${placeLabel(i)}: ${da} plus ${db} plus the carry ${carry} is ${raw}. Write ${write}${carryOut ? ` and carry ${carryOut}` : ""}.`
          : `In the ${placeLabel(i)}: ${da} plus ${db} is ${raw}. Write ${write}${carryOut ? ` and carry ${carryOut}` : ""}.`,
      cellKeys,
      carryKeys,
      noteKeys: [],
      showAnswer: i === gridCols - 1,
    });
    carry = carryOut;
  }

  const block: ColumnMethodBlock = {
    type: "column_method",
    method: "column_addition",
    rows,
    carries,
    moves,
    separatorAfterRows: [1],
    placeValueHeaders:
      gridCols <= 4 ? [...(["Th", "H", "T", "O"] as const).slice(4 - gridCols)] : undefined,
    question: `${a} + ${b}`,
    answer: sumStr,
  };

  return {
    builderId: "column_addition",
    block,
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
  };
}

export function buildColumnSubtraction(a: number, b: number): MethodBuildResult {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a < b) {
    throw new Error("column subtraction requires non-negative integers with a ≥ b");
  }
  const diff = a - b;
  const aStr = String(a);
  const bStr = String(b);
  const diffStr = String(diff);
  const gridCols = Math.max(aStr.length, bStr.length, diffStr.length);
  const rows = [aStr, `-${bStr}`, diffStr];

  const teachingSteps: TeachingStep[] = [];
  const cellNotes: { row: number; col: number; strike?: boolean; rewrite?: string }[] = [];
  const moves: ColumnMethodMove[] = [];

  const setup: string[] = [];
  for (let ci = 0; ci < gridCols; ci++) {
    if (ci >= gridCols - aStr.length) setup.push(cellKey(0, ci));
    if (ci >= gridCols - bStr.length) setup.push(cellKey(1, ci));
  }
  teachingSteps.push({
    title: "Set up the columns",
    explanation: `Write ${a} on top and ${b} underneath to subtract.`,
    why: "Ones under ones, tens under tens.",
    narration: `Let's subtract ${a} − ${b} using the column method.`,
    cellKeys: setup,
    carryKeys: [],
    noteKeys: [],
  });

  // Work with mutable top digits for borrowing
  const top = aStr.padStart(gridCols, "0").split("").map(Number);
  const bottom = bStr.padStart(gridCols, "0").split("").map(Number);

  for (let i = 0; i < gridCols; i++) {
    const col = gridCols - 1 - i;
    let da = top[col];
    const db = bottom[col];
    const noteKeys: string[] = [];

    if (da < db) {
      // Borrow from the left
      let borrowFrom = col - 1;
      while (borrowFrom >= 0 && top[borrowFrom] === 0) borrowFrom--;
      if (borrowFrom >= 0) {
        top[borrowFrom] -= 1;
        cellNotes.push({ row: 0, col: borrowFrom, strike: true, rewrite: String(top[borrowFrom]) });
        noteKeys.push(cellKey(0, borrowFrom));
        for (let k = borrowFrom + 1; k < col; k++) {
          top[k] = 9;
          cellNotes.push({ row: 0, col: k, strike: true, rewrite: "9" });
          noteKeys.push(cellKey(0, k));
        }
        top[col] += 10;
        cellNotes.push({ row: 0, col, strike: true, rewrite: String(top[col]) });
        noteKeys.push(cellKey(0, col));
        moves.push({
          fromRow: 0,
          fromCol: borrowFrom,
          toRow: 0,
          toCol: col,
          label: "borrow 10",
          kind: "borrow",
        });
        da = top[col];
      }
    }

    const write = da - db;
    teachingSteps.push({
      title: `Subtract the ${placeLabel(i)}`,
      explanation:
        noteKeys.length > 0
          ? `We need to borrow. Then ${da} − ${db} = ${write}.`
          : `${da} − ${db} = ${write}.`,
      why:
        noteKeys.length > 0
          ? "If the top digit is too small, borrow 10 from the next column left."
          : undefined,
      narration:
        noteKeys.length > 0
          ? `In the ${placeLabel(i)}, ${bottom[col]} is bigger than the top digit, so we borrow. Now ${da} take away ${db} is ${write}.`
          : `In the ${placeLabel(i)}: ${da} take away ${db} is ${write}.`,
      cellKeys: [cellKey(2, col)],
      carryKeys: [],
      noteKeys,
      showAnswer: i === gridCols - 1,
    });
  }

  const block: ColumnMethodBlock = {
    type: "column_method",
    method: "column_subtraction",
    rows,
    cellNotes,
    moves,
    separatorAfterRows: [1],
    placeValueHeaders:
      gridCols <= 4 ? [...(["Th", "H", "T", "O"] as const).slice(4 - gridCols)] : undefined,
    question: `${a} − ${b}`,
    answer: diffStr,
  };

  return {
    builderId: "column_subtraction",
    block,
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
  };
}

function digitAt(numStr: string, gridCols: number, col: number): number {
  const idx = col - (gridCols - numStr.length);
  if (idx < 0 || idx >= numStr.length) return 0;
  return Number(numStr[idx]);
}

export function parseAdditionOperands(
  text: string,
): { a: number; b: number } | null {
  const m = normalizeMathText(text).match(/(\d{1,6})\s*\+\s*(\d{1,6})/);
  if (!m) return null;
  return { a: parseInt(m[1], 10), b: parseInt(m[2], 10) };
}

export function parseSubtractionOperands(
  text: string,
): { a: number; b: number } | null {
  const m = normalizeMathText(text).match(/(\d{1,6})\s*-\s*(\d{1,6})/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (a < b) return null;
  return { a, b };
}
