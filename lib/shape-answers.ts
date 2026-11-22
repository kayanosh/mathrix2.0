/**
 * Answers that follow from the drawing, worked out exactly.
 *
 * Once a shape is on the board as numbers, some answers are no longer a matter
 * of opinion. An L-shape 10 across and 8 down with a 4 by 4 corner missing has
 * an area of 64, whatever a model says. Two things found by testing photos:
 *
 *   - A photo of that L-shape was read correctly and then answered "76 cm²",
 *     with no working shown.
 *   - A right-angled triangle with short sides 5 and 12 was answered x = 13,
 *     correctly, but drawn with the right angle at the wrong corner, so the
 *     picture showed 12 as the longest side and x as a short one.
 *
 * Both are settled here from the block itself, so the picture, the working and
 * the answer cannot disagree.
 */
import type { EquationStep, EquationStepBlock, LabeledShapeBlock, WhiteboardResponse } from "@/types/whiteboard";
import { labelLength, lShapeFromSixSides, tidyShapeBlock } from "@/lib/shape-geometry";

const round = (n: number) => Number(n.toFixed(6));

/** Every number written in a line of text, with thousands commas removed. */
function numbersIn(text: string): number[] {
  return (
    text
      .replace(/\\htmlId\{[^}]*\}\{([^}]*)\}/g, "$1")
      .replace(/(\d),(?=\d{3}\b)/g, "$1")
      // The "2" of cm² and the "2" of cm^2 are not answers.
      .replace(/(?:mm|cm|km|m)\s*(?:²|³|\^\s*\{?\s*[23]\s*\}?)/g, " ")
      .match(/-?\d+(?:\.\d+)?/g)
      ?.map(Number) ?? []
  );
}

function step(
  stepNumber: number,
  operationLabel: string,
  explanation: string,
  latexBefore: string,
  latexAfter: string,
): EquationStep {
  return { stepNumber, operationLabel, explanation, latexBefore, latexAfter, arrowDirection: "simplify" };
}

/** The working for the area of an L-shape, split into the two rectangles the board draws. */
function lShapeArea(block: LabeledShapeBlock): { steps: EquationStepBlock; answer: number; unit: string } | null {
  const r = block.rectilinear;
  if (!r || !(r.width > r.notchWidth && r.height > r.notchHeight && r.notchWidth > 0 && r.notchHeight > 0)) return null;
  const unit = r.unit ?? "";
  const u = unit ? `\\text{ ${unit}}` : "";
  const topHeight = round(r.height - r.notchHeight);
  const bottomWidth = round(r.width - r.notchWidth);
  const top = round(r.width * topHeight);
  const bottom = round(bottomWidth * r.notchHeight);
  const total = round(top + bottom);
  const squared = unit ? `\\text{ ${unit}}^2` : "";
  return {
    answer: total,
    unit,
    steps: {
      type: "equation_steps",
      steps: [
        step(
          1,
          "Split it into two rectangles",
          "Cut the shape with a line across. This makes a top rectangle and a bottom rectangle.",
          "\\text{Area} = \\text{top} + \\text{bottom}",
          "\\text{Area} = \\text{top} + \\text{bottom}",
        ),
        // One line each: the board shows a step's last line, so two lengths in
        // one step put only the second on the board.
        step(
          2,
          "How high is the top rectangle?",
          `The whole shape is ${r.height} high. Take away the ${r.notchHeight} at the bottom.`,
          `${r.height} - ${r.notchHeight}`,
          `${r.height} - ${r.notchHeight} = ${topHeight}${u}`,
        ),
        step(
          3,
          "How wide is the bottom rectangle?",
          `The whole shape is ${r.width} wide. Take away the ${r.notchWidth} that is missing.`,
          `${r.width} - ${r.notchWidth}`,
          `${r.width} - ${r.notchWidth} = ${bottomWidth}${u}`,
        ),
        step(
          4,
          "Area of the top rectangle",
          `The top rectangle is ${r.width} by ${topHeight}. Multiply them.`,
          `${r.width} \\times ${topHeight}`,
          `${r.width} \\times ${topHeight} = ${top}${squared}`,
        ),
        step(
          5,
          "Area of the bottom rectangle",
          `The bottom rectangle is ${bottomWidth} by ${r.notchHeight}. Multiply them.`,
          `${bottomWidth} \\times ${r.notchHeight}`,
          `${bottomWidth} \\times ${r.notchHeight} = ${bottom}${squared}`,
        ),
        step(
          6,
          "Add the two areas",
          "Add the two rectangles to get the whole shape.",
          `${top} + ${bottom}`,
          `${top} + ${bottom} = ${total}${squared}`,
        ),
      ],
    },
  };
}

