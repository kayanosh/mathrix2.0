/**
 * Deterministic column multiplication builder for Year 5/6.
 * Carries sit above the multiplicand row (UK primary convention).
 */

import type { ColumnMethodBlock, ColumnMethodMove } from "@/types/whiteboard";
import {
  teachingStepsToCaptions,
  type MethodBuildResult,
  type TeachingStep,
} from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

const PLACE = ["ones", "tens", "hundreds", "thousands", "ten-thousands"];

function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

function placeLabel(fromRight: number): string {
  return PLACE[fromRight] || "next";
}

interface PartialDigitArgs {
  digit: number;
  place: number;
  aDigitsRtl: number[];
  partialRow: number;
  gridCols: number;
  carries: { row: number; col: number; digit: string }[];
  moves: ColumnMethodMove[];
  teachingSteps: TeachingStep[];
  /** Clear previous partial-product carries before this line */
  clearPriorCarries?: boolean;
  /** Shift write columns left (for tens/hundreds lines after place-value zeros) */
  colOffset?: number;
  titlePrefix?: string;
}

/**
 * Digit-by-digit multiply of `a` by one multiplier digit into a partial-product row.
 * Intermediate carries sit above the multiplicand; a final overflow is written as a
 * leading digit on the partial product (not left as a floating carry).
 */
function appendPartialDigitSteps(args: PartialDigitArgs): void {
  const {
    digit,
    aDigitsRtl,
    partialRow,
    gridCols,
    carries,
    moves,
    teachingSteps,
    clearPriorCarries,
    colOffset = 0,
    titlePrefix,
  } = args;

  if (clearPriorCarries) {
    // New partial product line — remove carries from earlier lines so the board
    // shows only carries relevant to the current working (matches UK practice).
    for (let i = carries.length - 1; i >= 0; i--) {
      if (carries[i].row === 0) carries.splice(i, 1);
    }
    for (let i = moves.length - 1; i >= 0; i--) {
      if (moves[i].kind === "carry") moves.splice(i, 1);
    }
  }

  const title = titlePrefix || `Ones × ${digit}`;
  let runningCarry = 0;

  for (let i = 0; i < aDigitsRtl.length; i++) {
    const ad = aDigitsRtl[i];
    const raw = ad * digit + runningCarry;
    const writeDigit = raw % 10;
    const carryOut = Math.floor(raw / 10);
    const col = gridCols - 1 - (i + colOffset);
    const cellKeys: string[] = [];
    const carryKeys: string[] = [];
    const isLast = i === aDigitsRtl.length - 1;

    if (col >= 0) cellKeys.push(cellKey(partialRow, col));

    if (carryOut > 0) {
      if (!isLast) {
        // Intermediate carry above the multiplicand (UK primary convention).
        const carryCol = col - 1;
        if (carryCol >= 0) {
          const existing = carries.findIndex(
            (c) => c.row === 0 && c.col === carryCol,
          );
          if (existing >= 0) carries[existing].digit = String(carryOut);
          else {
            carries.push({ row: 0, col: carryCol, digit: String(carryOut) });
            moves.push({
              fromRow: 0,
              fromCol: col,
              toRow: 0,
              toCol: carryCol,
              label: `carry ${carryOut}`,
              kind: "carry",
            });
          }
          carryKeys.push(cellKey(0, carryCol));
        }
      } else {
        // Final overflow becomes leading digit(s) of this partial product.
        let rem = carryOut;
        let leadCol = col - 1;
        while (rem > 0 && leadCol >= 0) {
          cellKeys.unshift(cellKey(partialRow, leadCol));
          rem = Math.floor(rem / 10);
          leadCol -= 1;
        }
      }
    }

    const writePlace = placeLabel(i + colOffset);
    const carryPlace = placeLabel(i + colOffset + 1);
    const productAlone = ad * digit;
    let explanation: string;
    let why: string;
    let narration: string;

    if (carryOut > 0 && !isLast) {
      explanation =
        runningCarry > 0
          ? `${digit} × ${ad} = ${productAlone}, plus carry ${runningCarry} is ${raw}. Write ${writeDigit} and carry ${carryOut}.`
          : `${digit} × ${ad} = ${raw}. Write ${writeDigit} and carry ${carryOut}.`;
      why = `The arrow shows carry ${carryOut} moving to the ${carryPlace}.`;
      narration =
        runningCarry > 0
          ? `${digit} times ${ad} is ${productAlone}, plus carry ${runningCarry} makes ${raw}. Write ${writeDigit} and carry ${carryOut}.`
          : `${digit} times ${ad} is ${raw}. Write ${writeDigit} and carry ${carryOut}.`;
    } else if (runningCarry > 0) {
      explanation = `${digit} × ${ad} = ${productAlone}, plus carry ${runningCarry} is ${raw}. Write ${writeDigit}${carryOut > 0 ? ` (and ${carryOut} next door)` : ""}.`;
      why = `Add the ${runningCarry} we carried.`;
      narration = `${digit} times ${ad} is ${productAlone}, plus carry ${runningCarry} makes ${raw}. Write ${writeDigit}.`;
    } else {
      explanation = `${digit} × ${ad} = ${raw}. Write ${writeDigit}${carryOut > 0 ? (isLast ? ` (and ${carryOut} next door)` : ` and carry ${carryOut}`) : ""}.`;
      why = `Multiply the ${writePlace} digit by ${digit}.`;
      narration = `${digit} times ${ad} is ${raw}. Write ${writeDigit}.`;
    }

    teachingSteps.push({
      title,
      explanation,
      why,
      narration,
      cellKeys,
      carryKeys,
      noteKeys: [],
    });
    runningCarry = isLast ? 0 : carryOut;
  }
}

