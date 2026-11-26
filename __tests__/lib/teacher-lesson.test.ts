/**
 * From watching whole lessons play at real speed in a browser, with the pen,
 * the voice and the board logged several times a second.
 *
 * Three lessons were watched: a linear equation, Pythagoras, and the area of a
 * trapezium on a phone. Each test is something the recording showed.
 */
import { sayTheSameThing, buildNarrationPlan, sanitizeForTTS } from "@/lib/narration";
import { withoutEmoji } from "@/lib/maths-text";
import { forVoice } from "@/lib/speech-text";
import { spokenTermIndex, termMentions } from "@/lib/spoken-terms";
import { buildTutorSteps } from "@/lib/tutor-steps";
import { pinAnchorsToNarration, normalizedWords } from "@/lib/teacher-pointer";
import type { WhiteboardResponse } from "@/types/whiteboard";

/** The terms on the board in reading order: the line above, then the line being written. */
const board = (...lines: string[][]) => lines.flat();
const penAt = (labels: string[], narration: string, saying: string, nth = 0) => {
  const words = narration.split(/\s+/);
  let seen = -1;
  const word = words.findIndex((w) => w.replace(/[.,!?]/g, "") === saying && ++seen === nth);
  return spokenTermIndex(labels, narration, word);
};

describe("the pen lands on the term being talked about", () => {
  // 5x − 3 = 2x + 9 above; 5x − 2x − 3 = 9 being written.
  const above = ["5", "x", "3", "2", "x", "9"];
  const line = ["5", "x", "2", "x", "3", "9"];
  const labels = board(above, line);

  it("'2 x' is the x written after that 2, not the first x on the board", () => {
    const narration = "Move 2 x to the left by subtracting it from both sides.";
    expect(penAt(labels, narration, "2")).toBe(3);
    // It used to go to index 1, the x of 5x.
    expect(penAt(labels, narration, "x")).toBe(4);
  });

  it("a second '2 x' moves on to the one just written", () => {
    const narration = "Move 2 x to the left. Subtracting 2 x brings all x terms to one side.";
    const mentions = termMentions(labels, narration);
    expect(mentions.slice(0, 4).map((m) => m.term)).toEqual([3, 4, 8, 9]);
  });

  it("'3 x' is the 3 with an x after it, not a lone 3 that comes first", () => {
    // 5x − 2x − 3 = 9 above; 3x − 3 = 9 being written.
    const terms = board(["5", "x", "2", "x", "3", "9"], ["3", "x", "3", "9"]);
    const narration = "5 x minus 2 x simplifies to 3 x.";
    // Index 4 is the lone 3 above; index 6 is the 3 of 3x.
    expect(penAt(terms, narration, "3")).toBe(6);
    expect(penAt(terms, narration, "x", 2)).toBe(7);
  });

  it("a number on its own still goes to its first appearance, then the next", () => {
    const terms = board(["3", "x", "7", "25"], ["3", "x", "25", "7"]);
    const narration = "That 7 is in the way, so subtract 7 from both sides.";
    expect(penAt(terms, narration, "7", 0)).toBe(2);
    expect(penAt(terms, narration, "7", 1)).toBe(7);
  });

  it("the word 'a' is never taken for the unknown", () => {
    expect(termMentions(["a", "b"], "Draw a line to b.").map((m) => m.term)).toEqual([1]);
  });
});

describe("the pen keeps step with the voice on a shape", () => {
  // The pen's stops on a triangle, in the order they are drawn, with the
  // labels the drawing now gives them: a side is found by its name.
  const stops = [
    { label: "AB 6 cm", sequence: 3 },
    { label: "BC 8 cm", sequence: 4 },
    { label: "AC c (hypotenuse)", sequence: 5 },
    { label: "B right angle 90°", sequence: 6 },
  ];
  const narration = sanitizeForTTS(
    "Here's the triangle. AB is 6 cm. BC is 8 cm. AC is c (hypotenuse). There is a right angle at B.",
  );
  const words = normalizedWords(narration);

  it("each side is reached as its name is said", () => {
    const starts = pinAnchorsToNarration(stops, words)!;
    expect(starts).not.toBeNull();
    // The pen is on AB from the start, and moves when the next name is spoken.
    expect(starts[0]).toBe(0);
    expect(words[starts[1]]).toBe("bc");
    expect(words[starts[2]]).toBe("ac");
    expect(["right", "angle", "b"]).toContain(words[starts[3]]);
    // In order: it never goes back.
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });
});

describe("what the teacher says", () => {
  const lesson: WhiteboardResponse = {
    intro: "Let's solve for $x$.",
    blocks: [
      {
        type: "labeled_shape",
        shape: "triangle",
        vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
        sides: [{ from: "A", to: "B", label: "6 cm" }],
      },
    ],
    conclusion: "So $x = 4$.",
    keyTakeaway: "Whatever you move across the equals sign, watch its sign!",
    hint: "Remember, when you move a term across the equals sign, the sign changes.",
    subject: "Maths",
  };

  it("one point made twice at the end is said once", () => {
    expect(sayTheSameThing(lesson.keyTakeaway!, lesson.hint!)).toBe(true);
    const closing = buildNarrationPlan(lesson).filter((cue) => cue.kind === "hint");
    expect(closing).toHaveLength(1);
    expect(closing[0].text).toContain("Whatever you move");
  });

  it("two different points are both kept", () => {
    expect(
      sayTheSameThing("The hypotenuse is always the longest side.", "Square each side before you add."),
    ).toBe(false);
    expect(sayTheSameThing("", "Square each side.")).toBe(false);
  });

  it("the step that draws a shape says what it is drawing", () => {
    const steps = buildTutorSteps(lesson, buildNarrationPlan(lesson));
    expect(steps.find((s) => s.kind === "shape")?.title).toBe("Draw the triangle");
  });

  it("reads a number against a bracket as a multiplication", () => {
    expect(sanitizeForTTS("Check: $5(4) - 3 = 17$")).toBe("Check: 5 times 4 minus 3, equals 17");
    expect(sanitizeForTTS("$2(4) + 9 = 17$")).toBe("2 times 4 plus 9, equals 17");
    // A bracket at the start of a sum is not a multiplication.
    expect(sanitizeForTTS("$(-3) + 5 = 2$")).toBe("minus 3 plus 5, equals 2");
  });

  it("the caption says 'a squared', the voice is given 'A squared'", () => {
    const caption = sanitizeForTTS("For right triangles: $a^2 + b^2 = c^2$.");
    expect(caption.replace(/⁠/g, "")).toBe("For right triangles: a squared plus b squared, equals c squared.");
    expect(forVoice(caption)).toBe("For right triangles: A squared plus b squared, equals c squared.");
    // Same number of words either way, so the highlighted word stays in step.
    expect(caption.split(/\s+/)).toHaveLength(forVoice(caption).split(/\s+/).length);
  });

  it("an answer carries no picture emoji", () => {
    expect(withoutEmoji("So $x = 4$. 🎉 Let's check: $5(4) - 3 = 17$. Perfect!")).toBe(
      "So $x = 4$. Let's check: $5(4) - 3 = 17$. Perfect!",
    );
    // Ticks and maths symbols are not emoji.
    expect(withoutEmoji("17 = 17 ✓ and 3 × 4 ≥ 12")).toBe("17 = 17 ✓ and 3 × 4 ≥ 12");
  });
});
