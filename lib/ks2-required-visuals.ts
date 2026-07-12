/**
 * KS2 Maths topic → required whiteboard block types.
 * Thin lookup over the pedagogy registry (see lib/ks2-pedagogy/registry.ts).
 */

import type { VisualRequirement } from "@/lib/prompts/required-visuals";
import {
  lookupPedagogy,
  pedagogyToVisualRequirements,
} from "@/lib/ks2-pedagogy/registry";

/**
 * Detect mandatory visual blocks for KS2 Maths from question + topic context.
 */
export function detectKS2RequiredVisuals(
  question: string,
  topic?: string,
  subtopics?: string[],
): VisualRequirement[] {
  return pedagogyToVisualRequirements(lookupPedagogy(question, topic, subtopics));
}

/** Merge KS2 and general visual requirements without duplicate topics. */
export function mergeVisualRequirements(
  base: VisualRequirement[],
  extra: VisualRequirement[],
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
  subtopics: string[],
): string {
  const reqs = detectKS2RequiredVisuals("", topic, subtopics);
  if (reqs.length === 0) {
    return `For the worked example, include at least one visual block (column_method for arithmetic, number_line for fractions/multiples, labeled_shape for geometry, table for place value).`;
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
  "blocks": [ at least one VisualBlock — NEVER only a text block ],
  "conclusion": "one sentence stating the answer clearly"
}

Allowed block types for KS2: column_method, equation_steps, number_line, labeled_shape, table, text.
• Long / column multiply or divide → column_method WITH "moves" carry arrows + equation_steps explaining each partial product
• × or ÷ by 10, 100, 1000 → place-value TABLE (Th H T O columns) + equation_steps showing each digit shift (NEVER column_method for this)
• Multiples / skip-counting → number_line with markers at each multiple (preferred) or a clear table with highlightCells
• Fractions on a line → number_line
• Shapes/area/perimeter → labeled_shape
• Short hints between visuals → text (one sentence max)

column_method RULES (critical for accuracy):
• rows are digit strings with NO spaces between digits: "36", "×15", "180", "360", "540" — never "3 6" or "1 8 0"
• Put the × on the multiplier row only
• carries sit ABOVE the multiplicand row (row 0) while forming each partial product — UK primary convention
• Always include "moves" arrows for every carry
• separatorAfterRows after the multiplier and before the final sum
• Prefer placeValueHeaders like ["T","O"] or ["H","T","O"] when helpful

column_method example for 36 × 15:
{
  "type": "column_method",
  "method": "column_multiplication",
  "rows": ["36", "×15", "180", "360", "540"],
  "carries": [{"row": 0, "col": 1, "digit": "3"}],
  "moves": [{"fromRow": 0, "fromCol": 2, "toRow": 0, "toCol": 1, "label": "carry 3", "kind": "carry"}],
  "separatorAfterRows": [1, 3],
  "placeValueHeaders": ["H", "T", "O"],
  "question": "36 × 15",
  "answer": "540"
}

Place-value ×1000 example (250 × 1000) — use a place-value table AND equation_steps:
table block:
{
  "type": "table",
  "headers": ["Hundred Thousands", "Ten Thousands", "Thousands", "Hundreds", "Tens", "Ones"],
  "rows": [
    ["", "", "", "2", "5", "0"],
    ["", "", "2", "5", "0", "0"],
    ["", "2", "5", "0", "0", "0"],
    ["2", "5", "0", "0", "0", "0"]
  ],
  "caption": "Each ×10 shifts every digit one place to the left",
  "highlightCells": [[3, 0], [3, 1], [3, 2]]
}
equation_steps: 250 → ×10 = 2500 → ×10 = 25000 → ×10 = 250000, with arrows on each shift.

workedExample.steps[] must be SHORT captions matching the diagram (2-4 steps). Never replace the diagram with prose.
NOTE: The server may replace column_method / place-value table digits with a deterministic builder — still emit a correct sketch.
`;
