/**
 * The last tidy-up before an answer is drawn on the board.
 *
 * Everything here fixes something a pupil could see was wrong on the board
 * while the answer itself was right. Each fix is mechanical: it rearranges
 * what the answer already says and never changes a number. It is applied on
 * the server before an answer is sent, and again by the board itself, so that
 * an answer saved before a fix existed is drawn correctly too. Applying it
 * twice changes nothing.
 */
import type {
  EquationStep,
  ProbabilityTreeBlock,
  TableBlock,
  VisualBlock,
  WhiteboardResponse,
} from "@/types/whiteboard";

/** A line of working with the pen-mark wrappers and spacing taken off, for comparing. */
function bare(latex: string | undefined): string {
  let s = String(latex ?? "");
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\(?:htmlId|textcolor|htmlClass)\{[^{}]*\}\{((?:[^{}]|\{[^{}]*\})*)\}/g, "$1");
  }
  return s.replace(/\\[,;:! ]|\\(?:left|right|displaystyle)(?![a-zA-Z])/g, "").replace(/\s+/g, "");
}

const isJustANumber = (latex: string) => /^[-−+]?[£$]?\d[\d.,]*%?$/.test(bare(latex));

/**
 * The first line of working keeps its result.
 *
 * A block of working opens with the line as given, and each step after that
 * shows what the line becomes. That is how the board draws it: step 1 shows
 * where we start, every later step shows its result. But the model often does
 * real work in step 1 ("x² + 6x + 2" becomes "(x + 3)² − 9 + 2"), and the board
 * then showed only where step 1 started. Its result was never written:
 *
 *   Write x² + 6x + 2 in the form (x + a)² + b
 *     board:  x² + 6x + 2
 *     board:  (x + 3)² − 7              where did the −7 come from?
 *
 * The line "(x + 3)² − 9 + 2" was said aloud and never seen. In one run of 64
 * questions this dropped a line of working from 19 of them, among them the
 * factorised fraction before cancelling, the multiplier 1.05, the scale factor
 * 2.5 and the total of the angles in a hexagon.
 *
 * So when step 1 changes its line, the starting line is given a step of its
 * own, and step 1 then shows its result like every other step.
 */
function withStartingLine(steps: EquationStep[]): EquationStep[] {
  const first = steps[0];
  if (!first) return steps;
  const before = bare(first.latexBefore);
  const after = bare(first.latexAfter);
  if (!before || !after || before === after) return steps;
  // "36" then "36 = 2 × 2 × 3 × 3": the result already shows the start.
  if (isJustANumber(first.latexBefore) || after.includes(before)) {
    return [{ ...first, latexBefore: first.latexAfter }, ...steps.slice(1)];
  }

  const start: EquationStep = {
    stepNumber: 1,
    operationLabel: "Start here",
    explanation: "This is what we start with.",
    latexBefore: first.latexBefore,
    latexAfter: first.latexBefore,
    arrowDirection: "down",
  };
  return [start, ...steps].map((step, i) => ({ ...step, stepNumber: i + 1 }));
}

/**
 * A tree too big to read becomes a table of outcomes.
 *
 * Two dice were drawn as a tree with 36 ends, each a few pixels tall. Nobody
 * draws that tree; a teacher draws a grid, one die across and one die down.
 * When both stages of a tree have four or more branches, and every first
 * branch leads to the same second set, the tree is redrawn as that grid.
 * If the events are numbers the cells hold their totals, and the total the
 * question asks about is highlighted.
 */
