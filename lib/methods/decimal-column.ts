/**
 * Deterministic decimal column builder for Year 5/6.
 * Place-value-aware + / − / × with the decimal point held in a fixed column.
 */

import type { ColumnMethodBlock, ColumnMethodMove } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

export type DecimalOp = "add" | "subtract" | "multiply";

export interface DecimalProblem {
  a: number;
  b: number;
  op: DecimalOp;
}

function decimalPlaces(n: number): number {
  const s = String(n);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

function trimTrailingZeros(n: number): string {
  const s = String(n);
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "") || "0";
}

function formatFixed(n: number, places: number): string {
  return n.toFixed(places);
}

function headersFor(width: number, decimalCol: number): string[] {
  const leftPlaces = ["O", "T", "H", "Th", "TTh", "HTh"];
  const rightPlaces = ["t", "h", "th", "tth"];
  const headers: string[] = [];
  for (let ci = 0; ci < width; ci++) {
    if (ci === decimalCol) {
      headers.push(".");
      continue;
    }
    if (ci < decimalCol) {
      headers.push(leftPlaces[decimalCol - 1 - ci] || "");
    } else {
      headers.push(rightPlaces[ci - decimalCol - 1] || "");
    }
  }
  return headers;
}

function digitAt(row: string, col: number): number {
  const ch = row[col];
  return ch && /\d/.test(ch) ? parseInt(ch, 10) : 0;
}

