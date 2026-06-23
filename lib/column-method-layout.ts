import type { ColumnMethodMove } from "@/types/whiteboard";

export const DEFAULT_CELL_W = 32;
export const DEFAULT_CELL_H = 36;
export const DEFAULT_CARRY_H = 16;
export const ROW_SEPARATOR_H = 2;

/** Centre point of a digit cell in the column grid (px, top-left origin). */
export function cellCenter(
  row: number,
  col: number,
  maxCols: number,
  cellW = DEFAULT_CELL_W,
  cellH = DEFAULT_CELL_H,
  carryH = DEFAULT_CARRY_H
): { x: number; y: number } {
  const x = col * cellW + cellW / 2;
  const y = row * (carryH + cellH + ROW_SEPARATOR_H) + carryH + cellH / 2;
  return { x, y };
}

/** Total height of the grid for a given number of rows. */
export function gridHeight(
  rowCount: number,
  cellH = DEFAULT_CELL_H,
  carryH = DEFAULT_CARRY_H
): number {
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
  if (method !== "column_addition" || !carries?.length) return [];

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

/** Build a curved SVG path between two cell centres. */
export function buildArrowPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  kind: "carry" | "borrow" = "carry"
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (kind === "borrow") {
    const midX = x1 + dx * 0.5;
    const midY = y1 + dy * 0.15;
    return `M ${x1},${y1} Q ${midX},${midY} ${x2},${y2}`;
  }

  const cx = x1 + dx * 0.35;
  const cy = y1 + dy * 0.5 - 8;
  return `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;
}

/** Arrowhead triangle points at the end of a path. */
export function arrowheadPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size = 6
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
  kind: "carry" | "borrow" = "carry"
): { x: number; y: number } {
  if (kind === "borrow") {
    return { x: (x1 + x2) / 2, y: Math.min(y1, y2) - 10 };
  }
  return { x: (x1 + x2) / 2, y: Math.min(y1, y2) - 6 };
}
