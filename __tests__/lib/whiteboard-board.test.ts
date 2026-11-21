import {
  buildBoardItems,
  equationLineLatex,
  lineAboveLatex,
  sameInk,
  stripHtmlIds,
} from "@/lib/board-items";
import { isPointableTerm, normaliseTermLabel, spokenTermIndex, termMentions } from "@/lib/spoken-terms";
import { inkPen, penPointOnGlyph, strokeAt, type PenStroke } from "@/lib/ink-pen";
import { estimateMathWriteMs, estimateNoteWriteMs, NOTE_GAP_MS } from "@/lib/handwriting";
import type { TutorStepModel } from "@/lib/tutor-steps";
import type { EquationStep } from "@/types/whiteboard";

/**
 * The whiteboard is meant to teach like a teacher at a board: the working stays
 * up, a pen writes each new line, and the pen goes to the term being talked
 * about. These pin the three decisions behind that — what is on the board,
 * where the pen is while it writes, and which term it points at.
 */
const equationStep = (
  index: number,
  equation: Partial<EquationStep>,
  isFirst = false,
): TutorStepModel => ({
  cueIndex: index,
  kind: "equation_step",
  title: `Step ${index}`,
  explanation: "",
  narration: "",
  visual: {
    type: "equation",
    isFirst,
    isFinal: false,
    step: {
      stepNumber: index,
      operationLabel: "",
      explanation: "",
      latexBefore: "",
      latexAfter: "",
      arrowDirection: "down",
      ...equation,
    } as EquationStep,
  },
});

const intro: TutorStepModel = {
  cueIndex: 0,
  kind: "intro",
  title: "Let's begin",
  explanation: "",
  narration: "",
  visual: { type: "intro", text: "Let's work through this." },
};

const column = (index: number, revealStep: number, blockIndex = 0): TutorStepModel => ({
  cueIndex: index,
  kind: "column",
  title: `Column ${revealStep}`,
  explanation: "",
  narration: "",
  visual: { type: "column", blockIndex, revealStep },
});

describe("what is on the board", () => {
  const lesson = [
    intro,
    equationStep(1, { latexAfter: "3x + 7 = 25" }, true),
    equationStep(2, { latexAfter: "3x = 25 - 7" }),
    equationStep(3, { latexAfter: "3x = 18" }),
  ];

  it("keeps every line written so far, and adds the new one underneath", () => {
    expect(buildBoardItems(lesson, 0).map((item) => item.stepIndex)).toEqual([0]);
    expect(buildBoardItems(lesson, 2).map((item) => item.stepIndex)).toEqual([0, 1, 2]);
    expect(buildBoardItems(lesson, 3).map((item) => item.stepIndex)).toEqual([0, 1, 2, 3]);
  });

  it("marks only the last line as the one being worked on", () => {
    const items = buildBoardItems(lesson, 2);
    expect(items.map((item) => item.isActive)).toEqual([false, false, true]);
  });

  it("gives each line a key that never changes as the lesson moves on", () => {
    const early = buildBoardItems(lesson, 1).map((item) => item.key);
    const later = buildBoardItems(lesson, 3).map((item) => item.key);
    expect(later.slice(0, early.length)).toEqual(early);
  });

  it("builds one column method up in place instead of stacking copies of it", () => {
    const sums = [intro, column(1, 0), column(2, 1), column(3, 2)];
    const items = buildBoardItems(sums, 3);
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({ firstStepIndex: 1, stepIndex: 3, isActive: true });
    // …and its key is the same at every stage, so it is never re-created.
    expect(buildBoardItems(sums, 1)[1].key).toBe(items[1].key);
  });

  it("starts a new drawing for a different block", () => {
    const items = buildBoardItems([intro, column(1, 0, 0), column(2, 0, 1)], 2);
    expect(items).toHaveLength(3);
  });

  it("never runs past the end of the lesson", () => {
    expect(buildBoardItems(lesson, 99)).toHaveLength(lesson.length);
    expect(buildBoardItems([], 0)).toEqual([]);
  });

  it("knows which LaTeX a step writes on its own line", () => {
    expect(equationLineLatex(equationStep(1, { latexBefore: "a = 1", latexAfter: "b = 2" }, true))).toBe("a = 1");
    expect(equationLineLatex(equationStep(2, { latexBefore: "a = 1", latexAfter: "b = 2" }))).toBe("b = 2");
    expect(equationLineLatex(intro)).toBeNull();
  });
});

