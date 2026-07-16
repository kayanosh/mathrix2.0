/**
 * Wave 3 KS2 builders: angles, coordinates, bar charts, unit conversion, ratio, function machines.
 */

import type {
  ChartBlock,
  CoordinateGraphBlock,
  EquationStepBlock,
  LabeledShapeBlock,
  TableBlock,
} from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export type AngleProblemKind = "triangle" | "straight_line" | "around_point";

/** Triangle / straight line / around a point missing angle. */
export function parseAngleProblem(
  text: string,
): { known: number[]; total: 180 | 360; kind: AngleProblemKind } | null {
  const t = normalizeMathText(text);
  if (!/\bangle\b/i.test(t) && !/\b(straight line|around a point)\b/i.test(t)) {
    return null;
  }
  const explicitAroundPoint = /\b(around a point|full turn|360)\b/i.test(t);
  const explicitTriangle = /\btriangle\b/i.test(t);
  const explicitStraightLine = /\b(straight line|linear pair)\b/i.test(t);
  const total: 180 | 360 = explicitAroundPoint ? 360 : 180;
  const known = [...t.matchAll(/(\d+)\s*°/g)].map((m) => parseInt(m[1], 10));
  if (known.length === 0) {
    const plain = [...t.matchAll(/\b(\d{2,3})\b/g)].map((m) => parseInt(m[1], 10));
    const filtered = plain.filter((n) => n > 0 && n < total);
    if (filtered.length === 0) return null;
    known.push(...filtered.slice(0, 2));
  }
  const kind: AngleProblemKind = explicitAroundPoint
    ? "around_point"
    : explicitTriangle
      ? "triangle"
      : explicitStraightLine
        ? "straight_line"
        : known.length >= 2
          ? "triangle"
          : "straight_line";
  return { known, total, kind };
}