function mergeCarries(
  target: { row: number; col: number; digit: string }[],
  incoming: { row: number; col: number; digit: string }[],
): void {
  for (const c of incoming) {
    const existing = target.findIndex((t) => t.row === c.row && t.col === c.col);
    if (existing >= 0) target[existing].digit = c.digit;
    else target.push({ ...c });
  }
}

function digitAtPadded(numStr: string, gridCols: number, col: number): number {
  const cleaned = numStr.replace(/^[×x]/, "");
  const idx = col - (gridCols - cleaned.length);
  if (idx < 0 || idx >= cleaned.length) return 0;
  return Number(cleaned[idx]) || 0;
}

/**
 * Column-by-column addition of partial products into the total row.
 * Carries sit above the total row so they don't collide with multiplicand carries.
 */
function appendPartialProductsAddSteps(args: {
  partials: number[];
  product: number;
  a: number;
  b: number;
  gridCols: number;
  rows: string[];
  carries: { row: number; col: number; digit: string }[];
  moves: ColumnMethodMove[];
  teachingSteps: TeachingStep[];
}): void {
  const { partials, product, a, b, gridCols, rows, carries, moves, teachingSteps } =
    args;
  const totalRow = rows.length - 1;
  const partialRows = partials.map((_, i) => 2 + i);
  const sumText = partials.join(" + ");
  const namedParts = partials
    .map((p, i) => {
      const place = placeLabel(i);
      return i === 0
        ? `the ones line (${p})`
        : `the ${place} line (${p})`;
    })
    .join(" and ");

  teachingSteps.push({
    title: "Add the partial products",
    explanation: `Now add ${namedParts} column by column to get ${product}.`,
    why: "Each line was one part of the multiplication — adding them gives the full answer.",
    narration: `Finally, add ${namedParts}. We'll go column by column from the ones. That is ${sumText}.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
  });

  let carryIn = 0;
  for (let i = 0; i < gridCols; i++) {
    const col = gridCols - 1 - i;
    const digits = partialRows.map((ri) =>
      digitAtPadded(rows[ri], gridCols, col),
    );
    const raw = digits.reduce((s, d) => s + d, 0) + carryIn;
    const writeDigit = raw % 10;
    const carryOut = Math.floor(raw / 10);
    const place = placeLabel(i);
    const cellKeys = [cellKey(totalRow, col)];
    const carryKeys: string[] = [];

    if (carryOut > 0 && col - 1 >= 0) {
      const carryCol = col - 1;
      const existing = carries.findIndex(
        (c) => c.row === totalRow && c.col === carryCol,
      );
      if (existing >= 0) carries[existing].digit = String(carryOut);
      else {
        carries.push({ row: totalRow, col: carryCol, digit: String(carryOut) });
        moves.push({
          fromRow: totalRow,
          fromCol: col,
          toRow: totalRow,
          toCol: carryCol,
          label: `carry ${carryOut}`,
          kind: "carry",
        });
      }
      carryKeys.push(cellKey(totalRow, carryCol));
    }

    const partsText = digits.join(" + ");
    const withCarry =
      carryIn > 0 ? `${partsText} + carry ${carryIn}` : partsText;

    teachingSteps.push({
      title: `Add the ${place}`,
      explanation:
        carryOut > 0
          ? `In the ${place}: ${withCarry} = ${raw}. Write ${writeDigit} and carry ${carryOut}.`
          : `In the ${place}: ${withCarry} = ${raw}. Write ${writeDigit}.`,
      why:
        carryOut > 0
          ? `Ten ${place} make one ${placeLabel(i + 1)} — that's the carry.`
          : undefined,
      narration:
        carryOut > 0
          ? `In the ${place} column, ${withCarry} makes ${raw}. Write ${writeDigit} and carry ${carryOut}.`
          : `In the ${place} column, ${withCarry} makes ${raw}. Write ${writeDigit}.`,
      cellKeys,
      carryKeys,
      noteKeys: [],
      showAnswer: i === gridCols - 1,
    });

    carryIn = carryOut;
  }

  teachingSteps.push({
    title: "Answer",
    explanation: `So ${a} × ${b} = ${product}.`,
    narration: `So ${a} × ${b} equals ${product}. Well done!`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });
}

