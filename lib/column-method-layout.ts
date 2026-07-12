import type { ColumnMethodMove } from "@/types/whiteboard";

export const DEFAULT_CELL_W = 36;
export const DEFAULT_CELL_H = 44;
export const DEFAULT_CARRY_H = 28;
/** Compact spacer when a row has no carry digits (reduces vertical sparseness). */
export const COMPACT_CARRY_H = 6;
export const ROW_SEPARATOR_H = 2;

/** Per-row carry-band heights — full height only where carries exist. */
export function carryHeightsForRows(
  rowCount: number,
  carries: { row: number; col: number; digit: string }[] | undefined,
  method?: string,
): number[] {
  const hasCarryOn = new Set((carries || []).map((c) => c.row));
  // Addition/multiplication always reserve a full band on the multiplicand/top
  // row when any carries exist, so arrows have room.
  if (
    (method === "column_addition" || method === "column_multiplication") &&
    (carries?.length ?? 0) > 0
  ) {
    hasCarryOn.add(0);
  }
  return Array.from({ length: rowCount }, (_, ri) =>
    hasCarryOn.has(ri) ? DEFAULT_CARRY_H : COMPACT_CARRY_H,
  );
}

function rowStride(ri: number, cellH: number, carryHeights: number[]): number {
  return (carryHeights[ri] ?? DEFAULT_CARRY_H) + cellH + ROW_SEPARATOR_H;
}

function rowOriginY(row: number, cellH: number, carryHeights: number[]): number {
  let y = 0;
  for (let r = 0; r < row; r++) y += rowStride(r, cellH, carryHeights);
  return y;
}

/** Centre point of a digit cell in the column grid (px, top-left origin). */
export function cellCenter(
  row: number,
  col: number,
  _maxCols: number,
  cellW = DEFAULT_CELL_W,
  cellH = DEFAULT_CELL_H,
  carryH: number | number[] = DEFAULT_CARRY_H
): { x: number; y: number } {
  const x = col * cellW + cellW / 2;
  if (Array.isArray(carryH)) {
    const origin = rowOriginY(row, cellH, carryH);
    const band = carryH[row] ?? DEFAULT_CARRY_H;
    return { x, y: origin + band + cellH / 2 };
  }
  const y = row * (carryH + cellH + ROW_SEPARATOR_H) + carryH + cellH / 2;
  return { x, y };
}

/** Centre of the carry band above a row (where carry digits are written). */
export function carrySlotCenter(
  row: number,
  col: number,
  cellW = DEFAULT_CELL_W,
  cellH = DEFAULT_CELL_H,
  carryH: number | number[] = DEFAULT_CARRY_H
): { x: number; y: number } {
  const x = col * cellW + cellW / 2;
  if (Array.isArray(carryH)) {
    const origin = rowOriginY(row, cellH, carryH);
    const band = carryH[row] ?? DEFAULT_CARRY_H;
    return { x, y: origin + band / 2 };
  }
  const y = row * (carryH + cellH + ROW_SEPARATOR_H) + carryH / 2;
  return { x, y };
}

/** Total height of the grid for a given number of rows. */
export function gridHeight(
  rowCount: number,
  cellH = DEFAULT_CELL_H,
  carryH: number | number[] = DEFAULT_CARRY_H
): number {
  if (Array.isArray(carryH)) {
    let h = 0;
    for (let r = 0; r < rowCount; r++) h += rowStride(r, cellH, carryH);
    return h;
  }
  return rowCount * (carryH + cellH + ROW_SEPARATOR_H);
}

/** Total width of the grid. */
export function gridWidth(maxCols: number, cellW = DEFAULT_CELL_W): number {
  return maxCols * cellW;
}

/**
 * Infer carry arrows when the AI omits `moves` but provides `carries`.
 * Carry at (r, c) is assumed to come from the column immediately to the right.
 */
