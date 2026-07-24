/**
 * Rectangle / cuboid measurement builders for perimeter, area, volume.
 */

import type {
  CuboidArrayBlock,
  EquationStepBlock,
  LabeledShapeBlock,
} from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export function parseRectMeasure(
  text: string,
):
  | { kind: "perimeter" | "area"; length: number; width: number }
  | { kind: "volume"; l: number; w: number; h: number }
  | null {
  const t = normalizeMathText(text);
  const vol = t.match(
    /(?:volume|cuboid).*?(\d+)\s*(?:cm|m|mm)?\s*[×x*by,\s]+(\d+)\s*(?:cm|m|mm)?\s*[×x*by,\s]+(\d+)/i,
  ) || t.match(/(\d+)\s*[×x*]\s*(\d+)\s*[×x*]\s*(\d+).*volume/i);
  if (vol || /\b(?:volume|cuboid)\b/i.test(t)) {
    if (vol) {
      return {
        kind: "volume",
        l: parseInt(vol[1], 10),
        w: parseInt(vol[2], 10),
        h: parseInt(vol[3], 10),
      };
    }
    const cubeCount = t.match(
      /\b(\d+)\s+(?:(?:equal|small|unit)\s+)*cubes?\b/i,
    );
    if (cubeCount) {
      const [l, w, h] = cuboidDimensionsForUnitCubes(
        parseInt(cubeCount[1], 10),
      );
      return { kind: "volume", l, w, h };
    }
  }
  const dims = t.match(
    /(\d+)\s*(?:cm|m|mm)?\s*(?:by|[×x*])\s*(\d+)\s*(?:cm|m|mm)?/i,
  );
  if (!dims) return null;
  const length = parseInt(dims[1], 10);
  const width = parseInt(dims[2], 10);
  if (/\bperimeter\b/i.test(t)) return { kind: "perimeter", length, width };
  if (/\barea\b/i.test(t)) return { kind: "area", length, width };
  if (/\bperimeter\b|\barea\b/i.test(t)) {
    return { kind: /\bperimeter\b/i.test(t) ? "perimeter" : "area", length, width };
  }
  return null;
}

/** Choose a compact whole-number cuboid for a stated number of unit cubes. */
export function cuboidDimensionsForUnitCubes(
  count: number,
): [number, number, number] {
  const safeCount = Math.max(1, Math.round(count));
  let best: [number, number, number] = [safeCount, 1, 1];
  let bestSpread = safeCount - 1;

  for (let height = 1; height <= Math.cbrt(safeCount); height++) {
    if (safeCount % height !== 0) continue;
    const remaining = safeCount / height;
    for (let width = height; width <= Math.sqrt(remaining); width++) {
      if (remaining % width !== 0) continue;
      const length = remaining / width;
      const candidate: [number, number, number] = [length, width, height];
      const spread = length - height;
      if (spread < bestSpread) {
        best = candidate;
        bestSpread = spread;
      }
    }
  }
  return best;
}