export function buildAngleDiagram(
  known: number[],
  total: 180 | 360,
  kind: AngleProblemKind,
): MethodBuildResult {
  const sumKnown = known.reduce((a, b) => a + b, 0);
  const missing = total - sumKnown;
  const labels = [...known.map((d) => `${d}°`), `${missing}°`];
  const shape: LabeledShapeBlock = {
    type: "labeled_shape",
    shape: kind,
    vertices:
      kind === "triangle"
        ? [{ label: "A" }, { label: "B" }, { label: "C" }]
        : kind === "straight_line"
          ? [{ label: "A" }, { label: "O" }, { label: "B" }, { label: "C" }]
          : [{ label: "O" }],
    angles: labels.map((label, i) => ({
      vertex: kind === "triangle" ? (["A", "B", "C"][i] || "C") : "O",
      degrees: i < known.length ? known[i] : missing,
      label,
    })),
  };
  const rule =
    kind === "triangle"
      ? {
          operationLabel: "Angles in a triangle",
          explanation: "Interior angles in a triangle add to 180°.",
          short: "Triangle total",
          why: "Angles in a triangle sum to 180°.",
          intro: "triangle",
        }
      : kind === "around_point"
        ? {
            operationLabel: "Angles around a point",
            explanation: "Angles around a point add to 360°.",
            short: "Around a point",
            why: "Angles around a point sum to 360°.",
            intro: "around a point",
          }
        : {
            operationLabel: "Angles on a straight line",
            explanation: "Angles on a straight line add to 180°.",
            short: "Straight line",
            why: "Angles on a straight line sum to 180°.",
            intro: "straight line",
          };
  const steps: EquationStepBlock = {
    type: "equation_steps",
    steps: [
      {
        stepNumber: 1,
        operationLabel: rule.operationLabel,
        explanation: rule.explanation,
        rule: rule.short,
        latexBefore: known.map((k) => `${k}^{\\circ}`).join(" + ") + ` + x = ${total}^{\\circ}`,
        latexAfter: `x = ${total}^{\\circ} - ${sumKnown}^{\\circ}`,
        arrowDirection: "simplify",
      },
      {
        stepNumber: 2,
        operationLabel: "Find the missing angle",
        explanation: `${total} − ${sumKnown} = ${missing}°.`,
        latexBefore: `${total} - ${sumKnown}`,
        latexAfter: `${missing}^{\\circ}`,
        arrowDirection: "simplify",
      },
    ],
  };
  return {
    builderId: "angle_diagram",
    block: shape,
    extraBlocks: [steps],
    teachingSteps: [
      {
        title: "Missing angle",
        explanation: `${missing}°`,
        why: rule.why,
        narration: `The missing angle is ${missing} degrees.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
        showAnswer: true,
      },
    ],
    captions: [`Missing angle = ${missing}°`],
    answer: `${missing}°`,
    intro: `Find the missing angle (${rule.intro}).`,
  };
}

export function parseCoordinatePlot(
  text: string,
): { points: { x: number; y: number; label: string }[] } | null {
  const t = normalizeMathText(text);
  if (!/\b(coordinate|plot|grid|quadrant|translate|reflect)\b/i.test(t)) return null;
  const pts: { x: number; y: number; label: string }[] = [];
  const re = /\(?\s*(-?\d+)\s*,\s*(-?\d+)\s*\)?/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(t)) !== null) {
    pts.push({
      x: parseInt(m[1], 10),
      y: parseInt(m[2], 10),
      label: String.fromCharCode(65 + i),
    });
    i++;
    if (i >= 6) break;
  }
  if (pts.length === 0) return null;
  return { points: pts };
}

export type CoordinateProblem =
  | { kind: "quadrant"; point: { x: number; y: number; label: string } }
  | {
      kind: "select_quadrant";
      quadrant: "I" | "II" | "III" | "IV";
      points: { x: number; y: number; label: string }[];
    }
  | { kind: "position"; point: { x: number; y: number; label: string } }
  | {
      kind: "translate";
      starts: { x: number; y: number; label: string }[];
      dx: number;
      dy: number;
    }
  | {
      kind: "translation_vector";
      start: { x: number; y: number };
      end: { x: number; y: number };
    }
  | {
      kind: "reflect";
      starts: { x: number; y: number; label: string }[];
      axis: "x" | "y";
      axisValue: number;
    };

function coordinatePairs(text: string): { x: number; y: number }[] {
  return [...text.matchAll(/\(?\s*(-?\d+)\s*,\s*(-?\d+)\s*\)?/g)].map(
    (match) => ({ x: Number(match[1]), y: Number(match[2]) }),
  );
}

function labelledCoordinatePairs(
  text: string,
): { x: number; y: number; label: string }[] {
  return [
    ...text.matchAll(/(?:\b([A-Z])\s*)?\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/gi),
  ].map((match, index) => ({
    x: Number(match[2]),
    y: Number(match[3]),
    label: match[1]?.toUpperCase() || String.fromCharCode(65 + index),
  }));
}

function parseTranslationVector(text: string): { x: number; y: number } | null {
  const matrix = text.match(
    /\\begin\{(?:p|b)?matrix\}\s*(-?\d+)\s*\\\\+\s*(-?\d+)\s*\\end\{(?:p|b)?matrix\}/i,
  );
  if (matrix) return { x: Number(matrix[1]), y: Number(matrix[2]) };
  const binomial = text.match(
    /\\binom\s*\{\s*(-?\d+)\s*\}\s*\{\s*(-?\d+)\s*\}/i,
  );
  if (binomial) return { x: Number(binomial[1]), y: Number(binomial[2]) };
  const inline = text.match(
    /\b(?:by|vector)\s*(?:the\s+vector\s*)?\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/i,
  );
  return inline ? { x: Number(inline[1]), y: Number(inline[2]) } : null;
}

function signedMovement(
  text: string,
  positiveWord: "right" | "up",
  negativeWord: "left" | "down",
): number | null {
  const words = `${positiveWord}|${negativeWord}`;
  const numberFirst = text.match(
    new RegExp(`(\\d+)\\s*(?:squares?|places?|units?)?\\s*(${words})`, "i"),
  );
  const wordFirst = text.match(
    new RegExp(`(${words})\\s*(?:by\\s*)?(\\d+)`, "i"),
  );
  const amount = Number(numberFirst?.[1] ?? wordFirst?.[2]);
  const direction = (numberFirst?.[2] ?? wordFirst?.[1] ?? "").toLowerCase();
  if (!Number.isFinite(amount) || !direction) return null;
  return direction === negativeWord ? -amount : amount;
}

/** Parse coordinate tasks before generic signed-number logic sees negative values. */
export function parseCoordinateProblem(text: string): CoordinateProblem | null {
  const t = normalizeMathText(text);
  if (!/\b(coordinate|point|quadrant|translate|translation|reflect|reflection)\b/i.test(t)) {
    return null;
  }
  const pairs = coordinatePairs(t);
  const labelledPairs = labelledCoordinatePairs(t);
  const label = t.match(/\bpoint\s+([A-Z])\b/i)?.[1]?.toUpperCase() || "P";

  const selectQuadrant = t.match(
    /\bwhich coordinate\b[\s\S]*?\bquadrant\s*(IV|III|II|I|[1-4])\b/i,
  );
  if (selectQuadrant && pairs.length > 0) {
    const quadrant = ({
      "1": "I",
      "2": "II",
      "3": "III",
      "4": "IV",
      I: "I",
      II: "II",
      III: "III",
      IV: "IV",
    } as const)[selectQuadrant[1].toUpperCase() as "1" | "2" | "3" | "4" | "I" | "II" | "III" | "IV"];
    return {
      kind: "select_quadrant",
      quadrant,
      points: pairs.map((point, index) => ({
        ...point,
        label: String.fromCharCode(65 + index),
      })),
    };
  }

  if (/\bwhich quadrant|\bwhat quadrant|\bquadrant contains\b/i.test(t) && pairs[0]) {
    return { kind: "quadrant", point: { ...pairs[0], label } };
  }

  if (
    /\b(?:write|find)\s+(?:the\s+)?translation vector\b|\bmoves?\s+from\b/i.test(t) &&
    pairs.length >= 2
  ) {
    return { kind: "translation_vector", start: pairs[0], end: pairs[1] };
  }

  if (/\btranslat(?:e|ed|ion)\b/i.test(t) && pairs[0]) {
    const horizontal = signedMovement(t, "right", "left");
    const vertical = signedMovement(t, "up", "down");
    const vector = parseTranslationVector(t);
    if (vector) {
      const starts = labelledPairs.filter(
        (point, index) =>
          !(
            index === labelledPairs.length - 1 &&
            labelledPairs.length > 1 &&
            point.x === vector.x &&
            point.y === vector.y &&
            /\b(?:by|vector)\s*(?:the\s+vector\s*)?\(\s*-?\d+\s*,/i.test(t)
          ),
      );
      return {
        kind: "translate",
        starts,
        dx: vector.x,
        dy: vector.y,
      };
    }
    if (horizontal !== null || vertical !== null) {
      return {
        kind: "translate",
        starts: labelledPairs,
        dx: horizontal || 0,
        dy: vertical || 0,
      };
    }
  }

  if (/\breflect(?:ed|ion)?\b/i.test(t) && pairs[0]) {
    const line = t.match(/\b(?:line\s+)?([xy])\s*=\s*(-?\d+)\b/i);
    const axisMatch = t.match(/\b([xy])[- ]?axis\b/i);
    if (line || axisMatch) {
      return {
        kind: "reflect",
        starts: labelledPairs,
        // Store the coordinate held constant by the mirror-line equation.
        // x-axis means y=0; y-axis means x=0.
        axis: (line?.[1]
          ? line[1].toLowerCase()
          : axisMatch?.[1]?.toLowerCase() === "x"
            ? "y"
            : "x") as "x" | "y",
        axisValue: line ? Number(line[2]) : 0,
      };
    }
  }

  const horizontal = signedMovement(t, "right", "left");
  const vertical = signedMovement(t, "up", "down");
  if (horizontal !== null && vertical !== null) {
    return {
      kind: "position",
      point: { x: horizontal, y: vertical, label },
    };
  }

  return null;
}

export function coordinateQuadrant(x: number, y: number): string {
  if (x === 0 && y === 0) return "the origin";
  if (x === 0) return "the y-axis";
  if (y === 0) return "the x-axis";
  if (x > 0 && y > 0) return "Quadrant I";
  if (x < 0 && y > 0) return "Quadrant II";
  if (x < 0 && y < 0) return "Quadrant III";
  return "Quadrant IV";
}

function coordinateGraph(
  points: { x: number; y: number; label: string }[],
  segments: CoordinateGraphBlock["segments"] = [],
): CoordinateGraphBlock {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const padding = 1;
  return {
    type: "coordinate_graph",
    xRange: [Math.min(0, ...xs) - padding, Math.max(0, ...xs) + padding],
    yRange: [Math.min(0, ...ys) - padding, Math.max(0, ...ys) + padding],
    plots: [],
    points: points.map((point) => ({
      point: { x: point.x, y: point.y },
      label: point.label,
    })),
    segments,
    grid: true,
    xLabel: "x",
    yLabel: "y",
  };
}

export function buildCoordinateProblem(problem: CoordinateProblem): MethodBuildResult {
  if (problem.kind === "select_quadrant") {
    const target = `Quadrant ${problem.quadrant}`;
    const selected = problem.points.find(
      (point) => coordinateQuadrant(point.x, point.y) === target,
    );
    if (!selected) throw new Error(`No coordinate lies in ${target}`);
    const answer = `(${selected.x},${selected.y})`;
    const teachingSteps: TeachingStep[] = [
      {
        title: "Recall the quadrant signs",
        explanation: `${target} has ${problem.quadrant === "I" || problem.quadrant === "IV" ? "positive" : "negative"} x and ${problem.quadrant === "I" || problem.quadrant === "II" ? "positive" : "negative"} y.`,
        why: "The signs identify the quadrant before you plot anything.",
        narration: `Recall the signs for ${target}.`,
        cellKeys: [], carryKeys: [], noteKeys: [],
      },
      {
        title: "Check each ordered pair",
        explanation: problem.points
          .map((point) => `(${point.x}, ${point.y}) is in ${coordinateQuadrant(point.x, point.y)}`)
          .join("; "),
        why: "Read x first and y second.",
        narration: `Check the signs in each ordered pair.`,
        cellKeys: [], carryKeys: [], noteKeys: [],
      },
      {
        title: "Choose the matching coordinate",
        explanation: `${answer} is in ${target}.`,
        why: "Its x and y signs match the target quadrant.",
        narration: `${answer} is the matching coordinate.`,
        cellKeys: [], carryKeys: [], noteKeys: [], showAnswer: true,
      },
    ];
    return {
      builderId: "coordinate_plot",
      block: coordinateGraph(
        problem.points.map((point) => ({
          ...point,
          label: `${point.label}(${point.x},${point.y})`,
        })),
      ),
      teachingSteps,
      captions: teachingSteps.map((step) => `${step.title}: ${step.explanation}`),
      answer,
      intro: `Match each coordinate's signs to ${target}.`,
    };
  }

  if (problem.kind === "quadrant") {
    const { x, y, label } = problem.point;
    const answer = coordinateQuadrant(x, y);
    const block = coordinateGraph([{ x, y, label: `${label}(${x},${y})` }]);
    const teachingSteps: TeachingStep[] = [
      {
        title: "Read the x-coordinate",
        explanation: `${x} is ${x < 0 ? "negative, so the point is left of the y-axis" : x > 0 ? "positive, so the point is right of the y-axis" : "zero, so the point is on the y-axis"}.`,
        why: "The first coordinate controls the horizontal position.",
        narration: `The x-coordinate is ${x}.`,
        cellKeys: [], carryKeys: [], noteKeys: [],
      },
      {
        title: "Read the y-coordinate",
        explanation: `${y} is ${y < 0 ? "negative, so the point is below the x-axis" : y > 0 ? "positive, so the point is above the x-axis" : "zero, so the point is on the x-axis"}.`,
        why: "The second coordinate controls the vertical position.",
        narration: `The y-coordinate is ${y}.`,
        cellKeys: [], carryKeys: [], noteKeys: [],
      },
      {
        title: "Name the region",
        explanation: `(${x}, ${y}) lies in ${answer}.`,
        why: "Match the signs of x and y to the four quadrants.",
        narration: `The point lies in ${answer}.`,
        cellKeys: [], carryKeys: [], noteKeys: [], showAnswer: true,
      },
    ];
    return {
      builderId: "coordinate_plot",
      block,
      teachingSteps,
      captions: teachingSteps.map((step) => `${step.title}: ${step.explanation}`),
      answer,
      intro: `Use the signs of (${x}, ${y}) to identify its quadrant.`,
    };
  }

  if (problem.kind === "position") {
    return buildCoordinatePlot([problem.point]);
  }

  if (problem.kind === "translation_vector") {
    const dx = problem.end.x - problem.start.x;
    const dy = problem.end.y - problem.start.y;
    const answer = `(${dx},${dy})`;
    const teachingSteps: TeachingStep[] = [
      {
        title: "Compare the x-coordinates",
        explanation: `${problem.end.x} − (${problem.start.x}) = ${dx}.`,
        why: "The horizontal change is the top number of the vector.",
        narration: `The horizontal change is ${dx}.`,
        cellKeys: [], carryKeys: [], noteKeys: [],
      },
      {
        title: "Compare the y-coordinates",
        explanation: `${problem.end.y} − (${problem.start.y}) = ${dy}.`,
        why: "The vertical change is the bottom number of the vector.",
        narration: `The vertical change is ${dy}.`,
        cellKeys: [], carryKeys: [], noteKeys: [],
      },
      {
        title: "Write the vector",
        explanation: `The translation vector is ${answer}.`,
        why: "Write horizontal change first, then vertical change.",
        narration: `The translation vector is ${dx}, ${dy}.`,
        cellKeys: [], carryKeys: [], noteKeys: [], showAnswer: true,
      },
    ];
    return {
      builderId: "coordinate_plot",
      block: coordinateGraph(
        [
          { ...problem.start, label: `Start (${problem.start.x},${problem.start.y})` },
          { ...problem.end, label: `End (${problem.end.x},${problem.end.y})` },
        ],
        [{ from: problem.start, to: problem.end, color: "#f59e0b", style: "dashed", label: "translation" }],
      ),
      teachingSteps,
      captions: teachingSteps.map((step) => `${step.title}: ${step.explanation}`),
      answer,
      intro: "Subtract the start coordinates from the end coordinates.",
    };
  }

  if (problem.kind === "translate") {
    const images = problem.starts.map((start) => ({
      x: start.x + problem.dx,
      y: start.y + problem.dy,
      label: `${start.label}′`,
      source: start,
    }));
    const answer = images.length === 1
      ? `(${images[0].x},${images[0].y})`
      : images.map((point) => `${point.label}=(${point.x},${point.y})`).join(", ");
    const block = coordinateGraph(
      [
        ...problem.starts.map((point) => ({
          ...point,
          label: `${point.label}(${point.x},${point.y})`,
        })),
        ...images.map((point) => ({
          x: point.x,
          y: point.y,
          label: `${point.label}(${point.x},${point.y})`,
        })),
      ],
      images.map((point) => ({
        from: point.source,
        to: { x: point.x, y: point.y },
        color: "#f59e0b",
        style: "dashed" as const,
        label: "translation",
      })),
    );
    const teachingSteps: TeachingStep[] = [
      {
        title: "Identify every starting vertex",
        explanation: problem.starts.map((point) => `${point.label}(${point.x}, ${point.y})`).join("; "),
        why: "A translation moves a point without turning or reflecting it.",
        narration: `Identify every starting vertex.`,
        cellKeys: [], carryKeys: [], noteKeys: [],
      },
      {
        title: "Apply the horizontal move",
        explanation: images.map((point) => `${point.source.label}: ${point.source.x} ${problem.dx < 0 ? "−" : "+"} ${Math.abs(problem.dx)} = ${point.x}`).join("; "),
        why: "The first vector number changes x.",
        narration: `Apply the horizontal move to every vertex.`,
        cellKeys: [], carryKeys: [], noteKeys: [],
      },
      {
        title: "Apply the vertical move",
        explanation: `${images.map((point) => `${point.source.label}: ${point.source.y} ${problem.dy < 0 ? "−" : "+"} ${Math.abs(problem.dy)} = ${point.y}`).join("; ")}. Final image: ${answer}.`,
        why: "The second vector number changes y.",
        narration: `Apply the vertical move and write every image coordinate.`,
        cellKeys: [], carryKeys: [], noteKeys: [], showAnswer: true,
      },
    ];
    return {
      builderId: "coordinate_plot", block, teachingSteps,
      captions: teachingSteps.map((step) => `${step.title}: ${step.explanation}`),
      answer,
      intro: `Add the translation vector to the point, x first and then y.`,
    };
  }

  const { starts, axis, axisValue } = problem;
  const images = starts.map((start) => ({
    x: axis === "x" ? 2 * axisValue - start.x : start.x,
    y: axis === "y" ? 2 * axisValue - start.y : start.y,
    label: `${start.label}′`,
    source: start,
  }));
  const answer = images.length === 1
    ? `(${images[0].x},${images[0].y})`
    : images.map((point) => `${point.label}=(${point.x},${point.y})`).join(", ");
  const unchanged = axis === "x" ? "y" : "x";
  const changed = axis;
  const teachingSteps: TeachingStep[] = [
    {
      title: "Find the mirror line",
      explanation: `Reflect in ${axis} = ${axisValue}.`,
      why: "The image must be the same perpendicular distance from the mirror line.",
      narration: `The mirror line is ${axis} equals ${axisValue}.`,
      cellKeys: [], carryKeys: [], noteKeys: [],
    },
    {
      title: `Keep ${unchanged} unchanged`,
      explanation: starts.map((point) => `${point.label}: ${unchanged} stays ${point[unchanged]}`).join("; "),
      why: `Moving perpendicular to this mirror line does not change ${unchanged}.`,
      narration: `Keep the ${unchanged}-coordinate the same.`,
      cellKeys: [], carryKeys: [], noteKeys: [],
    },
    {
      title: `Reflect the ${changed}-coordinate`,
      explanation: `The image coordinates are ${answer}.`,
      why: "The original point and image are equally far from the mirror line.",
      narration: `Write every reflected image coordinate.`,
      cellKeys: [], carryKeys: [], noteKeys: [], showAnswer: true,
    },
  ];
  const reflectionBlock = coordinateGraph(
    [
      ...starts.map((point) => ({ ...point, label: `${point.label}(${point.x},${point.y})` })),
      ...images.map((point) => ({ x: point.x, y: point.y, label: `${point.label}(${point.x},${point.y})` })),
    ],
    images.map((point) => ({
      from: point.source,
      to: { x: point.x, y: point.y },
      color: "#f59e0b",
      style: "dashed" as const,
      label: "reflection",
    })),
  );
  const mirrorSegment = axis === "x"
    ? {
        from: { x: axisValue, y: reflectionBlock.yRange[0] },
        to: { x: axisValue, y: reflectionBlock.yRange[1] },
        color: "#ef4444",
        style: "solid" as const,
        label: `x = ${axisValue}`,
      }
    : {
        from: { x: reflectionBlock.xRange[0], y: axisValue },
        to: { x: reflectionBlock.xRange[1], y: axisValue },
        color: "#ef4444",
        style: "solid" as const,
        label: `y = ${axisValue}`,
      };
  reflectionBlock.segments = [mirrorSegment, ...(reflectionBlock.segments || [])];
  return {
    builderId: "coordinate_plot",
    block: reflectionBlock,
    teachingSteps,
    captions: teachingSteps.map((step) => `${step.title}: ${step.explanation}`),
    answer,
    intro: `Reflect the point the same distance across ${axis} = ${axisValue}.`,
  };
}

export function buildCoordinatePlot(
  points: { x: number; y: number; label: string }[],
): MethodBuildResult {
  const block = coordinateGraph(
    points.map((point) => ({
      ...point,
      label: `${point.label}(${point.x},${point.y})`,
    })),
  );
  const teachingSteps: TeachingStep[] = [
    {
      title: "Read the x-coordinate",
      explanation: points.map((p) => `${p.label}: move ${Math.abs(p.x)} ${p.x < 0 ? "left" : "right"}`).join("; "),
      why: "The first coordinate is the horizontal movement from the origin.",
      narration: `Read the x-coordinate first.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Read the y-coordinate",
      explanation: points.map((p) => `${p.label}: move ${Math.abs(p.y)} ${p.y < 0 ? "down" : "up"}`).join("; "),
      why: "The second coordinate is the vertical movement.",
      narration: `Now read the y-coordinate.`,
      cellKeys: [], carryKeys: [], noteKeys: [],
    },
    {
      title: "Write the ordered pair",
      explanation: points.map((p) => `${p.label} = (${p.x}, ${p.y})`).join("; "),
      why: "Coordinates are always written in the order (x, y).",
      narration: `Write x first, then y.`,
      cellKeys: [], carryKeys: [], noteKeys: [], showAnswer: true,
    },
  ];
  return {
    builderId: "coordinate_plot",
    block,
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
    answer: points.map((p) => `(${p.x},${p.y})`).join(", "),
    intro: `Let's plot these coordinates on a grid.`,
  };
}

export function parseBarChart(
  text: string,
): { bars: { label: string; value: number }[] } | null {
  const t = normalizeMathText(text);
  if (!/\b(bar chart|bar graph|pictogram|frequency)\b/i.test(t)) return null;
  const bars: { label: string; value: number }[] = [];
  const re = /([A-Za-z][A-Za-z\s]{0,12}?)\s*[:=]\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    bars.push({ label: m[1].trim(), value: parseInt(m[2], 10) });
  }
  if (bars.length < 2) {
    // fallback demo-ish parse of "Red 3, Blue 5"
    const re2 = /([A-Za-z]+)\s+(\d+)/g;
    while ((m = re2.exec(t)) !== null) {
      bars.push({ label: m[1], value: parseInt(m[2], 10) });
    }
  }
  return bars.length >= 2 ? { bars: bars.slice(0, 8) } : null;
}

export function buildBarChart(
  bars: { label: string; value: number }[],
): MethodBuildResult {
  const chart: ChartBlock = {
    type: "chart",
    chartType: "bar",
    title: "Bar chart",
    xLabel: "Category",
    yLabel: "Frequency",
    bars: bars.map((b, i) => ({
      label: b.label,
      value: b.value,
      color: ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][i % 5],
    })),
  };
  const table: TableBlock = {
    type: "table",
    headers: ["Category", "Frequency"],
    rows: bars.map((b) => [b.label, String(b.value)]),
  };
  const total = bars.reduce((s, b) => s + b.value, 0);
  return {
    builderId: "bar_chart_stats",
    block: chart,
    extraBlocks: [table],
    teachingSteps: [
      {
        title: "Read the chart",
        explanation: `Total frequency = ${total}. Tallest bar is ${
          [...bars].sort((a, b) => b.value - a.value)[0].label
        }.`,
        narration: `Here's the bar chart from the data.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
        showAnswer: true,
      },
    ],
    captions: [`Total = ${total}`],
    answer: `total ${total}`,
    intro: `Let's show this data on a bar chart.`,
  };
}

export function parseUnitConversion(
  text: string,
): { value: number; from: string; to: string; factor: number } | null {
  const t = normalizeMathText(text);
  const m = t.match(
    /(\d+(?:\.\d+)?)\s*(km|m|cm|mm|kg|g|l|ml)\s*(?:to|into|=|in)\s*(km|m|cm|mm|kg|g|l|ml)/i,
  );
  if (!m) return null;
  const value = parseFloat(m[1]);
  const from = m[2].toLowerCase();
  const to = m[3].toLowerCase();
  const scale: Record<string, number> = {
    km: 1000,
    m: 1,
    cm: 0.01,
    mm: 0.001,
    kg: 1000,
    g: 1,
    l: 1000,
    ml: 1,
  };
  // Convert via base unit within family
  const length = new Set(["km", "m", "cm", "mm"]);
  const mass = new Set(["kg", "g"]);
  const vol = new Set(["l", "ml"]);
  const sameFamily =
    (length.has(from) && length.has(to)) ||
    (mass.has(from) && mass.has(to)) ||
    (vol.has(from) && vol.has(to));
  if (!sameFamily) return null;
  const factor = scale[from] / scale[to];
  return { value, from, to, factor };
}

export function buildUnitConversion(
  value: number,
  from: string,
  to: string,
  factor: number,
): MethodBuildResult {
  const result = value * factor;
  const multiply = factor >= 1;
  const steps: EquationStepBlock = {
    type: "equation_steps",
    steps: [
      {
        stepNumber: 1,
        operationLabel: multiply ? "Multiply" : "Divide",
        explanation: multiply
          ? `Going to a smaller unit: multiply by ${factor}.`
          : `Going to a larger unit: multiply by ${factor} (or divide by ${1 / factor}).`,
        latexBefore: `${value}\\,\\mathrm{${from}}`,
        latexAfter: `${value} \\times ${factor} = ${result}\\,\\mathrm{${to}}`,
        arrowDirection: "simplify",
      },
    ],
  };
  const table: TableBlock = {
    type: "table",
    headers: ["From", "Operation", "To"],
    rows: [[`${value} ${from}`, `× ${factor}`, `${result} ${to}`]],
  };
  return {
    builderId: "unit_conversion",
    block: table,
    extraBlocks: [steps],
    teachingSteps: [
      {
        title: "Convert",
        explanation: `${value} ${from} = ${result} ${to}`,
        why: multiply
          ? "Smaller units need a bigger number."
          : "Larger units need a smaller number.",
        narration: `${value} ${from} equals ${result} ${to}.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
        showAnswer: true,
      },
    ],
    captions: [`${value} ${from} = ${result} ${to}`],
    answer: `${result} ${to}`,
    intro: `Convert ${value} ${from} into ${to}.`,
  };
}

export function parseRatio(
  text: string,
): { parts: number[]; total?: number } | null {
  const t = normalizeMathText(text);
  if (!/\bratio\b|\bproportion\b|\bshare\b/i.test(t)) return null;
  const m = t.match(/(\d+)\s*:\s*(\d+)(?:\s*:\s*(\d+))?/);
  if (!m) return null;
  const parts = [parseInt(m[1], 10), parseInt(m[2], 10)];
  if (m[3]) parts.push(parseInt(m[3], 10));
  const totalM = t.match(/(?:total|altogether|shared?)\s*(\d+)/i);
  return { parts, total: totalM ? parseInt(totalM[1], 10) : undefined };
}

export function buildRatioTable(
  parts: number[],
  total?: number,
): MethodBuildResult {
  const sum = parts.reduce((a, b) => a + b, 0);
  const rows: string[][] = [
    ["Parts", ...parts.map(String), `Total ${sum}`],
  ];
  let shares: number[] | undefined;
  if (total != null && sum > 0) {
    const unit = total / sum;
    shares = parts.map((p) => p * unit);
    rows.push(["Share", ...shares.map(String), String(total)]);
  }
  const table: TableBlock = {
    type: "table",
    headers: ["", ...parts.map((_, i) => `Part ${i + 1}`), "Total"],
    rows,
    caption: `Ratio ${parts.join(":")}`,
  };
  return {
    builderId: "ratio_table",
    block: table,
    teachingSteps: [
      {
        title: "Ratio parts",
        explanation:
          total != null && shares
            ? `Unit = ${total}/${sum}. Shares: ${shares.join(", ")}.`
            : `The ratio has ${sum} parts altogether.`,
        why: "Each 'part' is the same size.",
        narration: `Let's share in the ratio ${parts.join(" to ")}.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
        showAnswer: true,
      },
    ],
    captions: [`Ratio ${parts.join(":")}`],
    answer:
      shares != null ? shares.join(", ") : parts.join(":"),
    intro: `Share in the ratio ${parts.join(":")}.`,
  };
}

export function parseFunctionMachine(
  text: string,
): { input: number; ops: { op: string; n: number }[] } | null {
  const t = normalizeMathText(text);
  if (!/\b(function machine|input|output|then)\b/i.test(t)) return null;
  const inputM = t.match(/input\s*(\d+)/i) || t.match(/\b(\d+)\s*(?:→|->|then)/);
  if (!inputM) return null;
  const input = parseInt(inputM[1], 10);
  const ops: { op: string; n: number }[] = [];
  const re = /([++\-−×x*÷/]|plus|minus|times|divide(?:d)?\s+by)\s*(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const raw = m[1].toLowerCase();
    let op = "+";
    if (raw.includes("minus") || raw === "-" || raw === "−") op = "-";
    else if (raw.includes("times") || raw === "×" || raw === "x" || raw === "*")
      op = "×";
    else if (raw.includes("div") || raw === "÷" || raw === "/") op = "÷";
    else op = "+";
    ops.push({ op, n: parseInt(m[2], 10) });
  }
  if (ops.length === 0) return null;
  return { input, ops };
}

export function buildFunctionMachine(
  input: number,
  ops: { op: string; n: number }[],
): MethodBuildResult {
  let current = input;
  const rows: string[][] = [["Input", String(input)]];
  const steps: EquationStepBlock["steps"] = [];
  ops.forEach((o, i) => {
    const before = current;
    if (o.op === "+") current += o.n;
    else if (o.op === "-") current -= o.n;
    else if (o.op === "×") current *= o.n;
    else if (o.op === "÷") current /= o.n;
    rows.push([`${o.op} ${o.n}`, String(current)]);
    steps.push({
      stepNumber: i + 1,
      operationLabel: `${o.op} ${o.n}`,
      explanation: `${before} ${o.op} ${o.n} = ${current}`,
      latexBefore: String(before),
      latexAfter: String(current),
      arrowDirection: "simplify",
    });
  });
  rows.push(["Output", String(current)]);
  const table: TableBlock = {
    type: "table",
    headers: ["Stage", "Value"],
    rows,
    caption: "Function machine",
  };
  return {
    builderId: "function_machine",
    block: table,
    extraBlocks: [{ type: "equation_steps", steps }],
    teachingSteps: [
      {
        title: "Output",
        explanation: String(current),
        why: "Do each machine step in order.",
        narration: `The output is ${current}.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
        showAnswer: true,
      },
    ],
    captions: [`Output = ${current}`],
    answer: String(current),
    intro: `Follow the function machine from input ${input}.`,
  };
}

// silence unused import warning if any
void normalizeMathText;
