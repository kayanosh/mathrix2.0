/**
 * Arabic pedagogy map for KS2 teaching engine.
 */

import type { SubjectPedagogyHint } from "@/lib/ks2-subject-pedagogy/shared";

export function arabicPedagogy(
  topic: string,
  skill?: string,
): SubjectPedagogyHint {
  const t = `${topic} ${skill || ""}`.toLowerCase();

  if (/vocab|word|greeting|classroom|food|family|colour|number/.test(t)) {
    return {
      strand: "Vocabulary",
      method: "Hear → say → match → use in a sentence",
      prerequisites: ["Listen carefully to new sounds"],
      preferredBlocks: ["table", "key_info"],
      guidance:
        "Use a bilingual vocabulary table (Arabic + English). Practise saying words aloud, then put one word into a short sentence.",
      commonMistakes: [
        {
          mistake: "Learning spellings without saying the words.",
          correction: "Say each word aloud three times, then write it.",
        },
      ],
    };
  }

  if (/grammar|gender|adjective|verb|sentence|dialogue/.test(t)) {
    return {
      strand: "Grammar & sentences",
      method: "Pattern → examples → build a sentence",
      prerequisites: ["Basic vocabulary for the topic"],
      preferredBlocks: ["table", "key_info", "text"],
      guidance:
        "Show a clear pattern (e.g. gender agreement) with correct examples in a table, then build one short dialogue line.",
      commonMistakes: [
        {
          mistake: "Translating word-for-word from English.",
          correction: "Follow the Arabic pattern shown in the examples.",
        },
      ],
    };
  }

  return {
    strand: "Arabic",
    method: "Model → practise → check",
    prerequisites: ["Classroom listening routines"],
    preferredBlocks: ["table", "key_info", "text"],
    guidance:
      "Keep language age-appropriate. Prefer bilingual tables and short spoken models. Include Arabic script where possible alongside English meanings.",
    commonMistakes: [
      {
        mistake: "Mixing English word order into Arabic sentences.",
        correction: "Copy the model sentence pattern first.",
      },
    ],
  };
}