function asOutcomeGrid(tree: ProbabilityTreeBlock, askedTotal: number | null): TableBlock | null {
  const first = tree.branches ?? [];
  if (first.length < 4) return null;
  const second = first[0]?.children ?? [];
  if (second.length < 4) return null;
  const sameSecondSet = first.every(
    (branch) =>
      (branch.children ?? []).length === second.length &&
      (branch.children ?? []).every((child, i) => child.event === second[i].event),
  );
  if (!sameSecondSet) return null;
  // A third stage cannot be shown on a grid.
  if (first.some((branch) => (branch.children ?? []).some((child) => (child.children ?? []).length > 0))) return null;

  const number = (text: string) => (/^-?\d+(?:\.\d+)?$/.test(text.trim()) ? Number(text) : null);
  const allNumbers = [...first, ...second].every((b) => number(b.event) !== null);

  const rows = first.map((a) => [
    a.event,
    ...second.map((b) => (allNumbers ? String(number(a.event)! + number(b.event)!) : `${a.event}, ${b.event}`)),
  ]);
  const highlightCells: [number, number][] = [];
  if (allNumbers && askedTotal !== null) {
    rows.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (c > 0 && Number(cell) === askedTotal) highlightCells.push([r, c]);
      }),
    );
  }
  return {
    type: "table",
    headers: [allNumbers ? "+" : "", ...second.map((b) => b.event)],
    rows,
    // Read out as "Here's the sample space grid: …", so it has to work as the
    // end of that sentence.
    caption: allNumbers
      ? `Sample space grid: the first number is down the side, the second is along the top, and each total is inside. There are ${first.length * second.length} outcomes`
      : `Sample space grid: the first is down the side and the second is along the top. There are ${first.length * second.length} outcomes`,
    ...(highlightCells.length > 0 ? { highlightCells } : {}),
  };
}

/** "the total is 7", "a sum of 7", "a score of 9": the total a question asks about. */
function askedTotalIn(text: string): number | null {
  const found = text.match(/\b(?:total|sum|score)\b[^.\d]{0,24}?(\d{1,3})\b/i);
  return found ? Number(found[1]) : null;
}

/**
 * The warning about the common mistake, without its headings.
 *
 * The plan sets it out as "What goes wrong: … What to do: …" for the model,
 * which is told to write two plain sentences. Sometimes it copies the headings,
 * and the pupil was read "What goes wrong: Writing the upper bound… What to
 * do: The upper bound is 3.55."
 */
export function withoutMistakeHeadings(hint: string): string {
  const parts = hint.match(/^\s*what goes wrong\s*:\s*([\s\S]+?)\s*what to do(?: instead)?\s*:\s*([\s\S]+)$/i);
  if (!parts) return hint.replace(/^\s*(?:what goes wrong|what to do(?: instead)?|wrong|right)\s*:\s*/i, "");
  const wrong = parts[1].trim().replace(/[.;,]+$/, "");
  const right = parts[2].trim();
  // "Writing the upper bound as 3.54" → "A common mistake is writing the upper bound as 3.54."
  const mistake = /^[A-Z][a-z]+ing\b/.test(wrong)
    ? `A common mistake is ${wrong.charAt(0).toLowerCase()}${wrong.slice(1)}.`
    : `${wrong}.`;
  return `${mistake} ${right}`;
}

/** An answer, ready to be drawn. Returns the same object when nothing needed changing. */
export function boardReady<T extends WhiteboardResponse>(data: T): T {
  if (!data || !Array.isArray(data.blocks)) return data;
  let changed = false;
  const askedTotal = askedTotalIn(`${data.intro ?? ""} ${data.conclusion ?? ""}`);

  // A built-in method's own script points at its lines by number, so its
  // working is left exactly as the method wrote it.
  const scripted = (data.teachingSteps?.length ?? 0) > 0;

  const blocks: VisualBlock[] = data.blocks.map((block) => {
    if (!scripted && block.type === "equation_steps" && Array.isArray(block.steps)) {
      const steps = withStartingLine(block.steps);
      if (steps !== block.steps) {
        changed = true;
        return { ...block, steps };
      }
    }
    if (block.type === "probability_tree") {
      const grid = asOutcomeGrid(block, askedTotal);
      if (grid) {
        changed = true;
        return grid;
      }
    }
    return block;
  });

  const hint = typeof data.hint === "string" ? withoutMistakeHeadings(data.hint) : data.hint;
  if (hint !== data.hint) changed = true;

  return changed ? { ...data, blocks, hint } : data;
}