/**
 * Build correct column multiplication working + digit-level teaching steps.
 * Example: buildColumnMultiplication(36, 15)
 */
export function buildColumnMultiplication(
  multiplicand: number,
  multiplier: number,
): MethodBuildResult {
  if (
    !Number.isInteger(multiplicand) ||
    !Number.isInteger(multiplier) ||
    multiplicand < 0 ||
    multiplier < 0
  ) {
    throw new Error("column multiplication requires non-negative integers");
  }

  const a = multiplicand;
  const b = multiplier;
  const product = a * b;
  const aStr = String(a);
  const bStr = String(b);
  const bDigitsRtl = bStr.split("").map(Number).reverse();

  const partials: number[] = bDigitsRtl.map((d, place) => a * d * 10 ** place);

  const rows: string[] = [aStr, `×${bStr}`, ...partials.map(String)];
  if (partials.length > 1) rows.push(String(product));

  const gridCols = Math.max(
    ...rows.map((r) => r.replace(/^[×x]/, "").length),
    1,
  );

  const carries: { row: number; col: number; digit: string }[] = [];
  const moves: ColumnMethodMove[] = [];
  const teachingSteps: TeachingStep[] = [];

  const setupCells: string[] = [];
  for (let ci = 0; ci < gridCols; ci++) {
    if (ci >= gridCols - aStr.length) setupCells.push(cellKey(0, ci));
    if (ci >= gridCols - bStr.length) setupCells.push(cellKey(1, ci));
  }

  teachingSteps.push({
    title: "Set up the columns",
    explanation: `Write ${a} on top and ${b} underneath, lining up ones under ones.`,
    why: "Ones under ones, tens under tens.",
    narration: `Let's work out ${a} × ${b}. Write ${a} on top and ${b} underneath.`,
    cellKeys: setupCells,
    carryKeys: [],
    noteKeys: [],
  });

  const aDigitsRtl = aStr.split("").map(Number).reverse();

  // Collect carries per partial line (don't clear mid-build — store per line)
  const allCarries: { row: number; col: number; digit: string }[] = [];
  const allMoves: ColumnMethodMove[] = [];

  bDigitsRtl.forEach((digit, place) => {
    const partialRow = 2 + place;
    const lineCarries: { row: number; col: number; digit: string }[] = [];
    const lineMoves: ColumnMethodMove[] = [];

    if (place > 0) {
      const zeroCells: string[] = [];
      for (let z = 0; z < place; z++) {
        const zCol = gridCols - 1 - z;
        if (zCol >= 0) zeroCells.push(cellKey(partialRow, zCol));
      }
      const zeroNote =
        place === 1 ? "a zero in the ones" : `${place} zeros on the right`;
      teachingSteps.push({
        title: `${placeLabel(place)} × ${digit} — place value`,
        explanation: `This digit is really ${digit}${"0".repeat(place)}, so put ${zeroNote} and start one column further left.`,
        why: `The ${digit} is really ${digit}${"0".repeat(place)}, so every answer digit shifts ${place} place${place > 1 ? "s" : ""} left.`,
        narration: `Now the ${placeLabel(place)} digit, ${digit}. Because it's really ${digit}${"0".repeat(place)}, put ${zeroNote} and work one column left.`,
        cellKeys: zeroCells,
        carryKeys: [],
        noteKeys: [],
      });
    }

    appendPartialDigitSteps({
      digit,
      place,
      aDigitsRtl,
      partialRow,
      gridCols,
      carries: lineCarries,
      moves: lineMoves,
      teachingSteps,
      colOffset: place,
      titlePrefix:
        place === 0
          ? `Ones × ${digit}`
          : `${placeLabel(place)} × ${digit}`,
    });

    const factor = digit * 10 ** place;
    const lineProduct = partials[place];
    const lineCells: string[] = [];
    const lineStr = String(lineProduct);
    for (let ci = 0; ci < gridCols; ci++) {
      const idx = ci - (gridCols - lineStr.length);
      if (idx >= 0 && idx < lineStr.length) {
        lineCells.push(cellKey(partialRow, ci));
      }
    }
    teachingSteps.push({
      title: place === 0 ? `Ones line complete` : `${placeLabel(place)} line complete`,
      explanation: `So far: ${a} × ${factor} = ${lineProduct}.`,
      why:
        place === 0
          ? `This line is ${a} multiplied by the ones digit.`
          : `This line is ${a} multiplied by ${factor} (the ${placeLabel(place)} digit).`,
      narration: `That gives us ${lineProduct}. So ${a} times ${factor} is ${lineProduct}.`,
      cellKeys: lineCells,
      carryKeys: [],
      noteKeys: [],
    });

    // Persist every partial-product line's carries so the finished static board
    // matches the digit-level captions (ones + tens + …).
    mergeCarries(allCarries, lineCarries);
    allMoves.push(...lineMoves);
  });

  carries.push(...allCarries);
  moves.push(...allMoves);

  if (partials.length > 1) {
    appendPartialProductsAddSteps({
      partials,
      product,
      a,
      b,
      gridCols,
      rows,
      carries,
      moves,
      teachingSteps,
    });
  } else {
    teachingSteps.push({
      title: "Answer",
      explanation: `So ${a} × ${b} = ${product}.`,
      narration: `So ${a} × ${b} equals ${product}. Well done!`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    });
  }

  const seps = [1];
  if (partials.length > 1) seps.push(rows.length - 2);

  const headers =
    gridCols <= 4
      ? (["Th", "H", "T", "O"] as const).slice(4 - gridCols)
      : undefined;

  const block: ColumnMethodBlock = {
    type: "column_method",
    method: "column_multiplication",
    rows,
    carries: carries.filter((c) => c.col >= 0 && c.col < gridCols),
    moves: moves.filter((m) => m.fromCol >= 0 && m.toCol >= 0),
    separatorAfterRows: seps,
    placeValueHeaders: headers ? [...headers] : undefined,
    rowLabels: [
      "",
      "",
      ...partials.map((p, i) => {
        const factor = bDigitsRtl[i] * 10 ** i;
        return `${a} × ${factor} = ${p}`;
      }),
      ...(partials.length > 1 ? ["Add both lines"] : []),
    ],
    question: `${a} × ${b}`,
    answer: String(product),
  };

  return {
    builderId: "column_multiplication",
    block,
    teachingSteps,
    captions: teachingStepsToCaptions(teachingSteps),
    intro: `Let's multiply ${a} × ${b}.`,
  };
}

