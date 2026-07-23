import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import type { EquationStep, VisualBlock } from "@/types/whiteboard";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export interface IrregularAreaProblem {
  /** Full width of the bounding rectangle */
  width: number;
  /** Full height of the bounding rectangle */
  height: number;
  /** Inner horizontal step */
  notchWidth: number;
  /** Inner vertical step */
  notchHeight: number;
  unit: string;
}

/**
 * Parses "Estimate the area of the irregular shape on a 1 cm × 1 cm square
 * grid." The only numbers in such a question are the grid's 1 cm × 1 cm
 * pitch — never the shape's dimensions — so the shape itself is always the
 * canonical teaching L (9 × 7 with a 4 × 3 notch). The drawn shape, the
 * working and the answer all come from the same four numbers, so they
 * cannot disagree. The L-shape is a grid-aligned polyomino, which is what
 * makes "count the squares" work: its area is a whole number of squares.
 */
export function parseIrregularArea(text: string): IrregularAreaProblem | null {
  const t = normalizeMathText(text).toLowerCase();
  if (!/\barea\b/.test(t)) return null;
  if (!/irregular|estimate/.test(t)) return null;
  if (/\bperimeter\b/.test(t)) return null;
  const unit = /\bmm\b/.test(t) ? "mm" : /\bm\b/.test(t) && !/\bmm\b/.test(t) ? "m" : "cm";
  return { width: 9, height: 7, notchWidth: 4, notchHeight: 3, unit };
}

export function buildIrregularArea(
  problem: IrregularAreaProblem,
): MethodBuildResult {
  const { width: W, height: H, notchWidth: nw, notchHeight: nh, unit } = problem;
  // Decompose the L into two rectangles: a full-width top strip and the
  // remaining bottom-left strip.
  const topH = H - nh;
  const bottomW = W - nw;
  const areaA = W * topH;
  const areaB = bottomW * nh;
  const total = areaA + areaB;
  const u = unit ? `\\ \\text{${unit}}^2` : "";
  const up = unit ? ` ${unit}²` : "";

  const steps: EquationStep[] = [];
  const teachingSteps: TeachingStep[] = [];
  const push = (
    title: string,
    explanation: string,
    latexBefore: string,
    latexAfter: string,
    operationLabel: string,
    why?: string,
    showAnswer?: boolean,
  ) => {
    steps.push({
      stepNumber: steps.length + 1,
      operationLabel,
      explanation,
      latexBefore,
      latexAfter,
      arrowDirection: "down",
      rule: title,
    });
    teachingSteps.push({
      title,
      explanation,
      why,
      narration: explanation,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer,
    });
  };

  push(
    "Split the shape into two rectangles",
    `Draw one dividing line to split the irregular shape into rectangle A (${W}${unit ? ` ${unit}` : ""} wide, ${topH}${unit ? ` ${unit}` : ""} tall) and rectangle B (${bottomW}${unit ? ` ${unit}` : ""} wide, ${nh}${unit ? ` ${unit}` : ""} tall).`,
    `\\text{A: } ${W} \\times ${topH} \\qquad \\text{B: } ${bottomW} \\times ${nh}`,
    `\\text{A: } ${W} \\times ${topH} \\qquad \\text{B: } ${bottomW} \\times ${nh}`,
    "Split",
    "Splitting an irregular shape into rectangles turns a hard count into two easy multiplications. Every whole square belongs to exactly one rectangle, so none are missed or double-counted.",
  );
  push(
    "Find the area of each rectangle",
    `Rectangle A: ${W} × ${topH} = ${areaA} squares. Rectangle B: ${bottomW} × ${nh} = ${areaB} squares.`,
    `${W} \\times ${topH} = ${areaA}`,
    `${W} \\times ${topH} = ${areaA} \\qquad ${bottomW} \\times ${nh} = ${areaB}`,
    "Multiply",
    `Each square on the grid is 1${unit ? ` ${unit}` : ""} × 1${unit ? ` ${unit}` : ""}, so one square has an area of 1${up.trim() || "square unit"}. Counting squares is the same as multiplying length by width.`,
  );
  push(
    "Add the two areas",
    `${areaA} + ${areaB} = ${total} squares, so the area is ${total}${up}.`,
    `${areaA} + ${areaB}`,
    `${areaA} + ${areaB} = ${total}${u}`,
    "Add",
    `Check by counting: row by row the shape covers ${total} whole squares — the same answer.`,
    true,
  );
  teachingSteps.push({
    title: "Answer",
    explanation: `The area of the irregular shape is ${total}${up}.`,
    narration: `The area of the irregular shape is ${total}${up}.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });

  const block: VisualBlock = {
    type: "labeled_shape",
    shape: "rectilinear",
    rectilinear: {
      width: W,
      height: H,
      notchWidth: nw,
      notchHeight: nh,
      unit,
      showMissing: false,
    },
    caption:
      "Split the irregular shape into two rectangles, then count the squares in each.",
  };
  const extraBlocks: VisualBlock[] = [{ type: "equation_steps", steps }];

  return {
    builderId: "irregular_area_estimate",
    block,
    extraBlocks,
    teachingSteps,
    captions: teachingSteps
      .filter((s) => s.title !== "Answer")
      .map((s) => s.explanation),
    answer: `${total}${up}`,
  };
}
