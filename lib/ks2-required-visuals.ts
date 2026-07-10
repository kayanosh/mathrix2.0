/**
 * KS2 Maths topic → required whiteboard block types.
 * Used by /api/chat (level KS2) and /api/ks2-lesson for maths lessons.
 */

import type { VisualRequirement } from "@/lib/prompts/required-visuals";

interface KS2VisualRule {
  keywords: RegExp;
  topic: string;
  blocks: string[];
}

const KS2_VISUAL_RULES: KS2VisualRule[] = [
  {
    keywords:
      /\b(column addition|add.*digit|addition.*column|more than 4 digits.*add)\b/i,
    topic: "Column Addition",
    blocks: ["column_method"],
  },
  {
    keywords:
      /\b(column subtraction|subtract.*digit|subtraction.*column|more than 4 digits.*subtract)\b/i,
    topic: "Column Subtraction",
    blocks: ["column_method"],
  },
  {
    keywords:
      /\b(long multiplication|column multiplication|multiply.*digit|2.?digit.*2.?digit|3.?digit.*2.?digit|4.?digit.*\d.?digit)\b|\d\s*[×x*]\s*\d/i,
    topic: "Column Multiplication",
    blocks: ["column_method"],
  },
  {
    keywords:
      /\b(long division|bus stop|divide.*digit|short division|÷)\b/i,
    topic: "Long Division",
    blocks: ["column_method"],
  },
  {
    keywords:
      /\b(fraction.*number line|number line.*fraction|compare fraction|equivalent fraction|fraction.*between)\b/i,
    topic: "Fractions on a Number Line",
    blocks: ["number_line"],
  },
  {
    keywords:
      /\b(area|perimeter|shape|angle|triangle|rectangle|polygon|symmetry|coordinates)\b/i,
    topic: "Shapes and Measures",
    blocks: ["labeled_shape"],
  },
  {
    keywords:
      /\b(times table|factor|multiple|prime|square number|pattern)\b/i,
    topic: "Number Patterns",
    blocks: ["table"],
  },
  {
    keywords:
      /\b(add|subtract|multiply|divide|calculation|arithmetic)\b/i,
    topic: "Arithmetic",
    blocks: ["column_method"],
  },
];

function collectSearchText(
  question: string,
  topic?: string,
  subtopics?: string[]
): string {
  const parts = [question, topic, ...(subtopics || [])].filter(Boolean);
  return parts.join(" ");
}

/**
 * Detect mandatory visual blocks for KS2 Maths from question + topic context.
 */
export function detectKS2RequiredVisuals(
  question: string,
  topic?: string,
  subtopics?: string[]
): VisualRequirement[] {
  const text = collectSearchText(question, topic, subtopics);
  const requirements: VisualRequirement[] = [];
  const seen = new Set<string>();

  for (const rule of KS2_VISUAL_RULES) {
    if (rule.keywords.test(text) && !seen.has(rule.topic)) {
      seen.add(rule.topic);
      requirements.push({
        description: `KS2 topic "${rule.topic}" requires: ${rule.blocks.join(", ")}`,
        requiredBlocks: rule.blocks,
        matchedTopic: rule.topic,
      });
    }
  }

  return requirements;
}

/** Merge KS2 and general visual requirements without duplicate topics. */
export function mergeVisualRequirements(
  base: VisualRequirement[],
  extra: VisualRequirement[]
): VisualRequirement[] {
  const seen = new Set(base.map((r) => r.matchedTopic));
  const merged = [...base];
  for (const r of extra) {
    if (!seen.has(r.matchedTopic)) {
      seen.add(r.matchedTopic);
      merged.push(r);
    }
  }
  return merged;
}

/** Flat de-duplicated block type list for validateResponse. */
export function getKS2RequiredBlockTypes(requirements: VisualRequirement[]): string[] {
  const set = new Set<string>();
  for (const r of requirements) {
    for (const b of r.requiredBlocks) set.add(b);
  }
  return [...set];
}

/** Prompt fragment listing mandatory visuals for ks2-lesson generation. */
export function ks2LessonVisualsPrompt(
  topic: string,
  subtopics: string[]
): string {
  const reqs = detectKS2RequiredVisuals("", topic, subtopics);
  if (reqs.length === 0) {
    return `For the worked example, include at least one visual block (column_method for arithmetic, number_line for fractions, labeled_shape for geometry).`;
  }
  const lines = reqs
    .map((r) => `• ${r.matchedTopic}: MUST use block type(s) → ${r.requiredBlocks.join(", ")}`)
    .join("\n");
  return `MANDATORY VISUALS for this topic:\n${lines}\nThe workedExample.whiteboard.blocks array MUST include these block types.`;
}

/** Compact whiteboard schema for KS2 lesson generation (maths worked examples). */
export const KS2_LESSON_VISUAL_SCHEMA = `
workedExample MUST include a "whiteboard" object:
{
  "intro": "one friendly sentence before showing the method",
  "blocks": [ at least one VisualBlock ],
  "conclusion": "one sentence stating the answer clearly"
}

Allowed block types for KS2: column_method, number_line, labeled_shape, table, text.
• Arithmetic (add/subtract/multiply/divide) → column_method with method: column_addition | column_subtraction | column_multiplication | long_division
• Fractions on a line → number_line
• Shapes/area/perimeter → labeled_shape
• Facts/patterns → table
• Short hints between visuals → text

column_method example for 23 × 45:
{
  "type": "column_method",
  "method": "column_multiplication",
  "rows": [" 23", "×45", "115", "920", "1035"],
  "carries": [{"row": 0, "col": 1, "digit": "1"}],
  "separatorAfterRows": [1, 3],
  "question": "23 × 45",
  "answer": "1035"
}

workedExample.steps[] must be SHORT captions describing what the diagram shows (2-4 steps). Do NOT describe the full calculation in words without the whiteboard diagram.
`;
