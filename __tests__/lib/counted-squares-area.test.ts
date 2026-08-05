/**
 * DEF-024 regression. `parseIrregularArea` matched any question containing
 * "area" + "estimate" and returned a HARDCODED canonical L-shape (9x7 with a
 * 4x3 notch = 51). For questions that state their own counts — "11 whole
 * squares and 6 half-squares" — that constant was wrong, and because the
 * harden path overwrites the stored answer with the builder's, an entire
 * skill was served "51 cm²" for every question regardless of its numbers,
 * replacing the model's *correct* answers. Same inversion as DEF-008: the
 * safety net overwrote good content with bad.
 */
import { buildMethodForQuestion } from "@/lib/methods";
import {
  parseIrregularArea,
  parseCountedSquares,
  buildCountedSquares,
} from "@/lib/methods/irregular-area";

describe("counted-squares area (DEF-024)", () => {
  it("reads the question's own whole/half square counts", () => {
    for (const [q, expected] of [
      ["A shape covers $11$ whole squares and $6$ half-squares. What is its estimated area?", "14 cm²"],
      ["A shape covers $7$ whole squares and $6$ edge parts that are about half a square each. Estimate its area.", "10 cm²"],
      ["A shape covers $12$ whole squares and $2$ edge parts that are about half a square each. Estimate its area.", "13 cm²"],
      ["An irregular shape covers $10$ whole squares and $4$ edge parts that are about half a square each. Estimate its area.", "12 cm²"],
      ["A shape covers $6$ whole squares and $10$ edge parts that are about half a square each. Estimate its area.", "11 cm²"],
    ] as [string, string][]) {
      const built = buildMethodForQuestion(q);
      expect(built?.builderId).toBe("counted_squares_area");
      expect(built?.answer).toBe(expected);
    }
  });

  it("never returns the canonical 51 for a question that states its own counts", () => {
    // The specific live failure: every item in the skill was answered 51 cm².
    const questions = [
      "A shape covers $11$ whole squares and $6$ half-squares. What is its estimated area?",
      "A shape covers $9$ whole squares and $8$ edge parts that are about half a square each. Estimate its area.",
      "A shape covers $15$ whole squares and $4$ edge parts that are about half a square each. Estimate its area.",
    ];
    for (const q of questions) {
      expect(parseIrregularArea(q)).toBeNull();
      expect(buildMethodForQuestion(q)?.answer).not.toBe("51 cm²");
    }
  });

  it("still uses the canonical L-shape when the question states no counts of its own", () => {
    // The case the canonical fallback was legitimately written for: no
    // dimensions or counts in the text, so the drawn shape and the answer come
    // from the same four numbers and cannot disagree.
    const q = "Estimate the area of the irregular shape on a 1 cm × 1 cm square grid.";
    expect(parseIrregularArea(q)).not.toBeNull();
    const built = buildMethodForQuestion(q);
    expect(built?.builderId).toBe("irregular_area_estimate");
    expect(built?.answer).toBe("51 cm²");
  });

  it("handles an odd number of half-squares without rounding it away", () => {
    expect(buildCountedSquares({ whole: 8, halves: 3, unit: "cm" }).answer).toBe("9.5 cm²");
  });

  it("declines when only one of the two counts is present", () => {
    // Half the information is not enough to compute an estimate; better to
    // leave the answer alone than to invent one.
    expect(parseCountedSquares("A shape covers 11 whole squares. Estimate its area.")).toBeNull();
    expect(parseCountedSquares("A shape covers 6 half-squares. Estimate its area.")).toBeNull();
  });

  it("teaches the whole + halves/2 method, not a bare answer", () => {
    const built = buildCountedSquares({ whole: 11, halves: 6, unit: "cm" });
    expect(built.teachingSteps).toHaveLength(3);
    expect(built.teachingSteps.map((s) => s.title)).toEqual([
      "Count the whole squares",
      "Pair up the part squares",
      "Add the two totals",
    ]);
    expect(built.teachingSteps.every((s) => Boolean(s.why))).toBe(true);
    // The working must show the real numbers from the question.
    expect(built.teachingSteps[1].explanation).toContain("6 ÷ 2 = 3");
    expect(built.teachingSteps[2].explanation).toContain("11 + 3 = 14");
  });
});
