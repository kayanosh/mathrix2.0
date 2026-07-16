import type {
  LabeledShapeBlock,
  WhiteboardResponse,
} from "@/types/whiteboard";

export interface LessonQualityResult {
  ok: boolean;
  errors: string[];
}

const LATEX_FIELDS = new Set([
  "latex",
  "latexBefore",
  "latexAfter",
  "answerLatex",
  "equation",
  "fn",
]);

/** Remove formatting tokens that belong to Markdown, not the whiteboard UI. */
export function cleanLessonDisplayText(value: string): string {
  return value
    .replace(/```(?:json)?/gi, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();
}

function cleanDisplayValue(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    return LATEX_FIELDS.has(key) ? value : cleanLessonDisplayText(value);
  }
  if (Array.isArray(value)) return value.map((item) => cleanDisplayValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        cleanDisplayValue(childValue, childKey),
      ]),
    );
  }
  return value;
}

/** Normalise only presentation text; mathematical data and LaTeX stay unchanged. */
export function normalizeLessonForDisplay(
  lesson: WhiteboardResponse,
): WhiteboardResponse {
  return cleanDisplayValue(lesson) as WhiteboardResponse;
}

/** Defence-in-depth guard used by both lesson validation and the text renderer. */
export function looksLikeInternalPayload(text: string): boolean {
  const trimmed = text.trim();
  return (
    /```(?:json)?/i.test(trimmed) ||
    (/^[{[]/.test(trimmed) && /"(?:intro|blocks|conclusion|type)"\s*:/.test(trimmed))
  );
}

function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(allStrings);
  }
  return [];
}

function validateTriangle(
  block: LabeledShapeBlock,
  topic: string,
): string[] {
  const errors: string[] = [];
  const vertices = block.vertices?.map((vertex) => vertex.label) ?? [];
  if (vertices.length !== 3 || new Set(vertices).size !== 3) {
    errors.push("Geometry diagram must have exactly three distinct labelled vertices.");
  }

  for (const side of block.sides ?? []) {
    if (!vertices.includes(side.from) || !vertices.includes(side.to)) {
      errors.push(
        `Geometry side ${side.from}${side.to} refers to a vertex that is not on the triangle.`,
      );
    }
  }

  const needsRightAngle = /pythag|trig|soh\s*cah\s*toa/i.test(topic);
  if (needsRightAngle) {
    const rightAngle = block.angles?.find(
      (angle) => angle.isRightAngle || Math.abs(angle.degrees - 90) < 0.01,
    );
    if (!rightAngle || !vertices.includes(rightAngle.vertex)) {
      errors.push("This topic requires an explicit 90° marker at a labelled vertex.");
    }
    if ((block.sides?.length ?? 0) < 3) {
      errors.push("The right-angled triangle must label all three sides.");
    }
    if (/pythag/i.test(topic) && rightAngle && vertices.includes(rightAngle.vertex)) {
      const opposite = vertices.filter((vertex) => vertex !== rightAngle.vertex);
      const hasHypotenuse = block.sides?.some(
        (side) =>
          opposite.includes(side.from) &&
          opposite.includes(side.to) &&
          /hypotenuse|hyp|c\b/i.test(side.label),
      );
      if (!hasHypotenuse) {
        errors.push(
          "The side opposite the right angle must be identified as the hypotenuse.",
        );
      }
    }
  }

  return errors;
}

/** Topic-aware checks that reject pupil-facing payload leaks and misleading diagrams. */
export function validateGcseLessonQuality(
  lesson: WhiteboardResponse,
  topic: string,
): LessonQualityResult {
  const errors: string[] = [];
  const displayStrings = allStrings(lesson);
  if (displayStrings.some(looksLikeInternalPayload)) {
    errors.push("Internal JSON or a fenced payload appears in pupil-facing lesson text.");
  }

  const textBlocks = lesson.blocks.filter((block) => block.type === "text");
  for (const block of textBlocks) {
    if (block.content.trim().length < 12) {
      errors.push(`${block.section || "Text"} section is too short to teach the idea clearly.`);
    }
  }

  const geometryTopic = /pythag|trig|angle|polygon|circle|geometry|area|perimeter/i.test(topic);
  if (geometryTopic) {
    const shapes = lesson.blocks.filter(
      (block): block is LabeledShapeBlock => block.type === "labeled_shape",
    );
    if (shapes.length === 0) {
      errors.push("This geometry lesson needs a topic-relevant labelled diagram.");
    }
    for (const shape of shapes) {
      if (shape.shape === "triangle") errors.push(...validateTriangle(shape, topic));
      if (shape.shape === "circle") {
        const circle = shape.circle;
        const hasMeaningfulFeature =
          !!circle?.showRadius ||
          !!circle?.showDiameter ||
          !!circle?.chords?.length ||
          !!circle?.tangentPoints?.length ||
          !!circle?.sectors?.length ||
          !!shape.angles?.length;
        if (!hasMeaningfulFeature) {
          errors.push("Circle diagram is a generic placeholder with no relevant construction or labels.");
        }
      }
    }
  }

  if (/pythag/i.test(topic)) {
    const formulaShown = lesson.blocks.some(
      (block) =>
        block.type === "equation_steps" &&
        block.steps.some((step) => {
          const formula = `${step.latexBefore} ${step.latexAfter}`
            .replace(/\\/g, "")
            .replace(/[{}\s]/g, "")
            .toLowerCase();
          return (
            formula.includes("a^2+b^2=c^2") ||
            formula.includes("c^2=a^2+b^2")
          );
        }),
    );
    if (!formulaShown) {
      errors.push("Pythagoras lesson must explicitly show a² + b² = c² in equation steps.");
    }
  }

  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}