/** The working for the perimeter of an L-shape. */
function lShapePerimeter(block: LabeledShapeBlock): { steps: EquationStepBlock; answer: number; unit: string } | null {
  const r = block.rectilinear;
  if (!r || !(r.width > r.notchWidth && r.height > r.notchHeight && r.notchWidth > 0 && r.notchHeight > 0)) return null;
  const unit = r.unit ?? "";
  const u = unit ? `\\text{ ${unit}}` : "";
  const sides = [r.width, round(r.height - r.notchHeight), r.notchWidth, r.notchHeight, round(r.width - r.notchWidth), r.height];
  const total = round(sides.reduce((a, b) => a + b, 0));
  return {
    answer: total,
    unit,
    steps: {
      type: "equation_steps",
      steps: [
        step(
          1,
          "Find the first missing side",
          `The whole shape is ${r.height} high. Take away ${r.notchHeight}.`,
          `${r.height} - ${r.notchHeight}`,
          `${r.height} - ${r.notchHeight} = ${sides[1]}${u}`,
        ),
        step(
          2,
          "Find the second missing side",
          `The whole shape is ${r.width} wide. Take away ${r.notchWidth}.`,
          `${r.width} - ${r.notchWidth}`,
          `${r.width} - ${r.notchWidth} = ${sides[4]}${u}`,
        ),
        step(
          3,
          "Add all six sides",
          "The perimeter is the distance all the way round. Add every side once.",
          sides.join(" + "),
          `${sides.join(" + ")} = ${total}${u}`,
        ),
      ],
    },
  };
}

/**
 * If the board shows an L-shape and the question is for its area or its
 * perimeter, the answer is checked against the shape. A wrong one, or one with
 * no working, is replaced by the exact working.
 */
function settleLShape(data: WhiteboardResponse, question: string): WhiteboardResponse {
  const shape = data.blocks.find(
    (b): b is LabeledShapeBlock => b.type === "labeled_shape" && b.shape === "rectilinear",
  );
  if (!shape) return data;
  const asked = `${question} ${data.intro ?? ""} ${data.conclusion ?? ""}`;
  const wantsPerimeter = /\bperimeter\b/i.test(asked);
  const wantsArea = /\barea\b/i.test(asked);
  if (wantsArea === wantsPerimeter) return data;

  const exact = wantsArea ? lShapeArea(shape) : lShapePerimeter(shape);
  if (!exact) return data;

  const stated = numbersIn(data.conclusion ?? "");
  const hasWorking = data.blocks.some((b) => b.type === "equation_steps" && b.steps.length > 0);
  const agrees = stated.some((n) => Math.abs(n - exact.answer) < 1e-9);
  if (agrees && hasWorking) return data;

  const unit = exact.unit ? ` ${exact.unit}${wantsArea ? "²" : ""}` : "";
  return {
    ...data,
    blocks: [...data.blocks.filter((b) => b.type !== "equation_steps" && b.type !== "text"), exact.steps],
    teachingSteps: undefined,
    conclusion: `The ${wantsArea ? "area" : "perimeter"} of the shape is ${exact.answer}${unit}.`,
  };
}

/**
 * Put the right angle at the corner the answer needs.
 *
 * With two sides known and one to find, the answer says which side was the
 * longest: if the two known sides squared add up to the answer squared, the
 * unknown side is the longest, and the right angle is opposite it.
 */
function settleRightAngle(block: LabeledShapeBlock, answer: number[]): LabeledShapeBlock {
  const corners = (block.vertices ?? []).map((v) => v.label);
  const right = (block.angles ?? []).filter((a) => a.isRightAngle);
  const sides = block.sides ?? [];
  if (block.shape !== "triangle" || corners.length !== 3 || right.length !== 1 || sides.length !== 3) return block;

  const known = sides.filter((s) => labelLength(s.label) !== null);
  const unknown = sides.filter((s) => labelLength(s.label) === null);
  if (known.length !== 2 || unknown.length !== 1) return block;
  const [a, b] = known.map((s) => labelLength(s.label) as number);
  const fits = (x: number, y: number, longest: number) => Math.abs(x * x + y * y - longest * longest) < 0.05 * longest;

  const oppositeOf = (side: { from: string; to: string }) => corners.find((c) => c !== side.from && c !== side.to);
  let corner: string | undefined;
  if (answer.some((v) => v > Math.max(a, b) && fits(a, b, v))) {
    // The unknown side is the longest: the right angle faces it.
    corner = oppositeOf(unknown[0]);
  } else if (answer.some((v) => v < Math.max(a, b) && fits(v, Math.min(a, b), Math.max(a, b)))) {
    // A known side is the longest: the right angle faces that one.
    corner = oppositeOf(known[a >= b ? 0 : 1]);
  }
  if (!corner || corner === right[0].vertex) return block;

  return {
    ...block,
    angles: (block.angles ?? []).map((angle) => (angle.isRightAngle ? { ...angle, vertex: corner as string } : angle)),
  };
}

