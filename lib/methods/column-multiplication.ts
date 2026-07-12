/**
 * Deterministic column multiplication builder for Year 5/6.
 * Carries sit above the multiplicand row (UK primary convention).
 */

import type { ColumnMethodBlock, ColumnMethodMove } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";

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
  a: number;
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
    a,
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

    teachingSteps.push({
      title,
      explanation:
        runningCarry > 0
          ? `${digit} × ${ad} = ${ad * digit}, plus carry ${runningCarry} is ${raw}. Write ${writeDigit}${carryOut > 0 ? (isLast ? ` (and ${carryOut} in the next column)` : ` and carry ${carryOut}`) : ""}.`
          : `${digit} × ${ad} = ${raw}. Write ${writeDigit}${carryOut > 0 ? (isLast ? ` (and ${carryOut} in the next column)` : ` and carry ${carryOut}`) : ""}.`,
      why:
        carryOut > 0 && !isLast
          ? `When we get ${raw}, the ${writeDigit} stays in the ${placeLabel(i)} and ${carryOut} moves left.`
          : `We multiply each digit of ${a} by ${digit}, starting from the ones.`,
      narration:
        runningCarry > 0
          ? `Now ${digit} times ${ad} is ${ad * digit}, plus the carry ${runningCarry} makes ${raw}. Write ${writeDigit}${carryOut > 0 ? (isLast ? ` and put ${carryOut} next door` : ` and carry ${carryOut}`) : ""}.`
          : `Multiply ${digit} by ${ad}: that's ${raw}. Write ${writeDigit}${carryOut > 0 ? (isLast ? ` and put ${carryOut} next door` : ` and carry ${carryOut}`) : ""}.`,
      cellKeys,
      carryKeys,
      noteKeys: [],
    });
    runningCarry = isLast ? 0 : carryOut;
  }
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
    why: "Place value columns keep every digit in the right place.",
    narration: `Let's work out ${a} × ${b} with column multiplication. Write ${a} on top and ${b} underneath, lined up by place value.`,
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
        why: `Multiplying by ${digit}${"0".repeat(place)} shifts every digit ${place} place${place > 1 ? "s" : ""} left.`,
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
      a,
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

    // Keep carries from the ones line on the final board (most visible teaching
    // moment). Later lines' intermediate carries are still in teachingSteps.
    if (place === 0) {
      allCarries.push(...lineCarries);
      allMoves.push(...lineMoves);
    }
  });

  carries.push(...allCarries);
  moves.push(...allMoves);

  if (partials.length > 1) {
    const totalRow = rows.length - 1;
    const totalStr = String(product);
    const totalCells: string[] = [];
    for (let ci = 0; ci < gridCols; ci++) {
      const idx = ci - (gridCols - totalStr.length);
      if (idx >= 0) totalCells.push(cellKey(totalRow, ci));
    }
    const sumText = partials.join(" + ");
    teachingSteps.push({
      title: "Add the partial products",
      explanation: `Add ${sumText} to get ${product}.`,
      why: "Each line was one part of the multiplication — adding them gives the full answer.",
      narration: `Finally, add the partial products: ${sumText} makes ${product}. So ${a} × ${b} equals ${product}.`,
      cellKeys: [...totalCells].reverse(),
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
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
    question: `${a} × ${b}`,
    answer: String(product),
  };

  return {
    builderId: "column_multiplication",
    block,
    teachingSteps,
    captions: teachingSteps
      .filter((s) => s.title !== "Answer")
      .map((s) => s.explanation),
  };
}

/** Parse "36 × 15" / "36x15" / "36 * 15" from question text. */
export function parseMultiplicationOperands(
  text: string,
): { a: number; b: number } | null {
  const m = text.match(/(\d{1,6})\s*[×x*]\s*(\d{1,6})/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
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
