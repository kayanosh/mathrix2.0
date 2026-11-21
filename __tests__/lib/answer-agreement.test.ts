import {
  compareWithGroundTruth,
  runCasChecks,
  summariseVerification,
} from "@/lib/answer-agreement";
import { getVerificationBadge } from "@/lib/verification-badge";
import type { WhiteboardResponse } from "@/types/whiteboard";

/**
 * "CAS verified" used to be stamped whenever the CAS produced an answer — the
 * displayed answer was never compared with it. These pin the replacement: a
 * check only counts when the two were actually compared, and being unable to
 * read the board is never treated as agreement.
 */
const prose = (conclusion: string): WhiteboardResponse => ({
  intro: "",
  blocks: [{ type: "text", content: "Working." }],
  conclusion,
});

const steps = (finalLine: string, conclusion = ""): WhiteboardResponse => ({
  intro: "",
  blocks: [
    {
      type: "equation_steps",
      steps: [
        {
          stepNumber: 1,
          operationLabel: "Work it through",
          explanation: "",
          latexBefore: "start",
          latexAfter: finalLine,
          arrowDirection: "down",
        },
      ],
    } as WhiteboardResponse["blocks"][number],
  ],
  conclusion,
});

describe("compareWithGroundTruth — a single number", () => {
  it("agrees when the conclusion ends on the right value", () => {
    expect(compareWithGroundTruth(prose("So $6 \\times 7 = 42$."), ["42"])).toBe("agree");
    expect(compareWithGroundTruth(prose("The answer is 34,835."), ["34835"])).toBe("agree");
  });

  it("treats equal values written differently as equal", () => {
    expect(compareWithGroundTruth(prose("The answer is 1.25"), ["5/4"])).toBe("agree");
    expect(compareWithGroundTruth(prose("The answer is $1\\frac{1}{4}$"), ["5/4"])).toBe("agree");
    expect(compareWithGroundTruth(prose("That makes 6 3/4."), ["27/4"])).toBe("agree");
  });

  it("disagrees when the right value is nowhere on the board", () => {
    // The real case: CAS says 34,835, the board solved 403 − 27.
    expect(compareWithGroundTruth(prose("So the answer is 376."), ["34835"])).toBe("disagree");
    expect(compareWithGroundTruth(prose("6 × 7 = 43"), ["42"])).toBe("disagree");
  });

  it("is unsure, not agreeable, when the value appears but not as the answer", () => {
    expect(compareWithGroundTruth(prose("We get 42, which is 6 lots of 7."), ["42"])).toBe("unknown");
  });

  it("is unsure when there is nothing to read", () => {
    expect(compareWithGroundTruth(prose("Great work — well done!"), ["42"])).toBe("unknown");
    expect(compareWithGroundTruth(prose("The answer is 42."), [])).toBe("unknown");
  });

  it("reads the answer field of a column-method block", () => {
    const board: WhiteboardResponse = {
      intro: "",
      blocks: [
        { type: "column_method", answer: "34,835", question: "62,403 − 27,568" } as unknown as WhiteboardResponse["blocks"][number],
      ],
      conclusion: "Nice and tidy.",
    };
    expect(compareWithGroundTruth(board, ["34835"])).toBe("agree");
  });

  it("accepts a correct rounding of an inexact truth, and only that", () => {
    const twoPi = "≈6.283185307179586321";
    expect(compareWithGroundTruth(prose("≈ 6.28"), [twoPi])).toBe("agree");
    expect(compareWithGroundTruth(prose("≈ 6.283"), [twoPi])).toBe("agree");
    expect(compareWithGroundTruth(prose("≈ 6.3"), [twoPi])).toBe("agree");
    expect(compareWithGroundTruth(prose("≈ 6.29"), [twoPi])).not.toBe("agree");
    expect(compareWithGroundTruth(prose("≈ 9.42"), [twoPi])).toBe("disagree");
    // One significant figure is in the right place but too coarse to count.
    expect(compareWithGroundTruth(prose("about 6"), [twoPi])).toBe("unknown");
  });

  it("accepts whole-number rounding of a large inexact value", () => {
    const area = "≈153.938040025900"; // 49π
    expect(compareWithGroundTruth(prose("The area is 154 cm²."), [area])).toBe("agree");
    expect(compareWithGroundTruth(prose("The area is 153.9 cm²."), [area])).toBe("agree");
    expect(compareWithGroundTruth(prose("The area is 314 cm²."), [area])).toBe("disagree");
  });

  it("does not hold an exact form against an inexact truth", () => {
    // "49π" is right; there is simply no decimal on the board to compare.
    expect(compareWithGroundTruth(prose("The area is $49\\pi$ cm²."), ["≈153.938040025900"])).toBe("unknown");
  });

  it("only treats a truth as approximate when it is marked so", () => {
    // A long exact decimal must still be matched exactly.
    expect(compareWithGroundTruth(prose("0.1234567891"), ["0.12345678912"])).toBe("disagree");
  });
});

