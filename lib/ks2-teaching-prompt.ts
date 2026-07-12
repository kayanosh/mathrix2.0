/**
 * Strict KS2 teaching-engine prompt fragments (all teaching-engine subjects).
 */

import { taxonomyPromptFragment, type KS2TaxonomyNode } from "@/lib/ks2-taxonomy";
import { visualRulePrompt } from "@/lib/ks2-visual-rules";
import {
  detectSkillVisualFamily,
  skillVisualPrompt,
} from "@/lib/ks2-skill-visuals";

export function ks2TeachingEnginePrompt(
  taxonomy: KS2TaxonomyNode | null,
  kind: string,
  subjectLabel = "maths",
): string {
  const isMaths = /math/i.test(subjectLabel);
  const tax = taxonomy
    ? taxonomyPromptFragment(taxonomy)
    : `Teach one clear Year 5/6 ${subjectLabel} skill with a patient method.`;
  const rule = taxonomy ? visualRulePrompt(taxonomy.visualRuleId) : "";
  const family = detectSkillVisualFamily(
    taxonomy?.skill || "",
    taxonomy?.topic || "",
    taxonomy?.skill || "",
  );
  const skillVisual = isMaths ? skillVisualPrompt(family) : "";

  const visualLine = isMaths
    ? `- workedExample with whiteboard.blocks AND at least 6 micro-steps in "steps" (patient teacher pace)`
    : `- workedExample with at least 4 micro-steps in "steps" (optional table/key_info whiteboard when helpful)`;

  const allowedVisuals = isMaths
    ? `Allowed whiteboard types: fraction_bar, fraction_grid, fraction_wall, bar_model, hundred_square, area_model, key_info, number_line, table, column_method, equation_steps, labeled_shape, chart, coordinate_graph.`
    : `Preferred non-maths visuals when helpful: key_info, table, text, labeled_shape, chart. Do NOT invent maths column methods or number lines.`;

  const ukMaths = isMaths
    ? `
UK PRIMARY MATHS RULES (mandatory):
- Use UK terminology only: HCF (highest common factor), NOT GCD; numerator and denominator (explain in child-friendly language).
- Teach like a patient Year 5/6 teacher — never a short textbook note.
- Explain WHAT the skill means before doing calculations (e.g. simplifying = equivalent fraction with smaller numbers).
- Show HOW you find each fact (list factors before naming the HCF — never state HCF without showing factors).
- Every worked example needs ≥6 micro-steps; each step is one small teaching move.
- Common mistakes MUST match this exact skill (e.g. simplifying → dividing only the numerator; NOT adding fractions).
- Recap must name the skill/method (not "today we practised" generic boxes).
- Include renderable visual data (numerators, denominators, shaded parts, labels) — empty diagrams are forbidden.
- ${skillVisual}
`
    : "";

  return `
KS2 ${subjectLabel.toUpperCase()} TEACHING ENGINE — return ONLY valid JSON (no markdown fences).
${tax}
${rule}
${ukMaths}

Every lesson MUST include:
- learningObjective (one clear sentence)
- prerequisiteKnowledge (array of short strings — subject-appropriate)
- conceptExplanation or sections (3-5 teacher explanations — concrete, no vague words)
${visualLine}
- commonMistakes: [{ "mistake": "...", "correction": "..." }] (at least one, skill-matched)
- guidedPractice: [{ "question", "hint?", "answer" }] (1-2 items)
- independentPractice: [{ "question", "answer" }] (1-2 items)
- quickCheck: { "question", "answer" }
- recap (2-3 sentences linked to THIS skill)
- tryThis (same as first guidedPractice if helpful)
- keyPoints (2-4)

Ban vague phrases: "it is easy", "simply", "obviously", "just".
Never put the final answer as the first step — teach the method first.
Explain WHY the method works in at least one step or in a teachingBlocks "teacherTip".
Never use GCSE language — this is Key Stage 2 only.
${isMaths ? "Never write GCD or 'greatest common divisor' — always HCF." : ""}

${kind === "guided" ? "This is GUIDED practice: lean on hints and tryThis." : "This is LEARN: teach the idea clearly first (I do), then steps."}

${allowedVisuals}
`;
}

export const KS2_TEACHING_JSON_SHAPE = `
Also include these teaching fields alongside the usual intro/sections/workedExample/keyPoints/tryThis:
{
  "learningObjective": "...",
  "prerequisiteKnowledge": ["..."],
  "conceptExplanation": "...",
  "commonMistakes": [{ "mistake": "...", "correction": "..." }],
  "guidedPractice": [{ "question": "...", "hint": "...", "answer": "..." }],
  "independentPractice": [{ "question": "...", "answer": "..." }],
  "quickCheck": { "question": "...", "answer": "..." },
  "recap": "...",
  "teachingBlocks": [{ "type": "teacherTip", "title": "...", "body": "..." }]
}
For maths, workedExample.steps MUST have 6 to 10 short micro-steps (UK primary teacher pace).
For non-maths, 4 to 8 micro-steps.
`;