describe("ids on a board that holds the whole lesson", () => {
  it("removes id wrappers and keeps what they wrapped", () => {
    expect(stripHtmlIds("3x = 25 \\htmlId{arrow-1-to}{- 7}")).toBe("3x = 25 - 7");
    expect(stripHtmlIds("x = \\htmlId{arrow-2-to}{\\frac{18}{3}}")).toBe("x = \\frac{18}{3}");
    expect(stripHtmlIds("\\htmlId{a}{\\htmlId{b}{7}} + 1")).toBe("7 + 1");
    expect(stripHtmlIds("3x + 7 = 25")).toBe("3x + 7 = 25");
  });

  it("leaves malformed input alone rather than guess", () => {
    expect(stripHtmlIds("\\htmlId{broken")).toBe("\\htmlId{broken");
    expect(stripHtmlIds("\\htmlId{a}{unclosed")).toBe("\\htmlId{a}{unclosed");
  });

  it("recognises the same ink under different wrappers", () => {
    expect(sameInk("3x \\htmlId{arrow-1-from}{+ 7} = 25", "3x + 7 = 25")).toBe(true);
    expect(sameInk("3x+7=25", "3x + 7 = 25")).toBe(true);
    expect(sameInk("3x + 7 = 26", "3x + 7 = 25")).toBe(false);
  });

  it("uses the step's own copy of the line above only when it is the same line", () => {
    const moving = equationStep(2, {
      latexBefore: "3x \\htmlId{arrow-1-from}{+ 7} = 25",
      latexAfter: "3x = 25 \\htmlId{arrow-1-to}{- 7}",
      arrows: [{ id: "arrow-1", fromTerm: "+7", toTerm: "-7", label: "" }],
    } as Partial<EquationStep>);
    expect(lineAboveLatex("3x + 7 = 25", moving)).toBe("3x \\htmlId{arrow-1-from}{+ 7} = 25");
    // The model skipped a step: what is written above must not be rewritten.
    expect(lineAboveLatex("6x + 14 = 50", moving)).toBeNull();
    // No arrow, nothing to anchor, nothing to change.
    expect(lineAboveLatex("3x = 25 - 7", equationStep(3, { latexBefore: "3x = 25 - 7", latexAfter: "3x = 18" }))).toBeNull();
  });
});

describe("which term the pen points at", () => {
  // Reading order: the line above, then the line just written.
  const board = ["3", "x", "7", "25", "3", "x", "25", "−7"];

  it("treats a signed term as its value", () => {
    expect(normaliseTermLabel("− 7")).toBe("7");
    expect(normaliseTermLabel("+7")).toBe("7");
    expect(normaliseTermLabel("X")).toBe("x");
    expect(isPointableTerm("25")).toBe(true);
    expect(isPointableTerm("x")).toBe(true);
    expect(isPointableTerm("+")).toBe(false);
    expect(isPointableTerm("=")).toBe(false);
  });

  it("touches the 7 above first, then the 7 just written", () => {
    const narration = "That 7 is in the way so subtract 7 on both sides";
    const words = narration.split(" ");
    expect(spokenTermIndex(board, narration, words.indexOf("7"))).toBe(2);
    expect(spokenTermIndex(board, narration, words.lastIndexOf("7"))).toBe(7);
    // …and stays there until something else is mentioned.
    expect(spokenTermIndex(board, narration, words.length - 1)).toBe(7);
  });

  it("goes to a term when it is said, not before the sentence gets there", () => {
    const narration = "The right side becomes 18";
    expect(spokenTermIndex(["3", "x", "18"], narration, 0)).toBe(2);
    const long = "First let us think carefully about what we are being asked to find here which is 18";
    expect(spokenTermIndex(["3", "x", "18"], long, 0)).toBe(-1);
    expect(spokenTermIndex(["3", "x", "18"], long, long.split(" ").length - 1)).toBe(2);
  });

  it("never points at a term the teacher has not mentioned", () => {
    expect(spokenTermIndex(board, "Now we tidy this up", 2)).toBe(-1);
    expect(termMentions(board, "Now we tidy this up")).toEqual([]);
  });

  it("does not mistake the word 'a' for an unknown", () => {
    expect(spokenTermIndex(["a", "5"], "This is a number", 2)).toBe(-1);
  });

  it("finds a number followed by punctuation", () => {
    expect(spokenTermIndex(["18"], "So it becomes 18.", 3)).toBe(0);
  });

  it("counts words the way the speech clock does, across a dash", () => {
    const narration = "Very well — the 7 moves";
    // "—" is a word to the speech clock; index 4 is "7".
    expect(termMentions(["7"], narration)).toEqual([{ word: 4, term: 0 }]);
  });
});