describe("compareWithGroundTruth — solutions of equations", () => {
  it("agrees on a single solution in the last line of working", () => {
    expect(compareWithGroundTruth(steps("x = 5"), ["x = 5"])).toBe("agree");
    expect(compareWithGroundTruth(steps("x = \\frac{7}{2}"), ["x = 7/2"])).toBe("agree");
    expect(compareWithGroundTruth(steps("x = 3.5"), ["x = 7/2"])).toBe("agree");
  });

  it("disagrees on a wrong solution", () => {
    // The real case: builder mis-read the equation and produced x = -0.25.
    expect(compareWithGroundTruth(steps("x = -0.25"), ["x = 4"])).toBe("disagree");
  });

  it("needs every root, and no extra ones", () => {
    const truth = ["x = -1", "x = 6"];
    expect(compareWithGroundTruth(steps("x = 6 \\text{ or } x = -1"), truth)).toBe("agree");
    expect(compareWithGroundTruth(steps("x = 6", "So $x = 6$ or $x = -1$."), truth)).toBe("agree");
    expect(compareWithGroundTruth(prose("x = 6 or -1"), truth)).toBe("agree");
    expect(compareWithGroundTruth(steps("x = 6"), truth)).toBe("disagree");
    expect(compareWithGroundTruth(steps("x = 6 \\text{ or } x = 1"), truth)).toBe("disagree");
  });

  it("understands ±", () => {
    expect(compareWithGroundTruth(steps("x = \\pm 4"), ["x = 4", "x = -4"])).toBe("agree");
  });

  it("follows a chain to its end and ignores unfinished working", () => {
    expect(compareWithGroundTruth(prose("x = 20 - 15 = 5"), ["x = 5"])).toBe("agree");
    expect(compareWithGroundTruth(prose("We have x = 3 + 2"), ["x = 5"])).toBe("unknown");
  });

  it("handles simultaneous equations", () => {
    const truth = ["x = 3", "y = 1"];
    expect(compareWithGroundTruth(prose("So $x = 3$ and $y = 1$."), truth)).toBe("agree");
    expect(compareWithGroundTruth(prose("So $x = 3$ and $y = 2$."), truth)).toBe("disagree");
    expect(compareWithGroundTruth(prose("So $x = 3$."), truth)).toBe("unknown");
  });

  it("is unsure when no value is stated for the unknown", () => {
    expect(compareWithGroundTruth(prose("And that is the solution."), ["x = 5"])).toBe("unknown");
  });
});

describe("compareWithGroundTruth — expressions", () => {
  it("agrees on equivalent forms", () => {
    expect(compareWithGroundTruth(steps("x^{2} - x - 6"), ["-6-x+x^2"])).toBe("agree");
    expect(compareWithGroundTruth(steps("(x + 2)(x + 3)"), ["(x + 2)(x + 3)"])).toBe("agree");
    expect(compareWithGroundTruth(steps("\\frac{dy}{dx} = 3x^{2} + 2"), ["2+3*x^2"])).toBe("agree");
    expect(compareWithGroundTruth(prose("So the answer is $5x + 4$."), ["4+5*x"])).toBe("agree");
  });

  it("disagrees on a different expression", () => {
    expect(compareWithGroundTruth(steps("x^{2} + x - 6"), ["-6-x+x^2"])).toBe("disagree");
  });

  it("ignores the constant of integration", () => {
    expect(compareWithGroundTruth(steps("x^{2} + C"), ["x^2 + C"])).toBe("agree");
  });

  it("is unsure when the final line cannot be read", () => {
    expect(compareWithGroundTruth(steps("\\text{see above}"), ["-6-x+x^2"])).toBe("unknown");
  });
});

