import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import type { EquationStep, VisualBlock } from "@/types/whiteboard";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export interface RectilinearPerimeterProblem {
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
 * Parses "Find the perimeter of the L-shaped rectilinear shape." When the
 * question names exactly four dimensions we use them; otherwise we invent
 * the canonical teaching example (10 × 8 with a 6 × 5 notch). Inventing
 * deterministically is the whole point: the drawn shape, the working and
 * the answer all come from the same four numbers, so they cannot disagree.
 */
export function parseRectilinearPerimeter(
  text: string,
): RectilinearPerimeterProblem | null {
  const t = normalizeMathText(text).toLowerCase();
  if (!/\bperimeter\b/.test(t)) return null;
  if (!/rectilinear|l-?shaped|compound/.test(t)) return null;
  const unit = /\bmm\b/.test(t) ? "mm" : /\bm\b/.test(t) && !/\bmm\b/.test(t) ? "m" : "cm";
  const nums = [...new Set(
    Array.from(t.matchAll(/\d+(?:\.\d+)?/g), (m) => Number(m[0])).filter(
      (n) => Number.isFinite(n) && n > 0,
    ),
  )];
  if (nums.length === 4) {
    const sorted = [...nums].sort((a, b) => b - a);
    const [width, height, notchWidth, notchHeight] = sorted;
    if (width > notchWidth && height > notchHeight) {
      return { width, height, notchWidth, notchHeight, unit };
    }
  }
  return { width: 10, height: 8, notchWidth: 6, notchHeight: 5, unit };
}

export function buildRectilinearPerimeter(
  problem: RectilinearPerimeterProblem,
): MethodBuildResult {
  const { width: W, height: H, notchWidth: nw, notchHeight: nh, unit } = problem;
  const missingH = W - nw; // bottom side
  const missingV = H - nh; // right side
  const perimeter = W + missingV + nw + nh + missingH + H; // = 2(W+H)
  const u = unit ? `\\ \\text{${unit}}` : "";
  const up = unit ? ` ${unit}` : "";

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
    "Find the missing horizontal side",
    `The bottom side and the ${nw}${up} side together make the full top width. ${W} − ${nw} = ${missingH}${up}.`,
    `${W} - ${nw}`,
    `${W} - ${nw} = ${missingH}${u}`,
    "Missing side",
    "Distances going right must equal distances going left.",
  );
  push(
    "Find the missing vertical side",
    `The right side and the ${nh}${up} side together make the full left height. ${H} − ${nh} = ${missingV}${up}.`,
    `${H} - ${nh}`,
    `${H} - ${nh} = ${missingV}${u}`,
    "Missing side",
    "Distances going up must equal distances going down.",
  );
  push(
    "Add all the outside sides",
    `${W} + ${missingV} + ${nw} + ${nh} + ${missingH} + ${H} = ${perimeter}${up}. Travel around the shape and add every outside edge once.`,
    `${W} + ${missingV} + ${nw} + ${nh} + ${missingH} + ${H}`,
    `${perimeter}${u}`,
    "Add the sides",
    `Shortcut check: a rectilinear perimeter equals its bounding rectangle's — 2 × (${W} + ${H}) = ${perimeter}${up}.`,
    true,
  );
  teachingSteps.push({
    title: "Answer",
    explanation: `The perimeter is ${perimeter}${up}.`,
    narration: `The perimeter is ${perimeter}${up}.`,
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
      showMissing: true,
    },
    caption: "Find the two missing sides, then add every outside edge.",
  };
  const extraBlocks: VisualBlock[] = [{ type: "equation_steps", steps }];

  return {
    builderId: "rectilinear_perimeter",
    block,
    extraBlocks,
    teachingSteps,
    captions: teachingSteps
      .filter((s) => s.title !== "Answer")
      .map((s) => s.explanation),
    answer: `${perimeter}${up}`,
  };
}