describe("where the pen is while it writes", () => {
  const glyph = { left: 100, top: 50, width: 20, height: 30 };

  it("crosses each glyph from left to right", () => {
    expect(penPointOnGlyph(glyph, 0).x).toBe(100);
    expect(penPointOnGlyph(glyph, 0.5).x).toBe(110);
    expect(penPointOnGlyph(glyph, 1).x).toBe(120);
    expect(penPointOnGlyph(glyph, 7).x).toBe(120);
    expect(penPointOnGlyph(glyph, -1).x).toBe(100);
  });

  it("moves up and down within the glyph, and never leaves it", () => {
    const heights = [0, 0.25, 0.5, 0.75, 1].map((p) => penPointOnGlyph(glyph, p).y);
    expect(new Set(heights.map((y) => Math.round(y))).size).toBeGreaterThan(1);
    for (const y of heights) {
      expect(y).toBeGreaterThanOrEqual(glyph.top);
      expect(y).toBeLessThanOrEqual(glyph.top + glyph.height);
    }
  });

  it("knows which glyph is being drawn at any moment", () => {
    const element = {} as Element;
    const strokes: PenStroke[] = [
      { element, at: 100, duration: 50 },
      { element, at: 150, duration: 50 },
      { element, at: 400, duration: 50 },
    ];
    expect(strokeAt(strokes, 0)).toBe(-1); // not started
    expect(strokeAt(strokes, 100)).toBe(0);
    expect(strokeAt(strokes, 160)).toBe(1);
    expect(strokeAt(strokes, 300)).toBe(1); // resting between strokes
    expect(strokeAt(strokes, 420)).toBe(2);
    expect(strokeAt(strokes, 500)).toBe(-1); // finished: pen lifted
    expect(strokeAt([], 10)).toBe(-1);
  });

  it("lets only the writer holding the pen lift it", () => {
    const seen: Array<{ x: number; y: number } | null> = [];
    const stop = inkPen.subscribe((point) => seen.push(point));
    const first = Symbol("first");
    const second = Symbol("second");

    inkPen.write(first, { x: 1, y: 1 });
    inkPen.write(second, { x: 2, y: 2 }); // the next segment takes over
    inkPen.lift(first); // the earlier one finishing late must not lift it
    expect(seen).toEqual([{ x: 1, y: 1 }, { x: 2, y: 2 }]);

    inkPen.lift(second);
    expect(seen[seen.length - 1]).toBeNull();
    stop();
    inkPen.write(first, { x: 9, y: 9 });
    expect(seen).toHaveLength(3);
    inkPen.lift(first);
  });
});

describe("pacing", () => {
  it("writes a line of working slowly enough to watch", () => {
    // About a second for a short equation; it used to be a third of that.
    expect(estimateMathWriteMs("3x + 7 = 25")).toBeGreaterThanOrEqual(600);
    expect(estimateMathWriteMs("3x + 7 = 25")).toBeLessThanOrEqual(1500);
  });

  it("allows for the note written beside the line", () => {
    expect(estimateNoteWriteMs("")).toBe(0);
    expect(estimateNoteWriteMs("Subtract 7")).toBeGreaterThan(NOTE_GAP_MS);
    expect(estimateNoteWriteMs("x".repeat(500))).toBeLessThanOrEqual(NOTE_GAP_MS + 2000);
  });
});
