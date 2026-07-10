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
  // Place value ×÷ 10/100/1000 MUST come before generic multiplication
  {
    keywords:
      /(?:multiply|divide)\s+(?:by\s+)?(?:10|100|1000)\b|[×x*÷]\s*(?:10|100|1000)\b|(?:10|100|1000)\s*(?:times|[×x])\b|\b(?:place value|digit\s*shift|add(?:ing)?\s*zeros?|move(?:s|ing)?\s+(?:the\s+)?(?:digit|place))\b/i,
    topic: "Place Value ×÷ 10/100/1000",
    blocks: ["table", "equation_steps"],
  },
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
      /\b(long multiplication|column multiplication|multiply.*digit|2.?digit.*2.?digit|3.?digit.*2.?digit|4.?digit.*\d.?digit)\b|(?<!\d)\d{1,4}\s*[×x*]\s*\d{1,2}(?!\d*0{2,})\b/i,
    topic: "Column Multiplication",
    blocks: ["column_method", "equation_steps"],
  },
  {
    keywords:
      /\b(long division|bus stop|divide.*digit|short division|÷)\b/i,
    topic: "Long Division",
    blocks: ["column_method", "equation_steps"],
  },
  {
    keywords:
      /\b(multiples?|skip.?count|times tables?|factors?|primes?|square numbers?|cube numbers?)\b/i,
    topic: "Multiples and Factors",
    blocks: ["number_line", "table"],
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
      /\b(add|subtract|multiply|divide|calculation|arithmetic)\b/i,
    topic: "Arithmetic",
    blocks: ["column_method", "equation_steps"],
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
      // Prefer the first (most specific) match for arithmetic topics —
      // don't also pile on the generic "Arithmetic" rule.
      if (
        rule.topic === "Place Value ×÷ 10/100/1000" ||
        rule.topic === "Column Multiplication" ||
        rule.topic === "Column Addition" ||
        rule.topic === "Column Subtraction" ||
        rule.topic === "Long Division" ||
        rule.topic === "Multiples and Factors"
      ) {
        break;
      }
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
• carries sit on the PARTIAL PRODUCT row being written (not on the multiplicand)
• Always include "moves" arrows for every carry
• separatorAfterRows after the multiplier and before the final sum

column_method example for 36 × 15:
{
  "type": "column_method",
  "method": "column_multiplication",
  "rows": ["36", "×15", "180", "360", "540"],
  "carries": [{"row": 2, "col": 1, "digit": "3"}],
  "moves": [{"fromRow": 2, "fromCol": 2, "toRow": 2, "toCol": 1, "label": "carry 3", "kind": "carry"}],
  "separatorAfterRows": [1, 3],
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
`;