export type AnglePair = "alternate" | "corresponding" | "co-interior" | "vertically opposite";

/**
 * What two angles on parallel lines are to each other, from where they sit.
 *
 *   same corner at each crossing                          corresponding (F)
 *   between the lines, opposite sides of the crossing     alternate (Z)
 *   between the lines, same side of the crossing          co-interior (C)
 *   opposite corners at one crossing                      vertically opposite
 *
 * Returns null for any other pair (two angles on a straight line, or outside
 * the parallel lines on opposite sides), which have no single GCSE name here.
 */
export function anglePairOnParallelLines(block: LabeledShapeBlock): AnglePair | null {
  const angles = block.parallel?.angles ?? [];
  if (block.shape !== "parallel_lines" || angles.length !== 2) return null;
  const [p, q] = angles;
  const side = (corner: string) => corner.split("-")[1];
  const level = (corner: string) => corner.split("-")[0];

  if (p.at === q.at) {
    return side(p.corner) !== side(q.corner) && level(p.corner) !== level(q.corner) ? "vertically opposite" : null;
  }
  if (p.corner === q.corner) return "corresponding";
  const top = p.at === "top" ? p : q;
  const bottom = p.at === "top" ? q : p;
  // Between the parallel lines: below the top one and above the bottom one.
  if (level(top.corner) !== "below" || level(bottom.corner) !== "above") return null;
  return side(top.corner) === side(bottom.corner) ? "co-interior" : "alternate";
}

const PAIR_NAMES = /\b(alternate|corresponding|co-?interior|allied|vertically opposite)\b/gi;

/**
 * Name the angle pair by what the drawing shows.
 *
 * The same photo of two parallel lines was answered "65°, alternate angles" on
 * one run and "65°, corresponding angles" on the next, with the same drawing
 * both times. The number was right each time; the reason is a mark on its own
 * in an exam, and it is fixed by where the two angles are.
 */
function settleAnglePair(data: WhiteboardResponse): WhiteboardResponse {
  const block = data.blocks.find(
    (b): b is LabeledShapeBlock => b.type === "labeled_shape" && b.shape === "parallel_lines",
  );
  const pair = block ? anglePairOnParallelLines(block) : null;
  if (!pair) return data;
  const rename = (text: string | undefined | null) =>
    typeof text === "string"
      ? text.replace(PAIR_NAMES, (found) => (/^[A-Z]/.test(found) ? pair[0].toUpperCase() + pair.slice(1) : pair))
      : text;
  const fixed = <T,>(value: T): T => {
    if (typeof value === "string") return rename(value) as T;
    if (Array.isArray(value)) return value.map(fixed) as T;
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, v]) => [
          key,
          // Only the words a pupil reads. Maths, ids and the drawing are left alone.
          ["intro", "conclusion", "hint", "keyTakeaway", "examTip", "explanation", "operationLabel", "rule", "why", "content", "steps", "blocks", "selfCheck"].includes(key)
            ? fixed(v)
            : v,
        ]),
      ) as T;
    }
    return value;
  };
  const named = fixed(data);
  return JSON.stringify(named) === JSON.stringify(data) ? data : named;
}

/**
 * An L-shape that arrived as a six-cornered shape, as an L-shape. One whose six
 * lengths do not fit together is left exactly as it came: that is a misread
 * photo, and the check that sends it back to be read again needs to see it.
 */
function asLShape(block: LabeledShapeBlock): LabeledShapeBlock {
  const sixNumbers =
    (block.vertices?.length ?? 0) === 6 &&
    (block.sides ?? []).filter((s) => labelLength(s.label) !== null).length === 6;
  if (sixNumbers && !lShapeFromSixSides(block)) return block;
  return tidyShapeBlock(block);
}

/** The board after its shapes and its answer have been made to agree. */
export function settleShapeAnswers(raw: WhiteboardResponse, question: string): WhiteboardResponse {
  const data: WhiteboardResponse = {
    ...raw,
    blocks: raw.blocks.map((block) => (block.type === "labeled_shape" ? asLShape(block) : block)),
  };
  const settled = settleAnglePair(settleLShape(data, question));
  const answer = numbersIn(settled.conclusion ?? "");
  if (answer.length === 0) return settled;
  let changed = false;
  const blocks = settled.blocks.map((block) => {
    if (block.type !== "labeled_shape") return block;
    const fixed = settleRightAngle(block, answer);
    if (fixed !== block) changed = true;
    return fixed;
  });
  return changed ? { ...settled, blocks } : settled;
}