/** Parse symbolic, LaTeX, and written multiplication from question text. */
export function parseMultiplicationOperands(
  text: string,
): { a: number; b: number } | null {
  const normalized = normalizeMathText(text);
  const m = normalized.match(
    /(\d{1,6})\s*(?:[×x*]|times\b|multiplied\s+by\b)\s*(\d{1,6})/i,
  );
  const by = normalized.match(
    /(?:multiplication|product)\s+of\s+(\d{1,6})\s+by\s+(\d{1,6})/i,
  );
  const productOf = normalized.match(
    /product\s+of\s+(\d{1,6})\s+and\s+(\d{1,6})/i,
  );
  const match = m || by || productOf;
  if (!match) return null;
  const a = parseInt(match[1], 10);
  const b = parseInt(match[2], 10);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b };
}

/** Convert builder teaching steps into column-reveal steps. */
export function teachingStepsToReveal(
  steps: TeachingStep[],
): Array<{
  narration: string;
  cellKeys: string[];
  carryKeys: string[];
  noteKeys: string[];
  showAnswer?: boolean;
  title?: string;
  explanation?: string;
  why?: string;
}> {
  return steps.map((s) => ({
    narration: s.narration,
    cellKeys: s.cellKeys,
    carryKeys: s.carryKeys,
    noteKeys: s.noteKeys,
    showAnswer: s.showAnswer,
    title: s.title,
    explanation: s.explanation,
    why: s.why,
  }));
}
