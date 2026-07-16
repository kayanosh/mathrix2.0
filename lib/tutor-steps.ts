/**
 * Maps narration cues + whiteboard data into display models for the
 * premium tutor UI (title / explanation / why).
 */

import type { NarrationCue } from "@/lib/narration";
import type { WhiteboardResponse, EquationStep, VisualBlock } from "@/types/whiteboard";
import { buildColumnRevealTimeline } from "@/lib/column-reveal";

export interface TutorStepModel {
  cueIndex: number;
  kind: NarrationCue["kind"];
  title: string;
  explanation: string;
  why?: string;
  check?: string;
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

    if (cue.kind === "hint" && cue.blockIndex >= 0) {
      const block = data.blocks[cue.blockIndex];
      if (block) {
        const visualTitle: Partial<Record<VisualBlock["type"], string>> = {
          fraction_bar: "Fraction bar",
          fraction_grid: "Fraction grid",
          fraction_wall: "Fraction wall",
          bar_model: "Bar model",
          hundred_square: "Hundred square",
          area_model: "Area model",
          key_info: "Key information",
          force_diagram: "Force diagram",
        };
        return {
          cueIndex,
          kind: cue.kind,
          title: visualTitle[block.type] || "Look carefully",
          explanation: narration,
          narration,
          visual: { type: "block", block, blockIndex: cue.blockIndex },
        };
      }
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

    if (cue.kind === "teaching_step") {
      const teachingStep = data.teachingSteps?.[cue.subIndex ?? 0];
      if (teachingStep) {
        const visualBlock =
          cue.blockIndex >= 0 ? data.blocks[cue.blockIndex] : undefined;
        const sub = cue.subIndex ?? 0;
        let visual: TutorStepModel["visual"] = {
          type: "text",
          content: teachingStep.explanation,
        };
        if (visualBlock?.type === "column_method") {
          visual = {
            type: "column",
            blockIndex: cue.blockIndex,
            revealStep: sub,
          };
        } else if (visualBlock?.type === "equation_steps" && visualBlock.steps.length > 0) {
          const equationIndex = Math.min(sub, visualBlock.steps.length - 1);
          visual = {
            type: "equation",
            step: visualBlock.steps[equationIndex],
            isFirst: equationIndex === 0,
            isFinal: equationIndex === visualBlock.steps.length - 1,
          };
        } else if (visualBlock?.type === "text") {
          visual = {
            type: "text",
            content: visualBlock.content,
            latex: visualBlock.latex,
          };
        } else if (visualBlock) {
          visual = { type: "block", block: visualBlock, blockIndex: cue.blockIndex };
        }
        return {
          cueIndex,
          kind: cue.kind,
          title: teachingStep.title || `Step ${(cue.subIndex ?? 0) + 1}`,
          explanation: teachingStep.explanation,
          why: teachingStep.why,
          check: teachingStep.check,
          narration,
          visual,
        };
      }
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
            check: step.selfCheck,
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
      const block = data.blocks[cue.blockIndex];
      let title = `Working · part ${(cue.subIndex ?? 0) + 1}`;
      let explanation = narration;
      let why: string | undefined;
      if (block?.type === "column_method") {
        const timeline = buildColumnRevealTimeline(block);
        const step = timeline[cue.subIndex ?? 0];
        if (step) {
          if (step.title) title = step.title;
          if (step.explanation) explanation = step.explanation;
          why = step.why;
        }
      }
      return {
        cueIndex,
        kind: cue.kind,
        title,
        explanation,
        why,
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
        const stepMatch = block.content.match(/^(.{0,4})?\s*Step\s+(\d+)\s*:\s*(.*)$/i);
        const title = stepMatch
          ? `Step ${stepMatch[2]}`
          : "Next idea";
        const explanation = stepMatch ? stepMatch[3] : block.content;
        return {
          cueIndex,
          kind: cue.kind,
          title,
          explanation,
          narration,
          visual: { type: "text", content: explanation, latex: block.latex },
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
