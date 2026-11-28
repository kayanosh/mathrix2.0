import { runToolChecks, verifyArithmetic, verifySubstitution } from "@/lib/verification-tools";
import { answerSentence, applyMethodBuilderToWhiteboard } from "@/lib/methods/apply-builder";
import type { WhiteboardResponse } from "@/types/whiteboard";

/**
 * Both faults here were found by asking the live site "Solve 3x + 7 = 25".
 * The answer was right (x = 6) and three checks passed, but:
 *
 *   - the fourth check reported "Step 1: 3*x+7 = 25 — 3 ≠ 25" and failed, as it
 *     did for every line of every equation, because parseFloat("3*x+7") is 3;
 *   - the answer card read "Solve 3x + 7 = 25 = x = 6".
 *
 * The board below is the one the live site produced.
 */
const board = (lines: string[], conclusion = ""): WhiteboardResponse => ({
  intro: "",
  blocks: [
    {
      type: "equation_steps",
      steps: lines.map((latexAfter, index) => ({
        stepNumber: index + 1,
        operationLabel: "",
        explanation: "",
        latexBefore: index === 0 ? latexAfter : lines[index - 1],
        latexAfter,
        arrowDirection: "down",
      })),
    } as WhiteboardResponse["blocks"][number],
  ],
  conclusion,
});

const LIVE_BOARD = [
  "3x + 7 = 25",
  "3x = 25 \\htmlId{arrow-1-to}{- 7}",
  "3x = 18",
  "x = \\htmlId{arrow-2-to}{\\frac{18}{3}}",
  "x = \\htmlId{mark-1}{6}",
];

describe("tool checks on an equation's working", () => {
  it("passes the working the live site showed for 3x + 7 = 25", () => {
    const report = runToolChecks(board(LIVE_BOARD));
    expect(report.ran).toBe(true);
    expect(report.allPassed).toBe(true);
    // One check per line of working before the answer, plus one for each step
    // that only works a number out (25 − 7 to 18, and 18 ÷ 3 to 6).
    expect(report.total).toBe(6);
    expect(report.checks.every((check) => !/≠/.test(check.detail))).toBe(true);
  });

  it("never reads the leading digits of an expression as its value", () => {
    // The old behaviour, exactly: "3*x+7 = 25 — 3 ≠ 25".
    const report = runToolChecks(board(["3x + 7 = 25", "x = 6"]));
    expect(report.checks.some((check) => check.detail.includes("3 ≠ 25"))).toBe(false);
    expect(report.allPassed).toBe(true);
  });

  it("catches a slip in the middle of the working", () => {
    const report = runToolChecks(board(["3x + 7 = 25", "3x = 19", "x = 6"]));
    expect(report.ran).toBe(true);
    expect(report.allPassed).toBe(false);
    const failed = report.checks.filter((check) => !check.passed);
    expect(failed).toHaveLength(1);
    expect(failed[0].check).toMatch(/Step 2/);
  });

  it("catches working that is consistent with itself but ends on the wrong value", () => {
    const report = runToolChecks(board(["3x + 7 = 25", "3x = 18", "x = 5"]));
    expect(report.allPassed).toBe(false);
  });

  it("lets a quadratic split into one branch per root", () => {
    const report = runToolChecks(
      board([
        "x^{2} - 5x - 6 = 0",
        "(x - 6)(x + 1) = 0",
        "x - 6 = 0",
        "x = 6 \\text{ or } x = -1",
      ]),
    );
    expect(report.ran).toBe(true);
    expect(report.allPassed).toBe(true);
  });

  it("catches a wrong factorisation", () => {
    const report = runToolChecks(
      board(["x^{2} - 5x - 6 = 0", "(x - 2)(x - 3) = 0", "x = 6 \\text{ or } x = -1"]),
    );
    expect(report.allPassed).toBe(false);
  });

  it("handles fractions exactly", () => {
    const report = runToolChecks(board(["\\frac{x}{3} + 2 = 5", "\\frac{x}{3} = 3", "x = 9"]));
    expect(report.allPassed).toBe(true);
    expect(report.total).toBe(2);
  });

  it("still checks purely numeric lines", () => {
    expect(runToolChecks(board(["25 - 7 = 18"])).allPassed).toBe(true);
    const wrong = runToolChecks(board(["25 - 7 = 19"]));
    expect(wrong.ran).toBe(true);
    expect(wrong.allPassed).toBe(false);
  });

  it("makes no claim about working it cannot read", () => {
    // Two unknowns, or a final line that states no value: nothing is checked,
    // and "nothing checked" must not read as "passed".
    expect(runToolChecks(board(["2x + y = 7", "y = 7 - 2x"])).ran).toBe(false);
    expect(runToolChecks(board(["3x + 7 = 25", "\\text{so we are done}"])).ran).toBe(false);
  });

  it("refuses to treat an unreduced expression as a number elsewhere too", () => {
    expect(verifyArithmetic("3x + 7", "25").passed).toBe(false);
    expect(verifyArithmetic("3 \\times 6 + 7", "25").passed).toBe(true);
    expect(verifySubstitution("3x + 7 = 25", "x", "6").passed).toBe(true);
    expect(verifySubstitution("3x + 7 = 25", "x", "5").passed).toBe(false);
    expect(verifySubstitution("3x + y = 25", "x", "6").passed).toBe(false);
  });
});

describe("the sentence in the answer card", () => {
  it("is just the answer when the question is an instruction or an equation", () => {
    expect(answerSentence("Solve 3x + 7 = 25", "x = 6")).toBe("x = 6");
    expect(answerSentence("What are the coordinates of point $P$?", "(3, 4)")).toBe("(3, 4)");
    expect(answerSentence("Convert 1/4 kg to g", "250 g")).toBe("250 g");
    expect(answerSentence("Find the area of a rectangle 5 cm by 3 cm", "15 cm²")).toBe("15 cm²");
  });

  it("keeps 'sum = answer' for a bare sum", () => {
    expect(answerSentence("23 × 47", "1081")).toBe("23 × 47 = 1081");
    expect(answerSentence("Calculate 3/4 + 1/2.", "1 1/4")).toBe("3/4 + 1/2 = 1 1/4");
    expect(answerSentence("What is $\\frac{3}{4} \\times 8$?", "6")).toBe("$\\frac{3}{4} \\times 8$ = 6");
    expect(answerSentence("Simplify 3x + 2x", "5x")).toBe("3x + 2x = 5x");
  });

  it("never writes two equals signs", () => {
    for (const [question, answer] of [
      ["Solve 3x + 7 = 25", "x = 6"],
      ["2x + 4 = 10", "x = 3"],
      ["Work out 6 × 7", "6 × 7 = 42"],
    ]) {
      expect((answerSentence(question, answer).match(/=/g) || []).length).toBeLessThanOrEqual(1);
    }
  });

  it("is empty when there is no answer to state", () => {
    expect(answerSentence("Solve 3x + 7 = 25", "  ")).toBe("");
  });

  it("is what the linear builder puts on the board", () => {
    const result = applyMethodBuilderToWhiteboard(
      { intro: "", blocks: [], conclusion: "" },
      "Solve 3x + 7 = 25",
    );
    expect(result.conclusion).toBe("So $x = 6$.");
  });
});
