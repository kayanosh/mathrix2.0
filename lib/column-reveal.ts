/**
 * Column-method reveal timeline — turns a ColumnMethodBlock into an ordered
 * list of teaching steps, each with the grid cells it reveals and the sentence
 * a teacher would say while writing them.
 *
 * The timeline is computed deterministically from the block's own digits
 * (never asked of the LLM), so the narration is arithmetically correct and the
 * board reveal always matches the voice. Both the tutor overlay and the
 * narration plan build the SAME timeline, keeping cue counts in sync.
 *
 * Grid coordinates match ColumnMethodRenderer: rows are right-aligned into a
 * grid of `maxCols` columns; cell (row, col) keys are "row-col" strings.
 */

import type { ColumnMethodBlock } from "@/types/whiteboard";
import { normalizeColumnDigits } from "@/lib/column-method-layout";
import {
  buildColumnMultiplication,
  teachingStepsToReveal,
} from "@/lib/methods/column-multiplication";

export interface ColumnRevealStep {
  /** What the teacher says while writing this step. */
  narration: string;
  /**
   * Digit cells written in this step ("row-col"), in the order the pen writes
   * them (e.g. partial products go right-to-left) — renderers stagger the
   * write-in animation using this order.
   */
  cellKeys: string[];
  /** Carry slots written in this step ("row-col"). */
  carryKeys: string[];
  /** Borrow strike/rewrite notes applied in this step ("row-col"). */
  noteKeys: string[];
  /** Reveal the final "= answer" line with this step. */
  showAnswer?: boolean;
  /** Short card title from a method builder (digit-level teaching). */
  title?: string;
  /** Pupil-facing explanation (may differ slightly from narration). */
  explanation?: string;
  /** Optional "why this works" line. */
  why?: string;
}

export interface ColumnRevealState {
  cells: Set<string>;
  carries: Set<string>;
  notes: Set<string>;
  showAnswer: boolean;
  /** Everything written by the most recent step — highlighted as "just written". */
  active: Set<string>;
}

export function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

/** Column width of the padded grid (same rule the renderer uses). */
export function gridMaxCols(rows: string[]): number {
  return Math.max(...rows.map((r) => normalizeColumnDigits(r).length), 1);
}

/** Character at padded grid column `col` for a row, or "" if in the left padding. */
function charAt(row: string, col: number, maxCols: number): string {
  const cleaned = normalizeColumnDigits(row);
  const idx = col - (maxCols - cleaned.length);
  return idx >= 0 && idx < cleaned.length ? cleaned[idx] : "";
}

/** All non-empty cell keys for a row in the padded grid. */
function rowCellKeys(ri: number, row: string, maxCols: number): string[] {
  const keys: string[] = [];
  for (let ci = 0; ci < maxCols; ci++) {
    if (charAt(row, ci, maxCols) !== "") keys.push(cellKey(ri, ci));
  }
  return keys;
}

const PLACE_NAMES = [
  "ones",
  "tens",
  "hundreds",
  "thousands",
  "ten-thousands",
  "hundred-thousands",
  "millions",
];

function placeName(col: number, maxCols: number): string {
  return PLACE_NAMES[maxCols - 1 - col] || "next";
}

/** True when a row is a plain whole number (after stripping operator/spaces). */
function isDigitRow(row: string): boolean {
  return /^\d+$/.test(normalizeColumnDigits(row));
}

// ── Result-row synthesis ─────────────────────────────────────────────────────

/**
 * For column addition/subtraction the AI typically emits only the operand rows
 * (the answer renders below the line as "= X"). A real teacher writes the
 * answer digits INTO the grid column by column, so we synthesize a result row
 * from `answer` when it's missing. If the answer is wider than the operands
 * (carry overflow, e.g. 456 + 644 = 1100) every stored column index shifts
 * right, so carries/moves/notes are re-indexed to keep them aligned.
 */