export function inferCarryMoves(
  method: string,
  carries: { row: number; col: number; digit: string }[] | undefined,
  maxCols: number
): ColumnMethodMove[] {
  if (
    (method !== "column_addition" && method !== "column_multiplication") ||
    !carries?.length
  ) {
    return [];
  }

  return carries.map((c) => {
    const fromCol = Math.min(c.col + 1, maxCols - 1);
    return {
      fromRow: c.row,
      fromCol,
      toRow: c.row,
      toCol: c.col,
      label: `carry ${c.digit}`,
      kind: "carry" as const,
    };
  });
}

/** Strip spaces / operator prefixes so digit grids stay tightly aligned. */
export function normalizeColumnDigits(row: string): string {
  return row.replace(/^[+\-×x]\s*/, "").replace(/\s+/g, "").trim();
}

/**
 * Sort moves right-to-left and assign lane indices **per destination row band**.
 * Prevents final-add carries from inheriting a high global lane and lofting into digits.
 */
export function movesWithLanes(
  moves: ColumnMethodMove[],
): Array<ColumnMethodMove & { laneIndex: number }> {
  const byRow = new Map<number, ColumnMethodMove[]>();
  for (const move of moves) {
    const key = move.toRow;
    const list = byRow.get(key) || [];
    list.push(move);
    byRow.set(key, list);
  }

  const result: Array<ColumnMethodMove & { laneIndex: number }> = [];
  for (const list of byRow.values()) {
    const sorted = [...list].sort((a, b) => b.fromCol - a.fromCol);
    sorted.forEach((move, laneIndex) => {
      result.push({ ...move, laneIndex });
    });
  }
  // Stable visual order: top rows first, then right-to-left within row
  return result.sort(
    (a, b) => a.toRow - b.toRow || b.fromCol - a.fromCol,
  );
}

/** Pull an endpoint back along the vector so the arrow tip does not sit on a glyph. */
export function insetEndpoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  insetPx = 9,
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < insetPx * 2) return to;
  const t = (len - insetPx) / len;
  return { x: from.x + dx * t, y: from.y + dy * t };
}

/** Control-point Y for a carry arc — shallow, never above the SVG top. */
export function carryControlY(
  y1: number,
  y2: number,
  laneIndex = 0,
): number {
  // Prefer a shallow same-row arc inside the carry band, not a high loop into headers.
  const lift = 6 + laneIndex * 4;
  const raw = Math.min(y1, y2) - lift;
  return Math.max(2, raw);
}

/** Build a curved SVG path between two points. */
export function buildArrowPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  kind: "carry" | "borrow" = "carry",
  laneIndex = 0,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (kind === "borrow") {
    const midX = x1 + dx * 0.5 + laneIndex * 6;
    const midY = y1 + dy * 0.15 - laneIndex * 4;
    return `M ${x1},${y1} Q ${midX},${midY} ${x2},${y2}`;
  }

  const cx = (x1 + x2) / 2;
  const cy = carryControlY(y1, y2, laneIndex);
  return `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;
}

/** Arrowhead triangle points at the end of a path. */
export function arrowheadPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size = 8,
): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const ax = x2 - size * Math.cos(angle - Math.PI / 6);
  const ay = y2 - size * Math.sin(angle - Math.PI / 6);
  const bx = x2 - size * Math.cos(angle + Math.PI / 6);
  const by = y2 - size * Math.sin(angle + Math.PI / 6);
  return `M ${ax},${ay} L ${x2},${y2} L ${bx},${by}`;
}

/** Midpoint of a quadratic curve for label placement. */
export function arrowLabelPosition(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  kind: "carry" | "borrow" = "carry",
  laneIndex = 0,
): { x: number; y: number } {
  if (kind === "borrow") {
    return { x: (x1 + x2) / 2, y: Math.min(y1, y2) - 10 - laneIndex * 4 };
  }
  return {
    x: (x1 + x2) / 2,
    y: carryControlY(y1, y2, laneIndex),
  };
}
