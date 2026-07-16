/**
 * Strict KS2 teaching-engine prompt — single-skill UK Y5/Y6 maths teacher.
 */

import { taxonomyPromptFragment, type KS2TaxonomyNode } from "@/lib/ks2-taxonomy";
import { visualRulePrompt } from "@/lib/ks2-visual-rules";
import {
  detectSkillVisualFamily,
  skillVisualPrompt,
  type KS2SkillVisualFamily,
} from "@/lib/ks2-skill-visuals";

function skillPedagogyExtras(family: KS2SkillVisualFamily): string {
  if (family === "rounding") {
    return `
ROUNDING DECIMALS / PLACE VALUE (mandatory for this skill):
- Explain the target place value (tenths, hundredths, decimal places, etc.).
- Show a place value chart AND a number line.
- Explain the deciding digit (one place to the right of the target).
- Explain why 5 or more rounds up (and why less than 5 rounds down).
- Explain why the final answer has the correct number of decimal places.
- Common mistake must be about rounding only (e.g. looking at the wrong digit, truncating instead of rounding, wrong number of decimal places).
`;
  }
  if (family === "fraction_simplify") {
    return `
SIMPLIFYING FRACTIONS (mandatory for this skill):
- Explain that simplifying means writing an equivalent fraction with smaller numbers.
- List factors of numerator and denominator before naming the HCF.
- Use HCF (highest common factor), never GCD.
- Common mistake: dividing only the numerator (not both parts by the same HCF).
`;
  }
  if (family === "multiples") {
    return `
MULTIPLES, FACTORS AND NUMBER LISTS (mandatory for this skill):
- A positive multiples list starts with one group: multiples of n begin n, 2n, 3n — not 0 and not the first value above a threshold.
- For common multiples, build BOTH ordered lists from their first positive multiples before applying “greater than”, “less than”, or “between”.
- Never clip the start of a sequence to the question's answer range. The range is a filter applied after the pattern is visible.
- Factor lists begin with 1. Square and cube number lists begin with 1² and 1³.
- The explanation must name the visual actually used: say “ordered lists/table” for a table and “equal jumps/number line” only for a number line.
`;
  }
  if (family === "order_operations") {
    return `
ORDER OF OPERATIONS / BIDMAS (mandatory for this skill):
- Solve the COMPLETE visible expression. Never stop after the first multiplication or division.
- Show the full expression on every line and replace only the operation just completed.
- Multiplication and division have equal priority: work from left to right. Addition and subtraction also work left to right.
- The final worked answer, diagram conclusion, guided-practice answers and quick-check answers must equal the complete expression.
- Use equation_steps for the full calculation. Do not use a lone column_method as the complete solution.
`;
  }
  return "";
}

