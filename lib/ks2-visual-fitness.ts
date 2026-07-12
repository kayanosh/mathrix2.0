/**
 * Drop whiteboard blocks that cannot teach the question (wrong scale,
 * empty grids, etc.). Prefer omission over a lying diagram.
 */

import type { VisualBlock } from "@/types/whiteboard";

/** Extract integers from question text (commas allowed). */
export function extractQuestionNumbers(question: string): number[] {
  const matches = question.replace(/,/g, "").match(/\d+/g) || [];
  return matches
    .map((m) => parseInt(m, 10))
    .filter((n) => Number.isFinite(n));
}

function numberLineFit(block: VisualBlock, question: string): boolean {
  if (block.type !== "number_line") return false;
  const range = block.range;
  if (!Array.isArray(range) || range.length < 2) return false;
  const min = Number(range[0]);
  const max = Number(range[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return false;

  const nums = extractQuestionNumbers(question);
  // Prefer a number from the question that sits in the interior or on an endpoint.
  if (nums.length === 0) return true;
  const inRange = nums.some((n) => n >= min && n <= max);
  if (inRange) return true;

  // Rounding bracket: range width is a standard place and endpoints are multiples.
  const span = max - min;
  if ([10, 100, 1000, 10000, 100000, 1000000].includes(span)) {
    return nums.some((n) => n >= min && n <= max);
  }
  return false;
}

function tableFit(block: VisualBlock): boolean {
  if (block.type !== "table") return false;
  const headers = Array.isArray(block.headers) ? block.headers : [];
  const rows = Array.isArray(block.rows) ? block.rows : [];
  if (headers.length === 0 && rows.length === 0) return false;
  if (rows.some((r) => !Array.isArray(r))) return false;
  // Rectangular when headers exist
  if (headers.length > 0 && rows.some((r) => r.length > 0 && r.length !== headers.length)) {
    // Allow shorter rows (leading empty place-value cells often omitted) if ≤ headers
    if (rows.some((r) => r.length > headers.length)) return false;
  }
  return true;
}

function columnMethodFit(block: VisualBlock): boolean {
  if (block.type !== "column_method") return false;
  return Array.isArray(block.rows) && block.rows.length > 0;
}

function equationStepsFit(block: VisualBlock): boolean {
  if (block.type !== "equation_steps") return false;
  return Array.isArray(block.steps) && block.steps.length > 0;
}

/** True when the block is safe to show for this question. */
export function isBlockFit(block: VisualBlock, question: string): boolean {
  switch (block.type) {
    case "number_line":
      return numberLineFit(block, question);
    case "table":
      return tableFit(block);
    case "column_method":
      return columnMethodFit(block);
    case "equation_steps":
      return equationStepsFit(block);
    case "text":
      return typeof block.content === "string" && block.content.trim().length > 0;
    default:
      // Other visuals (shapes, graphs…) — keep if structurally present
      return true;
  }
}

/** Filter out unfit blocks. Never invent a placeholder scale. */
export function filterFitBlocks(
  blocks: VisualBlock[],
  question: string,
): VisualBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter((b) => isBlockFit(b, question));
}
