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
  /** Authored teacher-cursor path for this step, in order (DEF-004). */
  focusTargetIds?: string[];
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

/**
 * The teacher-cursor path for a step (DEF-004).
 *
 * An explicit `focusTargetIds` wins. Otherwise derive it from the keys the step
 * already declares — those ARE the authored pen order, so deriving avoids a
 * second source of truth that could drift out of sync with the reveal. The
 * order matches ColumnMethodRenderer's writeOrder (notes, then cells, then
 * carries) and the `data-teacher-id` scheme it emits.
 */
export function teacherFocusPath(step: {
  focusTargetIds?: string[];
  noteKeys?: string[];
  cellKeys?: string[];
  carryKeys?: string[];
}): string[] | undefined {
  if (step.focusTargetIds?.length) return step.focusTargetIds;
  const derived: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    // Dedupe: a borrow mark and the digit it applies to share one box, so two
    // anchors would make the cursor "move" to where it already is, burning a
    // narration segment on a journey of zero distance.
    if (seen.has(id)) return;
    seen.add(id);
    derived.push(id);
  };
  // Notes are exchange/borrow marks. They render INSIDE the cell div rather
  // than in an element of their own, so they resolve through the same
  // `cell:` id — but they must come first, because the exchange is written
  // before the digit. Omitting them left column subtraction pointing at the
  // result while the tutor said "we exchange a ten" (DEF-004).
  (step.noteKeys ?? []).forEach((k) => push(`cell:${k}`));
  (step.cellKeys ?? []).forEach((k) => push(`cell:${k}`));
  (step.carryKeys ?? []).forEach((k) => push(`carry:${k}`));
  return derived.length > 0 ? derived : undefined;
}

export function buildTutorSteps(
  data: WhiteboardResponse,
  plan: NarrationCue[],
): TutorStepModel[] {
  const steps = plan.map((cue, cueIndex): TutorStepModel => {
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
          cuboid_array: "Unit-cube cuboid",
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
      // Two closing lines share this kind: the key idea (blockIndex -3) and the
      // hint (-4). Both used to be shown as the hint, so the board wrote the
      // same sentence twice while the voice read out two different ones.
      const isKeyIdea = cue.blockIndex === -3;
      const text = (isKeyIdea ? data.keyTakeaway : data.hint) || narration;
      return {
        cueIndex,
        kind: cue.kind,
        title: isKeyIdea ? "Key idea" : "Watch out",
        explanation: text,
        narration,
        visual: { type: "hint", text },
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
          focusTargetIds: teacherFocusPath(teachingStep),
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
      // The reveal step already knows exactly which cells this part of the
      // method writes. Without passing them on, a column cue rendered a
      // column_method — the ONE block type with a fully authored cursor path —
      // and then made the teacher's hand guess its way around the board from
      // the DOM. The teaching_step branch above does this correctly; this
      // branch silently dropped the keys.
      let focusTargetIds: string[] | undefined;
      if (block?.type === "column_method") {
        const timeline = buildColumnRevealTimeline(block);
        const step = timeline[cue.subIndex ?? 0];
        if (step) {
          if (step.title) title = step.title;
          if (step.explanation) explanation = step.explanation;
          why = step.why;
          focusTargetIds = teacherFocusPath(step);
        }
      }
      return {
        cueIndex,
        kind: cue.kind,
        title,
        explanation,
        why,
        narration,
        focusTargetIds,
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
      // "Draw the triangle", not "Diagram": a teacher says what is going up.
      shape:
        block?.type === "labeled_shape"
          ? `Draw the ${
              block.shape === "rectilinear" || (block.shape === "polygon" && block.vertices?.length === 6)
                ? "L-shape"
                : block.shape === "parallel_lines"
                  ? "parallel lines"
                  : block.shape === "straight_line" || block.shape === "around_point"
                    ? "angles"
                    : block.shape === "polygon"
                      ? "shape"
                      : block.shape
            }`
          : "Diagram",
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
  return askBeforeRevealing(steps);
}

/** A check that puts a question to the pupil, as opposed to one the teacher works through. */
function isQuestion(check: string | undefined): boolean {
  return !!check && /\?\s*$/.test(check.replace(/[✓✔]/g, "").trim());
}

/**
 * A question is asked before its answer goes on the board.
 *
 * A question for the pupil arrives attached to the step that answers it:
 * "How much is Amy's share?" on the line that reads £24. Played in that order
 * the board wrote £24, and then asked what Amy's share was. A teacher asks,
 * waits, and then writes it. So the question moves to the end of the step
 * before, where it is followed by the thinking pause and then by the answer.
 */
function askBeforeRevealing(steps: TutorStepModel[]): TutorStepModel[] {
  const out = steps.map((step) => ({ ...step }));
  for (let i = 1; i < out.length; i++) {
    const here = out[i];
    const before = out[i - 1];
    if (here.kind !== "equation_step" || !isQuestion(here.check)) continue;
    // Only onto a step of working that has no check of its own.
    if (before.kind !== "equation_step" || before.check) continue;
    before.check = here.check;
    here.check = undefined;
  }
  return out;
}
