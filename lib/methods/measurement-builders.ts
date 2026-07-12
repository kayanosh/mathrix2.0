/**
 * Rectangle / cuboid measurement builders for perimeter, area, volume.
 */

import type { EquationStepBlock, LabeledShapeBlock } from "@/types/whiteboard";
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
  if (vol || /\bvolume\b/i.test(t)) {
    if (vol) {
      return {
        kind: "volume",
        l: parseInt(vol[1], 10),
        w: parseInt(vol[2], 10),
        h: parseInt(vol[3], 10),
      };
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
  const shape: LabeledShapeBlock = {
    type: "labeled_shape",
    shape: "rectangle",
    vertices: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }],
    sides: [
      { from: "A", to: "B", label: `${l}` },
      { from: "B", to: "C", label: `${w}` },
    ],
  };
  // Note: true 3D cuboid isn't in shape enum — use labeled rectangle footprint + height in steps
  const steps: EquationStepBlock = {
    type: "equation_steps",
    steps: [
      {
        stepNumber: 1,
        operationLabel: "Volume formula",
        explanation: `Volume of a cuboid = length × width × height.`,
        rule: "Volume of a cuboid",
        latexBefore: `V = l \\times w \\times h`,
        latexAfter: `V = ${l} \\times ${w} \\times ${h}`,
        arrowDirection: "simplify",
      },
      {
        stepNumber: 2,
        operationLabel: "Calculate",
        explanation: `${l} × ${w} × ${h} = ${volume}.`,
        latexBefore: `${l} \\times ${w} \\times ${h}`,
        latexAfter: String(volume),
        arrowDirection: "simplify",
      },
    ],
  };
  const teachingSteps: TeachingStep[] = [
    {
      title: "V = l × w × h",
      explanation: `${l} × ${w} × ${h} = ${volume}`,
      why: "Volume counts the unit cubes that fill the cuboid.",
      narration: `The volume is ${volume} cubic units.`,
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
    intro: `Cuboid ${l} × ${w} × ${h} — find the volume.`,
  };
}