export function buildRectPerimeterArea(
  kind: "perimeter" | "area",
  length: number,
  width: number,
): MethodBuildResult {
  const shape: LabeledShapeBlock = {
    type: "labeled_shape",
    shape: "rectangle",
    vertices: [
      { label: "A" },
      { label: "B" },
      { label: "C" },
      { label: "D" },
    ],
    sides: [
      { from: "A", to: "B", label: `${length}` },
      { from: "B", to: "C", label: `${width}` },
      { from: "C", to: "D", label: `${length}` },
      { from: "D", to: "A", label: `${width}` },
    ],
  };

  const perimeter = 2 * (length + width);
  const area = length * width;
  const answer = kind === "perimeter" ? String(perimeter) : String(area);

  const steps: EquationStepBlock = {
    type: "equation_steps",
    steps:
      kind === "perimeter"
        ? [
            {
              stepNumber: 1,
              operationLabel: "Perimeter formula",
              explanation: `Perimeter of a rectangle = 2 × (length + width).`,
              rule: "Perimeter of a rectangle",
              latexBefore: `P = 2(l + w)`,
              latexAfter: `P = 2(${length} + ${width})`,
              arrowDirection: "simplify",
            },
            {
              stepNumber: 2,
              operationLabel: "Calculate",
              explanation: `2 × (${length} + ${width}) = 2 × ${length + width} = ${perimeter}.`,
              latexBefore: `2(${length} + ${width})`,
              latexAfter: String(perimeter),
              arrowDirection: "simplify",
            },
          ]
        : [
            {
              stepNumber: 1,
              operationLabel: "Area formula",
              explanation: `Area of a rectangle = length × width.`,
              rule: "Area of a rectangle",
              latexBefore: `A = l \\times w`,
              latexAfter: `A = ${length} \\times ${width}`,
              arrowDirection: "simplify",
            },
            {
              stepNumber: 2,
              operationLabel: "Calculate",
              explanation: `${length} × ${width} = ${area}.`,
              latexBefore: `${length} \\times ${width}`,
              latexAfter: String(area),
              arrowDirection: "simplify",
            },
          ],
  };

  const teachingSteps: TeachingStep[] = [
    {
      title: kind === "perimeter" ? "Use P = 2(l+w)" : "Use A = l×w",
      explanation:
        kind === "perimeter"
          ? `2 × (${length} + ${width}) = ${perimeter}`
          : `${length} × ${width} = ${area}`,
      why:
        kind === "perimeter"
          ? "Add all four sides — or double length+width."
          : "Area counts the unit squares that fill the rectangle.",
      narration: `The ${kind} is ${answer}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    },
  ];

  return {
    builderId: "rect_perimeter_area",
    block: shape,
    extraBlocks: [steps],
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
    answer,
    intro: `Here's a ${length} by ${width} rectangle — let's find the ${kind}.`,
  };
}

export function buildCuboidVolume(l: number, w: number, h: number): MethodBuildResult {
  const volume = l * w * h;
  const layerSize = l * w;
  const shape: CuboidArrayBlock = {
    type: "cuboid_array",
    length: l,
    width: w,
    height: h,
    unit: "unit",
    caption: `${h} equal layers of ${layerSize} unit cubes`,
  };
  const steps: EquationStepBlock = {
    type: "equation_steps",
    steps: [
      {
        stepNumber: 1,
        operationLabel: "Count one layer",
        explanation: `Each layer has ${w} rows of ${l} cubes, so ${l} × ${w} = ${layerSize}.`,
        rule: "Cubes in one layer",
        why: "Rows and columns count every cube in the layer once.",
        latexBefore: `${l} \\times ${w}`,
        latexAfter: `${l} \\times ${w} = ${layerSize}`,
        arrowDirection: "simplify",
      },
      {
        stepNumber: 2,
        operationLabel: "Count all layers",
        explanation: `There are ${h} equal layers, so ${layerSize} × ${h} = ${volume}.`,
        rule: "Volume of a cuboid",
        why: "Multiplying by the height counts the same number of cubes in every layer.",
        latexBefore: `${layerSize} \\times ${h}`,
        latexAfter: `${layerSize} \\times ${h} = ${volume}`,
        arrowDirection: "simplify",
        selfCheck: `${l} \\times ${w} \\times ${h} = ${volume}`,
      },
    ],
  };
  const teachingSteps: TeachingStep[] = [
    {
      title: "Count one row",
      explanation: `A row is ${l} cubes long.`,
      why: "Starting with one row makes the first layer easy to see.",
      narration: `Start with one row of ${l} cubes.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Count one layer",
      explanation: `${w} rows of ${l} cubes make ${l} × ${w} = ${layerSize} cubes.`,
      why: "Length times width counts every unit cube in one flat layer.",
      narration: `One layer has ${l} times ${w}, which is ${layerSize} cubes.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Count the layers",
      explanation: `The cuboid is ${h} cubes high, so it has ${h} equal layers.`,
      why: "The height tells us how many times the base layer is stacked.",
      narration: `The height is ${h}, so there are ${h} equal layers.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Find the volume",
      explanation: `${layerSize} cubes in each layer × ${h} layers = ${volume} cubic units.`,
      why: "Volume is the total number of unit cubes that fill the solid.",
      narration: `${layerSize} times ${h} is ${volume}, so the volume is ${volume} cubic units.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    },
  ];
  return {
    builderId: "cuboid_volume",
    block: shape,
    extraBlocks: [steps],
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
    answer: String(volume),
    intro: `See ${h} equal layers. Each layer is ${l} cubes long and ${w} cubes deep.`,
    conclusion: `The cuboid contains ${volume} unit cubes, so its volume is ${volume} cubic units.`,
  };
}