export function withResultRow(block: ColumnMethodBlock): ColumnMethodBlock {
  if (
    block.method !== "column_addition" &&
    block.method !== "column_subtraction"
  ) {
    return block;
  }

  const answerDigits = normalizeColumnDigits(block.answer || "");
  if (!/^\d+$/.test(answerDigits)) return block;

  const lastRow = normalizeColumnDigits(block.rows[block.rows.length - 1] || "");
  if (block.rows.length > 2 && lastRow === answerDigits) return block; // already present

  const oldMax = gridMaxCols(block.rows);
  const rows = [...block.rows, answerDigits];
  const delta = gridMaxCols(rows) - oldMax;

  if (delta === 0) {
    return { ...block, rows };
  }

  return {
    ...block,
    rows,
    carries: block.carries?.map((c) => ({ ...c, col: c.col + delta })),
    moves: block.moves?.map((m) => ({
      ...m,
      fromCol: m.fromCol + delta,
      toCol: m.toCol + delta,
    })),
    cellNotes: block.cellNotes?.map((n) => ({ ...n, col: n.col + delta })),
  };
}

// ── Reveal state ─────────────────────────────────────────────────────────────

/** Cumulative reveal state after `uptoStep` steps (0-based; -1 = nothing). */
export function revealStateAt(
  steps: ColumnRevealStep[],
  uptoStep: number,
): ColumnRevealState {
  const state: ColumnRevealState = {
    cells: new Set(),
    carries: new Set(),
    notes: new Set(),
    showAnswer: false,
    active: new Set(),
  };
  const last = Math.min(uptoStep, steps.length - 1);
  for (let i = 0; i <= last; i++) {
    const s = steps[i];
    s.cellKeys.forEach((k) => state.cells.add(k));
    s.carryKeys.forEach((k) => state.carries.add(k));
    s.noteKeys.forEach((k) => state.notes.add(k));
    if (s.showAnswer) state.showAnswer = true;
    if (i === last) {
      s.cellKeys.forEach((k) => state.active.add(k));
      s.carryKeys.forEach((k) => state.active.add(k));
      s.noteKeys.forEach((k) => state.active.add(k));
    }
  }
  return state;
}

// ── Timeline builder ─────────────────────────────────────────────────────────

/**
 * Build the teaching timeline for a column-method block.
 * Falls back to a row-by-row reveal when the digits can't be parsed
 * (decimals, malformed rows, etc.) so playback never breaks.
 */
export function buildColumnRevealTimeline(
  raw: ColumnMethodBlock,
): ColumnRevealStep[] {
  const block = withResultRow(raw);
  try {
    switch (block.method) {
      case "column_addition":
        return additionTimeline(block) ?? rowTimeline(block);
      case "column_subtraction":
        return subtractionTimeline(block) ?? rowTimeline(block);
      case "column_multiplication":
        return multiplicationTimeline(block) ?? rowTimeline(block);
      case "long_division":
        return divisionTimeline(block);
    }
  } catch {
    return rowTimeline(block);
  }
}

// ── Addition ─────────────────────────────────────────────────────────────────

