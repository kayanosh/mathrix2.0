/**
 * Maps narration cues + whiteboard data into display models for the
 * premium tutor UI (title / explanation / why).
 */

import type { NarrationCue } from "@/lib/narration";
import type { WhiteboardResponse, EquationStep, VisualBlock } from "@/types/whiteboard";

export interface TutorStepModel {
  cueIndex: number;
  kind: NarrationCue["kind"];
  title: string;
  explanation: string;
  why?: string;
  rule?: string;
  narration: string;
  /** Visual payload for the active step card */
  visual:
    | { type: "intro"; text: string }
    | { type: "conclusion"; text: string }
    | { type: "hint"; text: string }
    | { type: "equation"; step: EquationStep; isFirst: boolean; isFinal: boolean }
    | { type: "column"; blockIndex: number; revealStep: number }
    | { type: "block"; block: VisualBlock; blockIndex: number }
    | { type: "text"; content: string; latex?: string };
}

export function buildTutorSteps(
  data: WhiteboardResponse,
  plan: NarrationCue[],
): TutorStepModel[] {
  return plan.map((cue, cueIndex) => {
    const narration = cue.text;

    if (cue.kind === "intro") {
      return {
        cueIndex,
        kind: cue.kind,
        title: "Let's begin",
        explanation: data.intro || narration,
        narration,
        visual: { type: "intro", text: data.intro || narration },
      };
    }

    if (cue.kind === "conclusion") {
      return {
        cueIndex,
        kind: cue.kind,
        title: "Answer",
        explanation: data.conclusion || narration,
        narration,
        visual: { type: "conclusion", text: data.conclusion || narration },
      };
    }

    if (cue.kind === "hint") {
      return {
        cueIndex,
        kind: cue.kind,
        title: "Watch out",
        explanation: data.hint || narration,
        narration,
        visual: { type: "hint", text: data.hint || narration },
      };
    }

    if (cue.kind === "equation_step") {
      const block = data.blocks[cue.blockIndex];
      if (block?.type === "equation_steps") {
        const sub = cue.subIndex ?? 0;
        const step = block.steps[sub];
        if (step) {
          return {
            cueIndex,
            kind: cue.kind,
            title: step.operationLabel || `Step ${step.stepNumber}`,
            explanation: step.explanation || narration,
            why: step.why,
            rule: step.rule,
            narration,
            visual: {
              type: "equation",
              step,
              isFirst: sub === 0,
              isFinal: sub === block.steps.length - 1,
            },
          };
        }
      }
    }

    if (cue.kind === "column") {
      return {
        cueIndex,
        kind: cue.kind,
        title: `Working · part ${(cue.subIndex ?? 0) + 1}`,
        explanation: narration,
        narration,
        visual: {
          type: "column",
          blockIndex: cue.blockIndex,
          revealStep: cue.subIndex ?? 0,
        },
      };
    }

    if (cue.kind === "text") {
      const block = data.blocks[cue.blockIndex];
      if (block?.type === "text") {
        return {
          cueIndex,
          kind: cue.kind,
          title: "Note",
          explanation: block.content,
          narration,
          visual: { type: "text", content: block.content, latex: block.latex },
        };
      }
    }

    const block = cue.blockIndex >= 0 ? data.blocks[cue.blockIndex] : undefined;
    const titleMap: Partial<Record<NarrationCue["kind"], string>> = {
      graph: "Graph",
      shape: "Diagram",
      tree: "Probability tree",
      venn: "Venn diagram",
      number_line: "Number line",
      table: "Table",
      chart: "Chart",
    };

    return {
      cueIndex,
      kind: cue.kind,
      title: titleMap[cue.kind] || "Look carefully",
      explanation: narration,
      narration,
      visual: block
        ? { type: "block", block, blockIndex: cue.blockIndex }
        : { type: "intro", text: narration },
    };
  });
}