export function buildDecimalColumn(problem: DecimalProblem): MethodBuildResult {
  const { a, b, op } = problem;
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error("decimal column requires finite numbers");
  }
  if (op === "subtract" && a < b) {
    throw new Error("decimal subtraction requires a ≥ b for this builder");
  }
  if (op === "multiply") return buildDecimalMultiply(a, b);

  const places = Math.max(decimalPlaces(a), decimalPlaces(b));
  const scale = 10 ** places;
  const ai = Math.round(a * scale);
  const bi = Math.round(b * scale);
  const ri = op === "add" ? ai + bi : ai - bi;
  const result = ri / scale;

  const aStr = formatFixed(a, places);
  const bStr = formatFixed(b, places);
  const rStr = formatFixed(result, places);
  const opChar = op === "add" ? "+" : "−";

  // Operator sits left of the second operand; pad so decimal points align.
  const width = Math.max(aStr.length, bStr.length + 1, rStr.length);
  const pad = (s: string) => s.padStart(width, " ");
  const row0 = pad(aStr);
  const row1Core = pad(bStr);
  // Place operator in the space immediately left of the first non-space of b
  const first = row1Core.search(/\S/);
  const row1Chars = row1Core.split("");
  if (first > 0) row1Chars[first - 1] = opChar;
  else row1Chars.unshift(opChar);
  const row1 = row1Chars.join("").padStart(width, " ").slice(-width);
  const row2 = pad(rStr);
  const rows = [row0, row1, row2];
  const decimalCol = row0.indexOf(".");
  const placeValueHeaders =
    decimalCol >= 0 ? headersFor(width, decimalCol) : undefined;

  const teachingSteps: TeachingStep[] = [];
  const setupKeys: string[] = [];
  for (let ri = 0; ri < 2; ri++) {
    for (let ci = 0; ci < width; ci++) {
      if (rows[ri][ci] !== " ") setupKeys.push(cellKey(ri, ci));
    }
  }
  teachingSteps.push({
    title: "Line up the decimal points",
    explanation: `Write ${a} and ${b} so the decimal points sit in the same column.`,
    why: "Matching place value (tenths under tenths) stops mistakes.",
    narration: `Let's ${op === "add" ? "add" : "subtract"} ${a} ${opChar} ${b}. Line the decimal points up carefully.`,
    cellKeys: setupKeys,
    carryKeys: [],
    noteKeys: [],
  });

  const carries: { row: number; col: number; digit: string }[] = [];
  const moves: ColumnMethodMove[] = [];
  const cellNotes: { row: number; col: number; strike?: boolean; rewrite?: string }[] = [];

  if (op === "add") {
    let carry = 0;
    for (let i = 0; i < width; i++) {
      const col = width - 1 - i;
      if (rows[0][col] === ".") {
        teachingSteps.push({
          title: "Keep the decimal point",
          explanation: "Drop the decimal point straight down into the answer.",
          why: "The point marks where ones end and tenths begin.",
          narration: "Bring the decimal point straight down.",
          cellKeys: [cellKey(2, col)],
          carryKeys: [],
          noteKeys: [],
        });
        continue;
      }
      if (!/\d/.test(rows[0][col]) && !/\d/.test(rows[1][col]) && carry === 0) {
        continue;
      }
      const d1 = digitAt(rows[0], col);
      const d2 = digitAt(rows[1], col);
      const raw = d1 + d2 + carry;
      const write = raw % 10;
      const carryOut = Math.floor(raw / 10);
      const carryKeys: string[] = [];
      if (carryOut > 0) {
        let target = col - 1;
        while (target >= 0 && rows[0][target] === ".") target -= 1;
        if (target >= 0) {
          carries.push({ row: 0, col: target, digit: String(carryOut) });
          moves.push({
            fromRow: 2,
            fromCol: col,
            toRow: 0,
            toCol: target,
            label: `carry ${carryOut}`,
            kind: "carry",
          });
          carryKeys.push(cellKey(0, target));
        }
      }
      teachingSteps.push({
        title: "Add this column",
        explanation:
          carry > 0
            ? `${d1} + ${d2} + carry ${carry} = ${raw}. Write ${write}${carryOut ? ` and carry ${carryOut}` : ""}.`
            : `${d1} + ${d2} = ${raw}. Write ${write}${carryOut ? ` and carry ${carryOut}` : ""}.`,
        narration:
          carry > 0
            ? `${d1} add ${d2} plus the carry ${carry} is ${raw}. Write ${write}.`
            : `${d1} add ${d2} is ${raw}. Write ${write}.`,
        cellKeys: [cellKey(2, col)],
        carryKeys,
        noteKeys: [],
      });
      carry = carryOut;
    }
  } else {
    // Subtract using the scaled integers' digit logic on the decimal grid
    let borrow = 0;
    for (let i = 0; i < width; i++) {
      const col = width - 1 - i;
      if (rows[0][col] === ".") {
        teachingSteps.push({
          title: "Keep the decimal point",
          explanation: "Drop the decimal point straight down into the answer.",
          narration: "Bring the decimal point straight down.",
          cellKeys: [cellKey(2, col)],
          carryKeys: [],
          noteKeys: [],
        });
        continue;
      }
      if (!/\d/.test(rows[0][col]) && !/\d/.test(rows[1][col]) && borrow === 0) {
        continue;
      }
      let d1 = digitAt(rows[0], col) - borrow;
      const d2 = digitAt(rows[1], col);
      borrow = 0;
      let explanation: string;
      if (d1 < d2) {
        d1 += 10;
        borrow = 1;
        cellNotes.push({ row: 0, col, strike: true, rewrite: String(d1) });
        explanation = `${digitAt(rows[0], col)} is smaller than ${d2}. Borrow to make ${d1}, then ${d1} − ${d2} = ${d1 - d2}.`;
      } else {
        explanation = `${d1} − ${d2} = ${d1 - d2}.`;
      }
      const write = d1 - d2;
      teachingSteps.push({
        title: "Subtract this column",
        explanation,
        narration: explanation,
        cellKeys: [cellKey(2, col)],
        carryKeys: [],
        noteKeys: cellNotes.length
          ? [cellKey(0, col)]
          : [],
      });
    }
  }

  const answer = trimTrailingZeros(result);
  teachingSteps.push({
    title: "Answer",
    explanation: `So ${a} ${opChar} ${b} = ${answer}.`,
    narration: `The answer is ${answer}.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });

  const block: ColumnMethodBlock = {
    type: "column_method",
    method: op === "add" ? "column_addition" : "column_subtraction",
    rows,
    carries: carries.length ? carries : undefined,
    moves: moves.length ? moves : undefined,
    cellNotes: cellNotes.length ? cellNotes : undefined,
    separatorAfterRows: [1],
    placeValueHeaders,
    question: `${a} ${opChar} ${b}`,
    answer,
  };

  return {
    builderId: "decimal_column",
    block,
    teachingSteps,
    captions: teachingSteps
      .filter((s) => s.title !== "Answer")
      .map((s) => s.explanation),
    answer,
  };
}

function buildDecimalMultiply(a: number, b: number): MethodBuildResult {
  const places = decimalPlaces(a) + decimalPlaces(b);
  const ai = Math.round(a * 10 ** decimalPlaces(a));
  const bi = Math.round(b * 10 ** decimalPlaces(b));
  const productInt = ai * bi;
  const result = productInt / 10 ** places;
  const answer = trimTrailingZeros(result);

  const aStr = String(ai);
  const bStr = String(bi);
  const pStr = String(productInt);
  const gridCols = Math.max(aStr.length, bStr.length + 1, pStr.length);
  const rows = [
    aStr.padStart(gridCols, " "),
    (`×${bStr}`).padStart(gridCols, " "),
    pStr.padStart(gridCols, " "),
  ];

  const teachingSteps: TeachingStep[] = [
    {
      title: "Ignore the decimal points",
      explanation: `Treat ${a} × ${b} as ${ai} × ${bi} first.`,
      why: "We put the decimal point back using place-value counting at the end.",
      narration: `To multiply ${a} × ${b}, first multiply ${ai} × ${bi} as whole numbers.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Multiply as integers",
      explanation: `${ai} × ${bi} = ${productInt}.`,
      narration: `${ai} times ${bi} equals ${productInt}.`,
      cellKeys: Array.from({ length: pStr.length }, (_, i) =>
        cellKey(2, gridCols - pStr.length + i),
      ),
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Place the decimal point",
      explanation: `${a} has ${decimalPlaces(a)} decimal place${decimalPlaces(a) === 1 ? "" : "s"} and ${b} has ${decimalPlaces(b)}. Together that is ${places}. So the answer is ${answer}.`,
      why: "Count decimal places in the factors; the product needs that many.",
      narration: `Count ${places} decimal place${places === 1 ? "" : "s"} in total. The answer is ${answer}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    },
  ];

  const block: ColumnMethodBlock = {
    type: "column_method",
    method: "column_multiplication",
    rows,
    separatorAfterRows: [1],
    question: `${a} × ${b}`,
    answer,
  };

  return {
    builderId: "decimal_column",
    block,
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
    answer,
  };
}

export function parseDecimalOp(text: string): DecimalProblem | null {
  const t = normalizeMathText(text);
  if (!/\d+\.\d+/.test(t)) return null;

  const m = t.match(
    /(\d+\.?\d*)\s*([+\-−×x*]|plus|minus|times)\s*(\d+\.?\d*)/i,
  );
  if (!m) return null;
  const a = parseFloat(m[1]);
  const b = parseFloat(m[3]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const raw = m[2].toLowerCase();
  let op: DecimalOp | null = null;
  if (raw === "+" || raw === "plus") op = "add";
  else if (raw === "-" || raw === "−" || raw === "minus") op = "subtract";
  else if (raw === "×" || raw === "x" || raw === "*" || raw === "times") {
    op = "multiply";
  }
  if (!op) return null;
  if (op === "multiply" && [10, 100, 1000].includes(b)) return null;
  return { a, b, op };
}
