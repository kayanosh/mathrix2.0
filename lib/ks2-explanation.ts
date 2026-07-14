/**
 * Converts a structured KS2 explanation (from /api/ks2-lesson kind=explain)
 * into a WhiteboardResponse so the existing speaking WhiteboardTutor can
 * narrate and reveal it step-by-step for non-maths subjects.
 */

import type { WhiteboardResponse, VisualBlock } from "@/types/whiteboard";

export interface KS2ExplainStep {
  text: string;
  why?: string;
  check?: string;
  emoji?: string;
}

export interface KS2ExplainTable {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface KS2Explanation {
  intro: string;
  steps: KS2ExplainStep[];
  table?: KS2ExplainTable;
  conclusion: string;
  answer: string;
}

/**
 * Map a structured KS2 explanation to a WhiteboardResponse for WhiteboardTutor.
 * Each step is a text block so the site-wide tutor can narrate it with the
 * same step-timeline UI used for maths.
 */
export function ks2ExplanationToWhiteboard(
  explanation: KS2Explanation,
  subject: string,
  topic: string
): WhiteboardResponse {
  const blocks: VisualBlock[] = [];
  const teachingSteps: NonNullable<WhiteboardResponse["teachingSteps"]> = [];

  explanation.steps.forEach((step, i) => {
    const prefix = step.emoji ? `${step.emoji} ` : "";
    blocks.push({
      type: "text",
      content: `${prefix}Step ${i + 1}: ${step.text}`,
    });
    teachingSteps.push({
      title: `Step ${i + 1}`,
      explanation: step.text,
      why: step.why,
      check: step.check,
      narration: step.text,
      blockIndex: i,
      revealStep: i,
    });
  });

  if (
    explanation.table &&
    Array.isArray(explanation.table.headers) &&
    explanation.table.headers.length > 0 &&
    Array.isArray(explanation.table.rows) &&
    explanation.table.rows.length > 0
  ) {
    const tableIndex = blocks.length;
    blocks.push({
      type: "table",
      headers: explanation.table.headers,
      rows: explanation.table.rows,
      caption: explanation.table.caption,
    });
    teachingSteps.push({
      title: explanation.table.caption || "Compare the key information",
      explanation:
        explanation.table.caption || "Use this table to compare the important details.",
      narration:
        explanation.table.caption || "Use this table to compare the important details.",
      blockIndex: tableIndex,
    });
  }

  const conclusion = explanation.answer
    ? `${explanation.conclusion ? explanation.conclusion + " " : ""}The answer is: ${explanation.answer}`
    : explanation.conclusion;

  return {
    intro: explanation.intro || "Let's work this out together.",
    blocks,
    teachingSteps,
    conclusion: conclusion || "Well done!",
    subject,
    topic,
  };
}
