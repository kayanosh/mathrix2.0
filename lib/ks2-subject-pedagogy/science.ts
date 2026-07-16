/**
 * Science pedagogy map for KS2 teaching engine.
 */

import type { SubjectPedagogyHint } from "@/lib/ks2-subject-pedagogy/shared";

export function sciencePedagogy(
  topic: string,
  skill?: string,
): SubjectPedagogyHint {
  const t = `${topic} ${skill || ""}`.toLowerCase();

  if (/working scientifically|fair test|investigat|hypothesis|variable/.test(t)) {
    return {
      strand: "Working Scientifically",
      method: "Hypothesis → method → results → conclusion",
      prerequisites: [
        "What we change, measure, and keep the same",
        "How to record results in a table",
      ],
      preferredBlocks: ["table", "key_info", "chart"],
      guidance:
        "Use a fair-test structure. Name the independent, dependent and control variables. Show results in a simple table.",
      commonMistakes: [
        {
          mistake: "Changing more than one thing at once.",
          correction: "Change only one variable; keep everything else the same.",
        },
      ],
    };
  }

  if (/force|friction|gravity|air resistance/.test(t)) {
    return {
      strand: "Forces",
      method: "Name the force → show direction → explain effect",
      prerequisites: ["Forces can push or pull"],
      preferredBlocks: ["force_diagram", "key_info", "table"],
      guidance:
        "Use force_diagram with the real object named and every arrow labelled with a force and direction.",
      commonMistakes: [
        {
          mistake: "Thinking heavier objects always fall faster.",
          correction: "Without air resistance, objects fall at the same rate.",
        },
      ],
    };
  }

  if (/electric|circuit|bulb|switch/.test(t)) {
    return {
      strand: "Electricity",
      method: "Complete circuit → component job → predict",
      prerequisites: ["A circuit needs a complete loop"],
      preferredBlocks: ["table", "key_info"],
      guidance:
        "Compare circuit states and component jobs in a table. Do not substitute a geometry shape for a circuit.",
      commonMistakes: [
        {
          mistake: "Thinking a gap in the wire still lets the bulb light.",
          correction: "There must be a complete loop for current to flow.",
        },
      ],
    };
  }

  if (/earth|space|moon|planet|solar/.test(t)) {
    return {
      strand: "Earth & Space",
      method: "Model → observe → explain",
      prerequisites: ["Day and night happen because Earth turns"],
      preferredBlocks: ["key_info", "table"],
      guidance:
        "Use key facts or a comparison table unless a purpose-built Earth–Sun–Moon diagram is available.",
      commonMistakes: [
        {
          mistake: "Thinking the Sun moves around the Earth each day.",
          correction: "Earth rotates, which makes the Sun appear to move.",
        },
      ],
    };
  }

  if (/living|animal|plant|habitat|life cycle|evolution|classification/.test(t)) {
    return {
      strand: "Living things",
      method: "Observe → classify → explain",
      prerequisites: ["Living things grow, reproduce and respond"],
      preferredBlocks: ["table", "key_info"],
      guidance:
        "Use classification and life-cycle tables with labels from the exact topic.",
      commonMistakes: [
        {
          mistake: "Mixing up habitat needs with animal features.",
          correction: "Link each feature to how it helps survival in that place.",
        },
      ],
    };
  }

  if (/material|property|dissolve|separate|reversible/.test(t)) {
    return {
      strand: "Materials",
      method: "Property → test → conclude",
      prerequisites: ["Materials have different properties"],
      preferredBlocks: ["table", "key_info"],
      guidance: "Compare properties in a table and link them to uses.",
      commonMistakes: [
        {
          mistake: "Thinking dissolving is the same as disappearing forever.",
          correction: "The substance is still there — it has mixed into the liquid.",
        },
      ],
    };
  }

  return {
    strand: "Science",
    method: "Explain with evidence",
    prerequisites: ["Careful observation", "Using scientific vocabulary"],
    preferredBlocks: ["key_info", "table", "chart"],
    guidance:
      "Teach one clear scientific idea with an everyday example, then check understanding.",
    commonMistakes: [
      {
        mistake: "Describing without explaining why.",
        correction: "Use because / so that to link cause and effect.",
      },
    ],
  };
}
