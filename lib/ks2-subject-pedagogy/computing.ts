/**
 * Computing pedagogy map for KS2 teaching engine.
 */

import type { SubjectPedagogyHint } from "@/lib/ks2-subject-pedagogy/shared";

export function computingPedagogy(
  topic: string,
  skill?: string,
): SubjectPedagogyHint {
  const t = `${topic} ${skill || ""}`.toLowerCase();

  if (/safety|online|secure|phishing|password/.test(t)) {
    return {
      strand: "Online safety",
      method: "Spot the risk → choose a safe action",
      prerequisites: ["Ask a trusted adult if unsure"],
      preferredBlocks: ["key_info", "table"],
      guidance: "Use short scenarios. Highlight risky choices and safer alternatives.",
      commonMistakes: [
        {
          mistake: "Sharing passwords with friends.",
          correction: "Keep passwords private; use a trusted adult for help.",
        },
      ],
    };
  }

  if (/scratch|algorithm|program|code|variable|selection|loop/.test(t)) {
    return {
      strand: "Programming",
      method: "Break into steps → code → test → debug",
      prerequisites: ["Follow instructions in order"],
      preferredBlocks: ["table", "key_info", "text"],
      guidance:
        "Show an algorithm as numbered steps, then how selection/loops change it. Include a debug tip.",
      commonMistakes: [
        {
          mistake: "Changing many things when debugging.",
          correction: "Change one thing at a time and test again.",
        },
      ],
    };
  }

  if (/data|spreadsheet|database|search/.test(t)) {
    return {
      strand: "Data & information",
      method: "Organise → query → conclude",
      prerequisites: ["Rows and columns store related facts"],
      preferredBlocks: ["table", "key_info"],
      guidance: "Use a small table example and ask a clear question of the data.",
      commonMistakes: [
        {
          mistake: "Mixing labels and values in the wrong cells.",
          correction: "Keep headers clear; put one fact per cell.",
        },
      ],
    };
  }

  return {
    strand: "Computing",
    method: "Explain → try → check",
    prerequisites: ["Following step-by-step instructions"],
    preferredBlocks: ["key_info", "table", "text"],
    guidance: "Teach one computing idea with a concrete classroom example.",
    commonMistakes: [
      {
        mistake: "Skipping the check/test step.",
        correction: "Always test whether the outcome matches the plan.",
      },
    ],
  };
}