function additionTimeline(block: ColumnMethodBlock): ColumnRevealStep[] | null {
  const { rows, carries = [], answer } = block;
  if (rows.length < 2) return null;

  const maxCols = gridMaxCols(rows);
  const answerDigits = normalizeColumnDigits(answer || "");
  const hasResultRow =
    rows.length > 2 &&
    normalizeColumnDigits(rows[rows.length - 1]) === answerDigits;
  const operandRows = hasResultRow ? rows.slice(0, -1) : rows;
  const resultRowIndex = hasResultRow ? rows.length - 1 : -1;

  if (!operandRows.every(isDigitRow)) return null;

  const steps: ColumnRevealStep[] = [];

  steps.push({
    narration: `Let's work out ${block.question} with column addition. Line the digits up so the ones, tens and hundreds sit under each other.`,
    cellKeys: operandRows.flatMap((r, ri) => rowCellKeys(ri, r, maxCols)),
    carryKeys: [],
    noteKeys: [],
  });

  // One step per column, right to left.
  let carryIn = 0;
  for (let ci = maxCols - 1; ci >= 0; ci--) {
    const colDigits: number[] = [];
    operandRows.forEach((r) => {
      const ch = charAt(r, ci, maxCols);
      if (/\d/.test(ch)) colDigits.push(Number(ch));
    });
    if (colDigits.length === 0 && carryIn === 0) continue;

    const sum = colDigits.reduce((a, b) => a + b, 0) + carryIn;
    const writeDigit = sum % 10;
    const carryOut = Math.floor(sum / 10);
    const place = placeName(ci, maxCols);

    let narration: string;
    if (colDigits.length === 0) {
      narration = `The carried ${carryIn} has nothing to add to — write ${writeDigit} at the front.`;
    } else {
      const parts = colDigits.join(" add ");
      const withCarry =
        carryIn > 0 ? `${parts}, plus the ${carryIn} we carried, ` : `${parts} `;
      narration =
        carryOut > 0
          ? `In the ${place} column: ${withCarry}makes ${sum}. That's ten or more, so write ${writeDigit} and carry ${carryOut} to the next column — follow the orange arrow.`
          : `In the ${place} column: ${withCarry}makes ${sum}. Write ${sum}.`;
    }

    // The carry this column produces is displayed one column to the left.
    const carryKeys =
      carryOut > 0
        ? carries.filter((c) => c.col === ci - 1).map((c) => cellKey(c.row, c.col))
        : [];

    steps.push({
      narration,
      cellKeys: resultRowIndex >= 0 ? [cellKey(resultRowIndex, ci)] : [],
      carryKeys,
      noteKeys: [],
    });

    carryIn = carryOut;
  }

  steps.push({
    narration: `Read the answer from the bottom row: ${block.question} equals ${answer}.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });

  return steps;
}

// ── Subtraction ──────────────────────────────────────────────────────────────

function subtractionTimeline(
  block: ColumnMethodBlock,
): ColumnRevealStep[] | null {
  const { rows, cellNotes = [], answer } = block;
  if (rows.length < 2) return null;
  if (!isDigitRow(rows[0]) || !isDigitRow(rows[1])) return null;

  const maxCols = gridMaxCols(rows);
  const answerDigits = normalizeColumnDigits(answer || "");
  const hasResultRow =
    rows.length > 2 &&
    normalizeColumnDigits(rows[rows.length - 1]) === answerDigits;
  const resultRowIndex = hasResultRow ? rows.length - 1 : -1;

  // Effective top-number digits in grid coords, mutated as we borrow.
  const topPad: (number | null)[] = Array.from({ length: maxCols }, (_, ci) => {
    const ch = charAt(rows[0], ci, maxCols);
    return /\d/.test(ch) ? Number(ch) : null;
  });
  const bottomPad: (number | null)[] = Array.from({ length: maxCols }, (_, ci) => {
    const ch = charAt(rows[1], ci, maxCols);
    return /\d/.test(ch) ? Number(ch) : null;
  });

  const steps: ColumnRevealStep[] = [];
  steps.push({
    narration: `Let's work out ${block.question} with column subtraction. Line the digits up by place value — the number we're taking away goes underneath.`,
    cellKeys: [rows[0], rows[1]].flatMap((r, ri) => rowCellKeys(ri, r, maxCols)),
    carryKeys: [],
    noteKeys: [],
  });

  for (let ci = maxCols - 1; ci >= 0; ci--) {
    if (topPad[ci] === null && bottomPad[ci] === null) continue;
    const t = topPad[ci] ?? 0;
    const b = bottomPad[ci] ?? 0;
    const place = placeName(ci, maxCols);

    let narration: string;
    const noteKeys: string[] = [];

    if (t < b) {
      // Borrow — cascade left through zeros.
      let lender = ci - 1;
      while (lender >= 0 && topPad[lender] === 0) lender--;
      if (lender < 0) return null; // malformed working — fall back

      const cascade = lender < ci - 1;
      topPad[lender] = (topPad[lender] as number) - 1;
      for (let z = lender + 1; z < ci; z++) topPad[z] = 9;
      topPad[ci] = t + 10;

      // Reveal every strike/rewrite note across the borrow range.
      for (let c = lender; c <= ci; c++) {
        cellNotes
          .filter((n) => n.col === c)
          .forEach((n) => noteKeys.push(cellKey(n.row, n.col)));
      }

      const cascadeText = cascade
        ? " The next column is a zero, so we borrow from further along — the zeros become nines."
        : "";
      narration = `In the ${place} column, ${t} is smaller than ${b}, so we borrow ten from the next column — see the crossed-out digits.${cascadeText} Now ${t + 10} take away ${b} is ${t + 10 - b}.`;
    } else {
      narration = `In the ${place} column: ${t} take away ${b} is ${t - b}. Write ${t - b}.`;
    }

    steps.push({
      narration,
      cellKeys: resultRowIndex >= 0 ? [cellKey(resultRowIndex, ci)] : [],
      carryKeys: [],
      noteKeys,
    });
  }

  steps.push({
    narration: `And we're done: ${block.question} equals ${answer}. Quick check — ${answerDigits} add ${normalizeColumnDigits(rows[1])} should take you back to ${normalizeColumnDigits(rows[0])}.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });

  return steps;
}

// ── Multiplication ───────────────────────────────────────────────────────────

/**
 * Digit-level timeline from the deterministic builder when operands parse cleanly.
 * Falls back to a coarser partial-product reveal for malformed / non-integer boards.
 */
function multiplicationTimeline(
  block: ColumnMethodBlock,
): ColumnRevealStep[] | null {
  const { rows } = block;
  if (rows.length < 3) return null;

  const multiplicand = normalizeColumnDigits(rows[0]);
  const multiplier = normalizeColumnDigits(rows[1]);
  if (!/^\d+$/.test(multiplicand) || !/^\d+$/.test(multiplier)) return null;

  // Prefer the shared builder script so Learn / Tutor / captions stay in sync.
  try {
    const built = buildColumnMultiplication(
      parseInt(multiplicand, 10),
      parseInt(multiplier, 10),
    );
    return teachingStepsToReveal(built.teachingSteps);
  } catch {
    return multiplicationTimelineCoarse(block);
  }
}

/** Legacy coarse path: one step per partial-product row. */
function multiplicationTimelineCoarse(
  block: ColumnMethodBlock,
): ColumnRevealStep[] | null {
  const { rows, carries = [], answer } = block;
  const maxCols = gridMaxCols(rows);
  const multiplicand = normalizeColumnDigits(rows[0]);
  const multiplier = normalizeColumnDigits(rows[1]);
  if (!/^\d+$/.test(multiplicand) || !/^\d+$/.test(multiplier)) return null;

  const hasTotalRow = rows.length >= 4;
  const partialRows = hasTotalRow ? rows.slice(2, -1) : rows.slice(2);
  const totalRowIndex = hasTotalRow ? rows.length - 1 : -1;

  const steps: ColumnRevealStep[] = [];
  steps.push({
    narration: `Let's work out ${block.question} with column multiplication. Write ${multiplicand} on top and ${multiplier} underneath, lined up by place value.`,
    cellKeys: [rows[0], rows[1]].flatMap((r, ri) => rowCellKeys(ri, r, maxCols)),
    carryKeys: [],
    noteKeys: [],
  });

  const multiplierDigits = multiplier.split("").reverse();
  let carriesRevealed = false;

  partialRows.forEach((row, pi) => {
    const ri = 2 + pi;
    const digit = multiplierDigits[pi];
    const product = normalizeColumnDigits(row);
    const place = PLACE_NAMES[pi] || "next";

    let narration: string;
    if (digit === undefined) {
      narration = `Next row of the working: ${product}.`;
    } else if (pi === 0) {
      narration = `First multiply ${multiplicand} by the ${place} digit, ${digit}. Working right to left, that gives ${product}.`;
    } else {
      narration = `Now multiply ${multiplicand} by the ${place} digit, ${digit}. Because it's really ${digit}${"0".repeat(pi)}, we put ${pi === 1 ? "a zero" : `${pi} zeros`} first to hold the place value. That gives ${product}.`;
    }

    let carryKeys: string[] = [];
    if (!carriesRevealed && carries.length > 0) {
      carryKeys = carries.map((c) => cellKey(c.row, c.col));
      carriesRevealed = true;
      if (pi === 0) {
        narration += " The small orange digits above are the carries.";
      }
    }

    steps.push({
      narration,
      cellKeys: rowCellKeys(ri, row, maxCols).reverse(),
      carryKeys,
      noteKeys: [],
    });
  });

  if (hasTotalRow) {
    const partialsText = partialRows
      .map((r) => normalizeColumnDigits(r))
      .join(" add ");
    steps.push({
      narration: `Finally, add the partial products: ${partialsText} makes ${normalizeColumnDigits(rows[totalRowIndex])}. So ${block.question} equals ${answer}.`,
      cellKeys: rowCellKeys(totalRowIndex, rows[totalRowIndex], maxCols).reverse(),
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    });
  } else {
    steps.push({
      narration: `So ${block.question} equals ${answer}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    });
  }

  return steps;
}

// ── Long division ────────────────────────────────────────────────────────────

function divisionTimeline(block: ColumnMethodBlock): ColumnRevealStep[] {
  const { rows, answer } = block;
  const maxCols = gridMaxCols(rows);

  const bracketRow = rows.findIndex((r) => r.includes(")"));
  if (bracketRow < 0) return rowTimeline(block);

  const quotientKeys = rows
    .slice(0, bracketRow)
    .flatMap((r, ri) => rowCellKeys(ri, r, maxCols));
  const workingRows = rows.slice(bracketRow + 1);
  let quotientUsed = 0;

  const steps: ColumnRevealStep[] = [];
  steps.push({
    narration: `Let's work out ${block.question} with long division. The number we're dividing goes inside the bracket; the divisor sits outside.`,
    cellKeys: rowCellKeys(bracketRow, rows[bracketRow], maxCols),
    carryKeys: [],
    noteKeys: [],
  });

  workingRows.forEach((row, wi) => {
    const ri = bracketRow + 1 + wi;
    const digits = normalizeColumnDigits(row).replace(/↓/g, "");
    const isSubtract = wi % 2 === 1;

    // Each divide step writes the next quotient digit on top FIRST, then the
    // multiply-back line underneath — that's the order the pen moves.
    const cellKeys = rowCellKeys(ri, row, maxCols);
    if (!isSubtract && quotientUsed < quotientKeys.length) {
      cellKeys.unshift(quotientKeys[quotientUsed]);
      quotientUsed++;
    }

    steps.push({
      narration: isSubtract
        ? `Subtract, then bring down the next digit: that leaves ${digits}.`
        : `How many times does the divisor go in? Write the digit on top, then multiply back: ${digits}.`,
      cellKeys,
      carryKeys: [],
      noteKeys: [],
    });
  });

  steps.push({
    narration: `The digits on top give the answer: ${block.question} equals ${answer}.`,
    cellKeys: quotientKeys.slice(quotientUsed),
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });

  return steps;
}

// ── Generic fallback — one step per row ──────────────────────────────────────

function rowTimeline(block: ColumnMethodBlock): ColumnRevealStep[] {
  const maxCols = gridMaxCols(block.rows);
  const steps: ColumnRevealStep[] = block.rows.map((row, ri) => ({
    narration:
      ri === 0
        ? `Let's set up ${block.question}. Watch the digits line up in columns.`
        : `Next line of the working: ${normalizeColumnDigits(row).replace(/↓/g, "")}.`,
    cellKeys: rowCellKeys(ri, row, maxCols),
    carryKeys:
      block.carries
        ?.filter((c) => c.row === ri)
        .map((c) => cellKey(c.row, c.col)) ?? [],
    noteKeys:
      block.cellNotes
        ?.filter((n) => n.row === ri)
        .map((n) => cellKey(n.row, n.col)) ?? [],
  }));

  steps.push({
    narration: `So the answer is ${block.answer}.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });

  return steps;
}
