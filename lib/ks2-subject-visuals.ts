/**
 * Subject-aware visual safety for KS2 lessons.
 *
 * Geometry primitives are not generic illustration blocks. In particular,
 * `labeled_shape` defaults to a polygon when details are missing, so it must
 * never be used as a science/English/computing/Arabic picture placeholder.
 */

import { isBlockFit } from "@/lib/ks2-visual-fitness";
import type { ForceDiagramBlock, VisualBlock } from "@/types/whiteboard";

export interface KS2SubjectVisualContext {
  subject: string;
  topic?: string;
  skill?: string;
  question?: string;
  answer?: string;
}

const FORCE_WORDS =
  /\b(force|gravity|weight|friction|air resistance|water resistance|upthrust|buoyancy|push|pull|magnet(?:ic)?|tension|support force)\b/i;

const SCIENCE_MATHS_ONLY = new Set<VisualBlock["type"]>([
  "equation_steps",
  "coordinate_graph",
  "number_line",
  "fraction_bar",
  "fraction_grid",
  "fraction_wall",
  "bar_model",
  "hundred_square",
  "area_model",
  "column_method",
]);

function contextText(context: KS2SubjectVisualContext): string {
  return [context.topic, context.skill, context.question, context.answer]
    .filter(Boolean)
    .join(" ");
}

export function isForceTopic(context: KS2SubjectVisualContext): boolean {
  return FORCE_WORDS.test(contextText(context));
}

function objectFor(text: string): { label: string; emoji: string } {
  const choices: Array<[RegExp, string, string]> = [
    [/\bapple\b/i, "apple", "🍎"],
    [/\b(?:football|ball)\b/i, "ball", "⚽"],
    [/\bparachut(?:e|ist)\b/i, "parachutist", "🪂"],
    [/\b(?:car|vehicle)\b/i, "car", "🚗"],
    [/\b(?:bike|bicycle|cyclist)\b/i, "bicycle", "🚲"],
    [/\b(?:boat|ship)\b/i, "boat", "🚤"],
    [/\bmagnet\b/i, "metal object (magnet on right)", "🔩"],
    [/\b(?:child|person|runner)\b/i, "person", "🧍"],
    [/\b(?:pencil|pen)\b/i, "pencil", "✏️"],
  ];
  for (const [pattern, label, emoji] of choices) {
    if (pattern.test(text)) return { label, emoji };
  }
  return { label: "object", emoji: "📦" };
}

/** Build a deterministic, scientifically relevant force diagram when possible. */
export function buildForceDiagram(
  context: KS2SubjectVisualContext,
): ForceDiagramBlock | null {
  const text = contextText(context);
  if (!FORCE_WORDS.test(text)) return null;

  const object = objectFor(text);
  const forces: ForceDiagramBlock["forces"] = [];
  const add = (
    label: string,
    direction: ForceDiagramBlock["forces"][number]["direction"],
    detail?: string,
  ) => {
    if (!forces.some((force) => force.label === label)) {
      forces.push({ label, direction, detail });
    }
  };

  if (/\bgravity|weight|drop(?:ped|s|ping)?|fall(?:s|ing)?\b/i.test(text)) {
    add("gravity", "down", "towards Earth's centre");
  }
  if (/\bair resistance|parachut/i.test(text)) {
    if (/\bfall|drop|parachut|downward/i.test(text)) {
      add("air resistance", "up", "opposes the fall");
    } else if (/\bcar|bike|bicycle|cyclist|forward|moving/i.test(text)) {
      add("air resistance", "left", "opposes forward movement");
    }
  }
  if (/\bfriction\b/i.test(text)) {
    add("friction", "left", "opposes movement to the right");
  }
  if (/\bwater resistance\b/i.test(text)) {
    add(
      "water resistance",
      /\bsink|fall|downward/i.test(text) ? "up" : "left",
      /\bsink|fall|downward/i.test(text)
        ? "opposes downward movement"
        : "opposes movement through water to the right",
    );
  }
  if (/\bupthrust|buoyancy|float(?:s|ing)?\b/i.test(text)) {
    add("upthrust", "up", "from the liquid");
  }
  if (/\bmagnet(?:ic)?\b/i.test(text)) {
    add("magnetic force", "right", "towards the magnet");
  }
  if (/\btension\b/i.test(text)) {
    add("tension", "up", "from the rope or string");
  }
  if (/\bsupport force|\brest(?:s|ing)? on|\bon (?:a )?(?:table|surface|ground)\b/i.test(text)) {
    add("support force", "up", "from the surface");
  }

  // A generic mention of "forces" is not enough to invent arrow directions.
  if (forces.length === 0) return null;

  return {
    type: "force_diagram",
    objectLabel: object.label,
    objectEmoji: object.emoji,
    forces,
    caption: `Forces acting on the ${object.label}`,
    groundLabel: forces.some((force) => force.label === "gravity")
      ? "Earth — gravity acts towards its centre"
      : undefined,
  };
}

/** Explain a semantic mismatch, or return null when the block is suitable. */
export function subjectVisualMismatch(
  block: VisualBlock,
  context: KS2SubjectVisualContext,
): string | null {
  const subject = context.subject.toLowerCase();
  const isMaths = subject === "maths" || subject.includes("math");
  const isScience = subject === "science" || subject.includes("science");
  if (!isMaths && block.type === "labeled_shape") {
    return "Geometry labeled_shape blocks cannot be used as generic subject illustrations.";
  }
  if (block.type === "force_diagram") {
    if (!isScience) {
      return "Force diagrams are only suitable for science force topics.";
    }
    if (!isForceTopic(context)) {
      return "Force diagram does not match this science topic.";
    }
    const expected = buildForceDiagram(context);
    if (!expected) {
      return "Force diagram context is too vague to verify its arrows safely.";
    }
    const normal = (value: string) => value.toLowerCase().replace(/[^a-z]+/g, " ").trim();
    if (
      expected.objectLabel !== "object" &&
      !normal(block.objectLabel).includes(normal(expected.objectLabel))
    ) {
      return `Force diagram object does not match the ${expected.objectLabel} in the question.`;
    }
    const arrowsMatch = expected.forces.every((expectedForce) =>
      block.forces.some(
        (force) =>
          normal(force.label).includes(normal(expectedForce.label)) &&
          force.direction === expectedForce.direction,
      ),
    );
    if (!arrowsMatch) {
      return "Force diagram labels or arrow directions do not match the worked question.";
    }
  }
  if (isScience && SCIENCE_MATHS_ONLY.has(block.type)) {
    return `Maths visual ${block.type} is not a suitable science illustration.`;
  }
  return null;
}

/** Remove misleading blocks. Omission is safer than an unrelated diagram. */
export function sanitizeSubjectVisuals(
  blocks: VisualBlock[],
  context: KS2SubjectVisualContext,
): VisualBlock[] {
  if (!Array.isArray(blocks)) return [];
  const question = context.question || context.topic || "";
  return blocks.filter(
    (block) =>
      !subjectVisualMismatch(block, context) && isBlockFit(block, question),
  );
}

/** Add a deterministic force diagram when a force lesson has no valid one. */
export function ensureRelevantSubjectVisuals(
  blocks: VisualBlock[],
  context: KS2SubjectVisualContext,
): VisualBlock[] {
  const safe = sanitizeSubjectVisuals(blocks, context);
  if (
    /science/i.test(context.subject) &&
    isForceTopic(context) &&
    !safe.some((block) => block.type === "force_diagram")
  ) {
    const forceDiagram = buildForceDiagram(context);
    if (forceDiagram) return [forceDiagram, ...safe];
  }
  return safe;
}