describe("runCasChecks", () => {
  it("earns both checks only when the shown answer really is right", () => {
    const checks = runCasChecks(steps("x = 5", "So $x = 5$."), "Solve 3x + 5 = 20", ["x = 5"]);
    expect(checks).toMatchObject({ agreement: "agree", preCasVerified: true, postCasVerified: true });
    expect(checks.warnings).toEqual([]);
  });

  it("earns neither for a wrong answer, and says why", () => {
    const checks = runCasChecks(steps("x = 4", "So $x = 4$."), "Solve 3x + 5 = 20", ["x = 5"]);
    expect(checks).toMatchObject({ agreement: "disagree", preCasVerified: false, postCasVerified: false });
    expect(checks.warnings.join(" ")).toMatch(/does not match/);
  });

  it("does not grant the pre-check just because a ground truth exists", () => {
    // This is the old behaviour in one line: truth present → "verified".
    const checks = runCasChecks(prose("Well done!"), "Calculate 6 × 7", ["42"]);
    expect(checks.preCasVerified).toBe(false);
    expect(checks.agreement).toBe("unknown");
  });

  it("makes no claim when there is no ground truth", () => {
    const checks = runCasChecks(prose("The area is 15 cm²."), "A rectangle is 5 by 3. Area?", null);
    expect(checks).toMatchObject({ agreement: "unknown", preCasVerified: false, postCasVerified: false });
  });
});

describe("summariseVerification", () => {
  const none = {
    agreement: "unknown" as const,
    preCasVerified: false,
    postCasVerified: false,
    criticVerified: false,
    toolChecksPassed: false,
  };

  it("needs three passing checks for high, two for medium", () => {
    expect(summariseVerification(none)).toEqual({ confidence: "low", agreementCount: 0, casVerified: false });
    expect(summariseVerification({ ...none, criticVerified: true }).confidence).toBe("low");
    expect(
      summariseVerification({ ...none, agreement: "agree", preCasVerified: true, criticVerified: true }),
    ).toEqual({ confidence: "medium", agreementCount: 2, casVerified: true });
    expect(
      summariseVerification({
        ...none,
        agreement: "agree",
        preCasVerified: true,
        postCasVerified: true,
        criticVerified: true,
      }).confidence,
    ).toBe("high");
  });

  it("lets a contradicting CAS overrule everything else", () => {
    const summary = summariseVerification({
      agreement: "disagree",
      preCasVerified: false,
      postCasVerified: true,
      criticVerified: true,
      toolChecksPassed: true,
    });
    expect(summary).toMatchObject({ confidence: "low", casVerified: false });
  });

  it("end to end: a wrong answer the critic approved gets no reassuring badge", () => {
    // Before: CAS solved the question → casVerified → "Independently verified".
    const flags = { ...none, agreement: "disagree" as const, criticVerified: true };
    const summary = summariseVerification(flags);
    const badge = getVerificationBadge({
      casVerified: summary.casVerified,
      verification: { ...flags, confidence: summary.confidence, warnings: [], agreementCount: summary.agreementCount },
    });
    expect(badge?.level).toBe("unverified");
  });

  it("end to end: a right answer the CAS and critic both confirm is verified", () => {
    const flags = { ...none, agreement: "agree" as const, preCasVerified: true, criticVerified: true };
    const summary = summariseVerification(flags);
    const badge = getVerificationBadge({
      casVerified: summary.casVerified,
      verification: { ...flags, confidence: summary.confidence, warnings: [], agreementCount: summary.agreementCount },
    });
    expect(badge?.level).toBe("verified");
  });
});
