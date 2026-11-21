/**
 * What is on the board at a given moment of the lesson.
 *
 * The tutor used to show one step at a time in a card and shrink the earlier
 * ones to chips, so there was never anything on screen to point back to. A
 * teacher's board is the opposite: each line of working stays where it was
 * written and the next goes underneath. These helpers turn the list of lesson
 * steps into that board.
 */
import type { TutorStepModel } from "@/lib/tutor-steps";

export interface BoardItem {
  /** Stable across the lesson, so a line is never re-created when a new one is added. */
  key: string;
  /** The step this item currently shows (the latest, for a visual built up over several steps). */
  stepIndex: number;
  /** The first step that put this item on the board. */
  firstStepIndex: number;
  /** True for the item being worked on now. */
  isActive: boolean;
}

/** Steps that keep adding to ONE drawing (a column method, a diagram) share an item. */
function sharedVisualKey(step: TutorStepModel): string | null {
  const visual = step.visual;
  if (visual.type === "column") return `column:${visual.blockIndex}`;
  if (visual.type === "block") return `block:${visual.blockIndex}`;
  return null;
}

/**
 * The board after `activeIndex` steps. Each step adds a line, except that
 * consecutive steps working on the same column method or diagram update that
 * one drawing instead of stacking copies of it.
 */
export function buildBoardItems(steps: TutorStepModel[], activeIndex: number): BoardItem[] {
  const items: BoardItem[] = [];
  const last = Math.min(activeIndex, steps.length - 1);

  for (let index = 0; index <= last; index += 1) {
    const shared = sharedVisualKey(steps[index]);
    const previous = items[items.length - 1];
    if (shared && previous && previous.key === `${shared}@${previous.firstStepIndex}`) {
      previous.stepIndex = index;
      continue;
    }
    items.push({
      key: shared ? `${shared}@${index}` : `step:${index}`,
      stepIndex: index,
      firstStepIndex: index,
      isActive: false,
    });
  }

  if (items.length > 0) items[items.length - 1].isActive = true;
  return items;
}

/** The LaTeX an equation step writes on its own line. */
export function equationLineLatex(step: TutorStepModel): string | null {
  if (step.visual.type !== "equation") return null;
  const { step: equation, isFirst } = step.visual;
  return (isFirst ? equation.latexBefore || equation.latexAfter : equation.latexAfter) || null;
}

/**
 * Remove `\htmlId{id}{content}` wrappers, keeping the content.
 *
 * Ids are how arrows and marks find the term they belong to, and a model is
 * free to reuse "t1" on every step. With every line of the lesson on the board
 * at once that would send an arrow to the first "t1" it finds — some line near
 * the top. So only the two lines an arrow actually joins keep their ids.
 */
export function stripHtmlIds(latex: string): string {
  let out = "";
  let index = 0;
  const marker = "\\htmlId{";
  while (index < latex.length) {
    const at = latex.indexOf(marker, index);
    if (at === -1) {
      out += latex.slice(index);
      break;
    }
    out += latex.slice(index, at);
    const idEnd = latex.indexOf("}", at + marker.length);
    if (idEnd === -1 || latex[idEnd + 1] !== "{") {
      // Malformed — leave the rest exactly as it is rather than guess.
      out += latex.slice(at);
      break;
    }
    let depth = 0;
    let end = -1;
    for (let scan = idEnd + 1; scan < latex.length; scan += 1) {
      if (latex[scan] === "{" && latex[scan - 1] !== "\\") depth += 1;
      else if (latex[scan] === "}" && latex[scan - 1] !== "\\") {
        depth -= 1;
        if (depth === 0) {
          end = scan;
          break;
        }
      }
    }
    if (end === -1) {
      out += latex.slice(at);
      break;
    }
    out += stripHtmlIds(latex.slice(idEnd + 2, end));
    index = end + 1;
  }
  return out;
}

/** Two LaTeX strings that put the same ink on the board, whatever ids or colours wrap it. */
export function sameInk(a: string, b: string): boolean {
  const bare = (latex: string) =>
    stripHtmlIds(latex)
      .replace(/\\(?:textcolor|color)\{[^{}]*\}/g, "")
      .replace(/\\(?:left|right|,|;|!|quad|qquad| )/g, "")
      .replace(/[{}\s]/g, "");
  return bare(a) === bare(b);
}

/**
 * The LaTeX to show for the line directly above the one being written.
 *
 * The step being taught carries its own copy of that line (`latexBefore`), and
 * that copy is the one with the "from" ids its arrows start at. When the copy
 * really is the same ink as what is already on the board, show it instead, so
 * the arrow can leave from the actual term in the actual line above. When it is
 * not the same — the model skipped a step — the line is left alone: what is
 * written on a board does not change after the fact.
 */
export function lineAboveLatex(
  written: string | null,
  activeStep: TutorStepModel | undefined,
): string | null {
  if (!written || !activeStep || activeStep.visual.type !== "equation") return null;
  const { step, isFirst } = activeStep.visual;
  if (isFirst || !step.latexBefore || !step.arrows?.length) return null;
  return sameInk(step.latexBefore, written) ? step.latexBefore : null;
}