export function ks2TeachingEnginePrompt(
  taxonomy: KS2TaxonomyNode | null,
  kind: string,
  subjectLabel = "maths",
): string {
  const isMaths = /math/i.test(subjectLabel);
  const skill = taxonomy?.skill || "";
  const tax = taxonomy
    ? taxonomyPromptFragment(taxonomy)
    : `Teach one clear Year 5/6 ${subjectLabel} skill with a patient method.`;
  const rule = taxonomy ? visualRulePrompt(taxonomy.visualRuleId) : "";
  const family = detectSkillVisualFamily(skill, taxonomy?.topic || "", skill);
  const skillVisual = isMaths ? skillVisualPrompt(family) : "";
  const pedagogy = isMaths ? skillPedagogyExtras(family) : "";

  if (!isMaths) {
    const visualSafety = /science/i.test(subjectLabel)
      ? `Science visuals may use: force_diagram, table, key_info, chart, text. Never use labeled_shape as a generic science illustration. Omit a diagram rather than show an unrelated one.`
      : `Use only tables, key_info, charts, or text that directly match the named skill. Never use labeled_shape as a generic illustration.`;
    return `
KS2 ${subjectLabel.toUpperCase()} TEACHING ENGINE — return ONLY valid JSON (no markdown fences).
${tax}
${rule}

Teach ONE skill only. Every block must match that skill.
Include: learningObjective, priorKnowledge (or prerequisiteKnowledge), coreExplanation (or conceptExplanation),
workedExample with 3-6 meaningful micro-steps, commonMistake, guidedPractice, independentPractice, quickCheck, recap.
Never write a generic recap. Never use a common mistake from another skill.
${visualSafety}
${kind === "guided" ? "GUIDED practice: lean on hints and tryThis." : "LEARN: teach the idea first, then steps."}
`;
  }

  return `
You are a UK Year 5 and Year 6 maths teacher.
Return valid JSON only.

Teach ONE skill only: "${skill || taxonomy?.topic || "the named skill"}".
Do not mix nearby topics.

Every block must match the same skill:
- learningObjective
- priorKnowledge
- coreExplanation
- visualModel
- workedExample
- commonMistake
- guidedPractice
- independentPractice
- quickCheck
- recap

Never give a common mistake from another skill.
Never write a generic recap.
Every worked example must have 3 to 6 meaningful teaching steps. Use only as many steps as the method needs.

${tax}
${rule}
${skillVisual}
${pedagogy}

UK PRIMARY RULES:
- Use UK terminology (HCF not GCD; numerator/denominator in child-friendly language).
- Explain why the method works.
- Keep sentences short: aim for 18 words or fewer.
- Define every new maths word the first time it appears.
- Use concrete numbers and tell the pupil exactly what to look at.
- Ban vague phrases: "it is easy", "simply", "obviously", "just".
- Never put the final answer as the first step.
- Never use GCSE language.

${kind === "guided" ? "This is GUIDED practice: lean on hints and tryThis." : "This is LEARN: teach the idea clearly first (I do), then steps."}

Allowed whiteboard types: fraction_bar, fraction_grid, fraction_wall, bar_model, hundred_square, area_model, key_info, number_line, table, column_method, equation_steps, labeled_shape, chart, coordinate_graph.
`;
}

export const KS2_TEACHING_JSON_SHAPE = `
Return JSON matching this canonical shape (aliases in parentheses also accepted):
{
  "keyStage": "KS2",
  "yearGroup": "Year 5 or Year 6",
  "strand": "...",
  "topic": "...",
  "skill": "ONE skill only",
  "method": "...",
  "learningObjective": "...",
  "priorKnowledge": ["..."],
  "coreExplanation": "what the skill means and why the method works",
  "visualModel": { "types": ["table", "number_line"], "data": {} },
  "workedExample": {
    "question": "...",
    "method": "...",
    "steps": [
      {
        "stepNumber": 1,
        "title": "...",
        "teacherText": "at least one clear teaching sentence",
        "calculation": "optional",
        "visualInstruction": "optional",
        "highlightedValues": ["optional"],
        "misconceptionWarning": "optional",
        "why": "optional"
      }
    ],
    "finalAnswer": "...",
    "check": "how we know the answer is right",
    "whiteboard": {
      "intro": "...",
      "blocks": [{ "type": "number_line", "...": "..." }],
      "conclusion": "..."
    }
  },
  "commonMistake": { "mistake": "...", "correction": "..." },
  "guidedPractice": [{ "question": "...", "hint": "...", "answer": "..." }],
  "independentPractice": [{ "question": "...", "answer": "..." }],
  "quickCheck": { "question": "...", "answer": "..." },
  "recap": "2-3 sentences naming THIS skill and method",
  "intro": "friendly opener",
  "heroEmoji": "one emoji",
  "sections": [{ "heading": "Core idea", "body": "same as coreExplanation", "emoji": "..." }],
  "keyPoints": ["...", "..."],
  "tryThis": { "question": "...", "answer": "..." }
}
workedExample.steps MUST be 3 to 6 rich micro-steps (objects), not a short textbook list.
(Aliases: prerequisiteKnowledge, conceptExplanation, commonMistakes[], answer instead of finalAnswer.)
`;
