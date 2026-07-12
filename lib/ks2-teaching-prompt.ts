/**
 * Strict KS2 teaching-engine prompt fragments (maths Learn/Guided).
 */

import { taxonomyPromptFragment, type KS2TaxonomyNode } from "@/lib/ks2-taxonomy";
import { visualRulePrompt } from "@/lib/ks2-visual-rules";

export function ks2TeachingEnginePrompt(
  taxonomy: KS2TaxonomyNode | null,
  kind: string,
): string {
  const tax = taxonomy
    ? taxonomyPromptFragment(taxonomy)
    : "Teach one clear Year 5/6 maths skill with a patient method.";
  const rule = taxonomy ? visualRulePrompt(taxonomy.visualRuleId) : "";

  return `
KS2 MATHS TEACHING ENGINE — return ONLY valid JSON (no markdown fences).
${tax}
${rule}

Every maths lesson MUST include:
- learningObjective (one clear sentence)
- prerequisiteKnowledge (array of short strings)
- sections (3-5 teacher explanations — concrete, no vague words)
- workedExample with whiteboard.blocks AND at least 4 micro-steps in "steps"
- commonMistakes: [{ "mistake": "...", "correction": "..." }] (at least one)
- guidedPractice: [{ "question", "hint?", "answer" }] (1-2 items)
- independentPractice: [{ "question", "answer" }] (1-2 items)
- quickCheck: { "question", "answer" }
- recap (2-3 sentences)
- tryThis (same as first guidedPractice if helpful)
- keyPoints (2-4)

Ban vague phrases: "it is easy", "simply", "obviously", "just".
Never put the final answer as the first step — teach the method first.
Explain WHY the method works in at least one step or in a teachingBlocks "teacherTip".

${kind === "guided" ? "This is GUIDED practice: lean on hints and tryThis." : "This is LEARN: teach the idea clearly first (I do), then steps."}

Allowed extra whiteboard types: fraction_bar, fraction_wall, bar_model, hundred_square, area_model, key_info, number_line, table, column_method, equation_steps, labeled_shape, chart, coordinate_graph.
`;
}

export const KS2_TEACHING_JSON_SHAPE = `
Also include these teaching fields alongside the usual intro/sections/workedExample/keyPoints/tryThis:
{
  "learningObjective": "...",
  "prerequisiteKnowledge": ["..."],
  "commonMistakes": [{ "mistake": "...", "correction": "..." }],
  "guidedPractice": [{ "question": "...", "hint": "...", "answer": "..." }],
  "independentPractice": [{ "question": "...", "answer": "..." }],
  "quickCheck": { "question": "...", "answer": "..." },
  "recap": "...",
  "teachingBlocks": [{ "type": "teacherTip", "title": "...", "body": "..." }]
}
workedExample.steps MUST have 4 to 8 short micro-steps.
`;
