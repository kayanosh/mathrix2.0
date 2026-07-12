/**
 * English pedagogy map for KS2 teaching engine (Reading / Writing / GPS).
 */

import type { SubjectPedagogyHint } from "@/lib/ks2-subject-pedagogy/shared";

export function englishPedagogy(
  topic: string,
  skill?: string,
): SubjectPedagogyHint {
  const t = `${topic} ${skill || ""}`.toLowerCase();

  if (/reading|comprehension|inference|retrieve/.test(t)) {
    return {
      strand: "Reading",
      method: "Evidence → infer → answer",
      prerequisites: [
        "How to skim for key words",
        "What a quotation is",
      ],
      preferredBlocks: ["key_info", "table", "text"],
      guidance:
        "Teach retrieval and inference with short text extracts. Highlight key words, then prove the answer with evidence.",
      commonMistakes: [
        {
          mistake: "Guessing without evidence from the text.",
          correction: "Find a quote or paraphrase that proves your answer.",
        },
        {
          mistake: "Copying a whole paragraph instead of the useful bit.",
          correction: "Select the shortest useful evidence.",
        },
      ],
    };
  }

  if (/writing|genre|narrative|persuasi|report|diary|letter/.test(t)) {
    return {
      strand: "Writing",
      method: "Plan → opening → develop → ending",
      prerequisites: [
        "Purpose and audience",
        "How to plan in bullet points",
      ],
      preferredBlocks: ["table", "key_info", "text"],
      guidance:
        "Teach purpose, audience, structure and language features. Show a mini plan and a model paragraph with clear success criteria.",
      commonMistakes: [
        {
          mistake: "Starting to write without a plan.",
          correction: "Jot purpose, audience, and three main points first.",
        },
        {
          mistake: "Forgetting the ending or punchline.",
          correction: "Check the success criteria include a clear ending.",
        },
      ],
    };
  }

  // GPS / grammar / spelling / punctuation / SATs English
  return {
    strand: "Grammar, Punctuation & Spelling",
    method: "Rule → examples → fix the mistake",
    prerequisites: [
      "Word classes (noun, verb, adjective)",
      "Full stops and capital letters",
    ],
    preferredBlocks: ["table", "key_info", "text"],
    guidance:
      "State the grammar or punctuation rule clearly, show correct and incorrect examples in a table, then fix a short sentence.",
    commonMistakes: [
      {
        mistake: "Confusing its and it's.",
        correction: "It's = it is. Its = belonging to it.",
      },
      {
        mistake: "Using a comma where a full stop is needed.",
        correction: "If the idea is complete, use a full stop.",
      },
    ],
  };
}
