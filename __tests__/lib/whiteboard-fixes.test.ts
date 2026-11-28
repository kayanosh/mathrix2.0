/**
 * The second round of fixes from testing the whiteboard against the running
 * app: answers that follow from the drawing, drawings the board could not do,
 * checks that gave false alarms on correct shape answers, and how the result is
 * worded.
 */
import { summariseVerification } from "@/lib/answer-agreement";
import { drawBareMaths } from "@/lib/maths-text";
import { applyMethodBuilderToWhiteboard, finishChatAnswer } from "@/lib/methods/apply-builder";
import { buildMethodForQuestion } from "@/lib/methods";
import { LabeledShapeBlockSchema } from "@/lib/schemas";
import { anglePairOnParallelLines, settleShapeAnswers } from "@/lib/shape-answers";
import { altitudeFoot, describeShape, parallelLinesLayout, triangleHeight } from "@/lib/shape-geometry";
import { runToolChecks } from "@/lib/verification-tools";
import type { EquationStepBlock, LabeledShapeBlock, WhiteboardResponse } from "@/types/whiteboard";

const steps = (lines: Array<[string, string]>): EquationStepBlock => ({
  type: "equation_steps",
  steps: lines.map(([latexBefore, latexAfter], i) => ({
    stepNumber: i + 1,
    operationLabel: `Step ${i + 1}`,
    explanation: "Work it out.",
    latexBefore,
    latexAfter,
    arrowDirection: "simplify" as const,
  })),
});
const quiet = <T,>(run: () => T): T => {
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  try {
    return run();
  } finally {
    log.mockRestore();
  }
};
const checks = (data: WhiteboardResponse) => quiet(() => runToolChecks(data));

describe("the area of an L-shape comes from the L-shape", () => {
  const lShape: LabeledShapeBlock = {
    type: "labeled_shape",
    shape: "rectilinear",
    rectilinear: { width: 10, height: 8, notchWidth: 4, notchHeight: 4, unit: "cm" },
  };
  const question = "Solve this question from the photo";

  it("replaces a wrong area that came with no working (a photo answered 76 for 64)", () => {
    const settled = settleShapeAnswers(
      { intro: "Let's find the area of the L-shaped figure.", blocks: [lShape], conclusion: "The total area is $76 \\text{ cm}^2$.", subject: "Maths" },
      question,
    );
    expect(settled.conclusion).toBe("The area of the shape is 64 cm².");
    const working = settled.blocks.find((b) => b.type === "equation_steps") as EquationStepBlock;
    expect(working.steps.map((s) => s.latexAfter)).toEqual([
      "\\text{Area} = \\text{top} + \\text{bottom}",
      "8 - 4 = 4\\text{ cm}",
      "10 - 4 = 6\\text{ cm}",
      "10 \\times 4 = 40\\text{ cm}^2",
      "6 \\times 4 = 24\\text{ cm}^2",
      "40 + 24 = 64\\text{ cm}^2",
    ]);
    // The drawing is kept, and the working it produced passes its own checks.
    expect(settled.blocks[0]).toEqual(lShape);
    expect(checks(settled).allPassed).toBe(true);
  });

  it("leaves a right answer that shows its working alone", () => {
    const right: WhiteboardResponse = {
      intro: "Find the area.",
      blocks: [lShape, steps([["10 \\times 8 - 4 \\times 4", "64"]])],
      conclusion: "The area is 64 cm².",
      subject: "Maths",
    };
    expect(settleShapeAnswers(right, question)).toEqual(right);
  });

  it("works out a perimeter the same way", () => {
    const settled = settleShapeAnswers(
      { intro: "Find the perimeter of the L-shape.", blocks: [lShape], conclusion: "The perimeter is 30 cm.", subject: "Maths" },
      question,
    );
    expect(settled.conclusion).toBe("The perimeter of the shape is 36 cm.");
  });

  it("turns a six-cornered shape whose sides fit into an L-shape first", () => {
    const sixCorners: LabeledShapeBlock = {
      type: "labeled_shape",
      shape: "polygon",
      vertices: ["A", "B", "C", "D", "E", "F"].map((label) => ({ label })),
      sides: [10, 4, 4, 4, 6, 8].map((n, i) => ({ from: "ABCDEF"[i], to: "ABCDEF"[(i + 1) % 6], label: `${n} cm` })),
    };
    const settled = settleShapeAnswers(
      { intro: "Area of the shape.", blocks: [sixCorners], conclusion: "The area is 72 cm².", subject: "Maths" },
      question,
    );
    expect(settled.conclusion).toBe("The area of the shape is 64 cm².");
  });

  it("leaves a misread shape as it came, so the check can send it back", () => {
    const misread: LabeledShapeBlock = {
      type: "labeled_shape",
      shape: "rectangle",
      vertices: ["A", "B", "C", "D", "E", "F"].map((label) => ({ label })),
      sides: [10, 4, 4, 6, 8, 8].map((n, i) => ({ from: "ABCDEF"[i], to: "ABCDEF"[(i + 1) % 6], label: `${n} cm` })),
    };
    const board: WhiteboardResponse = { intro: "Area.", blocks: [misread], conclusion: "The area is 72 cm².", subject: "Maths" };
    const settled = settleShapeAnswers(board, question);
    expect(settled.blocks[0]).toEqual(misread);
    expect(checks(settled).checks.find((c) => c.check === "L-shape sides fit together")).toMatchObject({
      passed: false,
      decisive: true,
    });
  });

  it("checks an L-shape answer against the drawing", () => {
    const check = (conclusion: string) =>
      checks({ intro: "", blocks: [lShape], conclusion, subject: "Maths" }).checks.find((c) => /L-shape area/.test(c.check));
    expect(check("The area of the shape is 64 cm².")).toMatchObject({ passed: true });
    expect(check("The total area is $76 \\text{ cm}^2$.")).toMatchObject({ passed: false, decisive: true });
  });
});

describe("the right angle is at the corner the answer needs", () => {
  const triangle = (rightAt: string): LabeledShapeBlock => ({
    type: "labeled_shape",
    shape: "triangle",
    vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
    sides: [
      { from: "A", to: "B", label: "5 cm" },
      { from: "B", to: "C", label: "12 cm" },
      { from: "A", to: "C", label: "x" },
    ],
    angles: [{ vertex: rightAt, degrees: 90, label: "90°", isRightAngle: true }],
  });
  const board = (rightAt: string, conclusion: string): WhiteboardResponse => ({
    intro: "Use Pythagoras.",
    blocks: [triangle(rightAt), steps([["5^2 + 12^2 = x^2", "169 = x^2"]])],
    conclusion,
    subject: "Maths",
  });
  const rightAngle = (data: WhiteboardResponse) => (data.blocks[0] as LabeledShapeBlock).angles?.[0].vertex;

  it("moves it opposite the side being found when that side is the longest", () => {
    // Drawn with the right angle at A, which makes the 12 cm side the longest.
    expect(rightAngle(settleShapeAnswers(board("A", "So x = 13 cm."), "photo"))).toBe("B");
  });

  it("leaves it where it is when the drawing already agrees", () => {
    const right = board("B", "So x = 13 cm.");
    expect(settleShapeAnswers(right, "photo")).toEqual(right);
  });

  it("moves it opposite the known longest side when a short side is being found", () => {
    const short: WhiteboardResponse = {
      intro: "Use Pythagoras.",
      blocks: [
        {
          type: "labeled_shape",
          shape: "triangle",
          vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
          sides: [
            { from: "A", to: "B", label: "13 cm" },
            { from: "B", to: "C", label: "5 cm" },
            { from: "A", to: "C", label: "x" },
          ],
          angles: [{ vertex: "B", degrees: 90, label: "90°", isRightAngle: true }],
        },
      ],
      conclusion: "So x = 12 cm.",
      subject: "Maths",
    };
    // 13 is the longest side, so the right angle faces AB: it is at C.
    expect(rightAngle(settleShapeAnswers(short, "photo"))).toBe("C");
  });
});

describe("drawings the board could not do", () => {
  it("accepts an L-shape, a caption and parallel lines from the model", () => {
    const lShape = LabeledShapeBlockSchema.safeParse({
      type: "labeled_shape",
      shape: "rectilinear",
      rectilinear: { width: 10, height: 8, notchWidth: 4, notchHeight: 4, unit: "cm" },
      caption: "Not drawn accurately",
    });
    expect(lShape.success).toBe(true);
    // The data used to be removed on the way through, leaving a shape that could not be drawn.
    expect(lShape.success && lShape.data.rectilinear).toMatchObject({ width: 10, notchHeight: 4 });
    expect(lShape.success && lShape.data.caption).toBe("Not drawn accurately");

    const parallel = LabeledShapeBlockSchema.safeParse({
      type: "labeled_shape",
      shape: "parallel_lines",
      parallel: { lines: ["AB", "CD"], angles: [{ at: "top", corner: "below-left", label: "65°" }] },
    });
    expect(parallel.success).toBe(true);
  });

  it("leans the crossing line to the angle given, so equal angles look equal", () => {
    const layout = parallelLinesLayout({
      lines: ["AB", "CD"],
      angles: [
        { at: "top", corner: "below-left", label: "65°" },
        { at: "bottom", corner: "above-right", label: "x" },
      ],
    });
    expect(layout.lean).toBe(65);
    // The two parallel lines are level and the crossing line goes through both.
    expect(layout.lines[0].y).toBeLessThan(layout.lines[1].y);
    expect(layout.top.y).toBe(layout.lines[0].y);
    expect(layout.bottom.y).toBe(layout.lines[1].y);
    expect(layout.top.x).toBeGreaterThan(layout.bottom.x);
    // Alternate angles: one below the top line on the left, one above the bottom line on the right.
    const [given, asked] = layout.arcs;
    expect(given.labelAt.y).toBeGreaterThan(layout.top.y);
    expect(given.labelAt.x).toBeLessThan(layout.top.x);
    expect(asked.labelAt.y).toBeLessThan(layout.bottom.y);
    expect(asked.labelAt.x).toBeGreaterThan(layout.bottom.x);
  });

  it("reads the lean from an angle on the wide side too, and keeps it on the board", () => {
    expect(parallelLinesLayout({ angles: [{ at: "top", corner: "above-left", label: "115°" }] }).lean).toBe(65);
    expect(parallelLinesLayout({ angles: [{ at: "top", corner: "above-right", label: "5°" }] }).lean).toBe(30);
    expect(parallelLinesLayout({ angles: [{ at: "top", corner: "above-right", label: "x" }] }).lean).toBe(60);
  });

  it("says what the parallel-lines drawing shows", () => {
    expect(
      describeShape({
        type: "labeled_shape",
        shape: "parallel_lines",
        parallel: { lines: ["AB", "CD"], angles: [{ at: "top", corner: "below-left", label: "65°" }] },
      }),
    ).toBe("Here are two parallel lines, AB and CD, with a line crossing them. At the top crossing, one angle is 65°.");
  });

  it("finds where a triangle's height lands", () => {
    const isosceles: LabeledShapeBlock = {
      type: "labeled_shape",
      shape: "triangle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
      sides: [
        { from: "A", to: "B", label: "10 cm" },
        { from: "B", to: "C", label: "12 cm" },
        { from: "A", to: "C", label: "10 cm" },
        { from: "A", to: "BC", label: "8 cm (height)" },
      ],
    };
    expect(triangleHeight(isosceles)).toEqual({ apex: 0, label: "8 cm" });
    // Apex above the middle of a 12-wide base: the height lands in the middle.
    const foot = altitudeFoot([{ x: 6, y: 0 }, { x: 0, y: 8 }, { x: 12, y: 8 }], 0);
    expect(foot.x).toBeCloseTo(6);
    expect(foot.y).toBeCloseTo(8);
    // A triangle that leans past its base: the height lands outside it, on the same line.
    const leaning = altitudeFoot([{ x: 15, y: 0 }, { x: 0, y: 8 }, { x: 12, y: 8 }], 0);
    expect(leaning.x).toBeCloseTo(15);
    expect(leaning.y).toBeCloseTo(8);
    expect(triangleHeight({ ...isosceles, sides: isosceles.sides?.slice(0, 3) })).toBeNull();
  });
});

describe("checks on correct shape working", () => {
  const board = (lines: Array<[string, string]>, extra: Partial<WhiteboardResponse> = {}): WhiteboardResponse => ({
    intro: "",
    blocks: [steps(lines)],
    conclusion: "",
    subject: "Maths",
    ...extra,
  });

  it("passes formula working: each line keeps its value", () => {
    const report = checks(
      board([
        ["\\text{Area} = \\frac{1}{2} \\times (10 + 6) \\times 4", "\\text{Area} = \\frac{1}{2} \\times 16 \\times 4"],
        ["\\text{Area} = \\frac{1}{2} \\times 16 \\times 4", "\\text{Area} = 32"],
      ]),
    );
    expect(report.ran).toBe(true);
    expect(report.allPassed).toBe(true);
    expect(report.total).toBe(2);
  });

  it("catches a slip in formula working", () => {
    const report = checks(board([["A = \\frac{1}{2} \\times 12 \\times 8", "A = 46"]]));
    expect(report.allPassed).toBe(false);
    expect(report.checks[0].detail).toContain("worth 48");
  });

  it("reads a rounded line, a plain sum and the sine of an angle in degrees", () => {
    expect(checks(board([["A = 3.14159 \\times 49", "A \\approx 153.9"]])).allPassed).toBe(true);
    expect(checks(board([["80 - 12", "68"]])).allPassed).toBe(true);
    expect(checks(board([["x = 12 \\cdot \\sin(35^{\\circ})", "x \\approx 6.9"]])).allPassed).toBe(true);
    expect(checks(board([["x = 12 \\cdot \\sin(35^{\\circ})", "x \\approx 7.4"]])).allPassed).toBe(false);
  });

  it("reads a fraction inside a highlight wrapper (18 ÷ 3 was read as 18)", () => {
    const report = checks(board([["x = \\htmlId{arrow-2-to}{\\frac{18}{3}}", "x = \\htmlId{mark-1}{6}"]]));
    expect(report.checks.find((c) => /keeps its value/.test(c.check))?.passed).toBe(true);
  });

  it("does not read 40 cm² as 40 squared, or a word as zero", () => {
    const report = checks(
      board([
        ["10 \\times 4", "10 \\times 4 = 40\\text{ cm}^2"],
        ["\\text{Area of cut-out}", "\\text{Area of cut-out} = 3 \\times 2"],
      ]),
    );
    expect(report.checks.filter((c) => !c.passed)).toEqual([]);
  });

  it("does not fail a triangle for an angle still to be found", () => {
    const report = checks({
      intro: "",
      blocks: [
        {
          type: "labeled_shape",
          shape: "triangle",
          vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
          angles: [
            { vertex: "A", degrees: 70, label: "70°" },
            { vertex: "B", degrees: 45, label: "45°" },
            { vertex: "C", degrees: 0, label: "x" },
          ],
        },
      ],
      conclusion: "x = 65°",
      subject: "Maths",
    });
    expect(report.checks.filter((c) => !c.passed)).toEqual([]);
  });

  it("does not test Pythagoras on a triangle whose only right angle is where its height lands", () => {
    const report = checks({
      intro: "",
      blocks: [
        {
          type: "labeled_shape",
          shape: "triangle",
          vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
          sides: [
            { from: "A", to: "B", label: "10 cm" },
            { from: "B", to: "C", label: "12 cm" },
            { from: "A", to: "C", label: "10 cm" },
          ],
          angles: [{ vertex: "D", degrees: 90, label: "90°", isRightAngle: true }],
        },
      ],
      conclusion: "",
      subject: "Maths",
    });
    expect(report.checks.filter((c) => /Pythagoras/.test(c.check))).toEqual([]);
  });

  it("still tests Pythagoras where the right angle is a real corner", () => {
    const report = checks({
      intro: "",
      blocks: [
        {
          type: "labeled_shape",
          shape: "triangle",
          vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
          sides: [
            { from: "A", to: "B", label: "6 cm" },
            { from: "B", to: "C", label: "8 cm" },
            { from: "A", to: "C", label: "11 cm" },
          ],
          angles: [{ vertex: "B", degrees: 90, label: "90°", isRightAngle: true }],
        },
      ],
      conclusion: "",
      subject: "Maths",
    });
    expect(report.checks.find((c) => /Pythagoras/.test(c.check))?.passed).toBe(false);
  });
});

describe("how sure the badge is", () => {
  const none = {
    agreement: "unknown" as const,
    preCasVerified: false,
    postCasVerified: false,
    criticVerified: false,
    toolChecksPassed: false,
  };

  it("a review by the same model plus exact arithmetic is medium, not high", () => {
    expect(summariseVerification({ ...none, criticVerified: true, toolChecksPassed: true }).confidence).toBe("medium");
    expect(summariseVerification({ ...none, criticVerified: true, toolChecksPassed: true, crossModel: false }).confidence).toBe("medium");
  });

  it("a review by a different model plus exact arithmetic is high", () => {
    expect(summariseVerification({ ...none, criticVerified: true, toolChecksPassed: true, crossModel: true }).confidence).toBe("high");
  });

  it("a different model alone, or arithmetic alone, is still low", () => {
    expect(summariseVerification({ ...none, criticVerified: true, crossModel: true }).confidence).toBe("low");
    expect(summariseVerification({ ...none, toolChecksPassed: true, crossModel: true }).confidence).toBe("low");
  });

  it("an answer the algebra engine contradicts is low whoever agreed with it", () => {
    expect(
      summariseVerification({ ...none, agreement: "disagree", criticVerified: true, toolChecksPassed: true, crossModel: true }).confidence,
    ).toBe("low");
  });
});

describe("how the answer is worded", () => {
  it("draws a fraction, and gives a mixed number when one is asked for", () => {
    expect(finishChatAnswer("Work out 2/3 + 3/4", "17/12")).toBe("The answer is $\\frac{17}{12}$.");
    expect(finishChatAnswer("Work out 2/3 + 3/4. Give your answer as a mixed number.", "17/12")).toBe(
      "The answer is $\\frac{17}{12} = 1\\frac{5}{12}$.",
    );
    // Nothing to convert: a proper fraction, a whole number of them.
    expect(finishChatAnswer("Give your answer as a mixed number.", "5/12")).toBe("The answer is $\\frac{5}{12}$.");
    expect(finishChatAnswer("Give your answer as a mixed number.", "12/4")).toBe("The answer is $\\frac{12}{4}$.");
  });

  it("says a bare answer as a sentence, with the maths drawn", () => {
    // These were shown, and read out, exactly as the method left them:
    // "x = 3, x = 2" and "2/3 + 3/4 = 17/12".
    expect(finishChatAnswer("Solve 3x + 7 = 25", "x = 6")).toBe("So $x = 6$.");
    expect(finishChatAnswer("Solve x^2 - 5x + 6 = 0", "x = 3, x = 2")).toBe("So $x = 3$ or $x = 2$.");
    expect(finishChatAnswer("Work out 2/3 + 3/4", "2/3 + 3/4 = 17/12")).toBe(
      "So $\\frac{2}{3} + \\frac{3}{4} = \\frac{17}{12}$.",
    );
    expect(finishChatAnswer("Work out 23 × 47", "23 × 47 = 1081")).toBe("So $23 \\times 47 = 1081$.");
    expect(finishChatAnswer("Find angle C", "70°")).toBe("The answer is $70^{\\circ}$.");
  });

  it("leaves an answer that is already a sentence as it is", () => {
    expect(finishChatAnswer("Area?", "The area is 32 cm².")).toBe("The area is 32 cm².");
    expect(finishChatAnswer("Solve", "So $x = 4$.")).toBe("So $x = 4$.");
  });

  it("reaches the board through the built-in fraction method", () => {
    const shown = applyMethodBuilderToWhiteboard(
      { intro: "", blocks: [], conclusion: "", subject: "Maths" },
      "Work out 2/3 + 3/4. Give your answer as a mixed number.",
    );
    expect(shown.conclusion).toBe("The answer is $\\frac{17}{12} = 1\\frac{5}{12}$.");
  });

  it("gives a cuboid's volume in the unit the question used", () => {
    const built = buildMethodForQuestion("A cuboid is 5 cm long, 4 cm wide and 3 cm high. Work out its volume.", null);
    expect(built?.builderId).toBe("cuboid_volume");
    expect(built?.conclusion).toBe("The cuboid holds 60 cm cubes, so its volume is 60 cm³.");
    // No unit given: the old wording, which is right for counting cubes.
    const cubes = buildMethodForQuestion("A cuboid is 5 cubes long, 4 cubes wide and 3 cubes high. What is its volume?", null);
    if (cubes?.builderId === "cuboid_volume") expect(cubes.conclusion).toContain("cubic units");
  });

  it("draws a fraction left bare in the closing line of an answer", () => {
    const sent = drawBareMaths({
      whiteboard: { intro: "Two counters.", conclusion: "The probability that both are red is \\frac{3}{28}." },
      response: { conclusion: "3/28" },
      category: "probability",
    });
    expect(sent.whiteboard.conclusion).toBe("The probability that both are red is $\\frac{3}{28}$.");
    expect(sent.category).toBe("probability");
    // Anything that is not an answer goes through untouched.
    const other = { error: "anon_limit_reached" };
    expect(drawBareMaths(other)).toBe(other);
  });
});

describe("the name of an angle pair comes from the drawing", () => {
  type Corner = "above-left" | "above-right" | "below-left" | "below-right";
  const lines = (a: ["top" | "bottom", Corner], b: ["top" | "bottom", Corner]): LabeledShapeBlock => ({
    type: "labeled_shape",
    shape: "parallel_lines",
    parallel: {
      angles: [
        { at: a[0], corner: a[1], label: "65°" },
        { at: b[0], corner: b[1], label: "x" },
      ],
    },
  });

  it("names each pair by where the two angles sit", () => {
    expect(anglePairOnParallelLines(lines(["top", "below-left"], ["bottom", "above-right"]))).toBe("alternate");
    expect(anglePairOnParallelLines(lines(["top", "below-right"], ["bottom", "above-left"]))).toBe("alternate");
    expect(anglePairOnParallelLines(lines(["top", "above-right"], ["bottom", "above-right"]))).toBe("corresponding");
    expect(anglePairOnParallelLines(lines(["top", "below-left"], ["bottom", "above-left"]))).toBe("co-interior");
    expect(anglePairOnParallelLines(lines(["top", "above-left"], ["top", "below-right"]))).toBe("vertically opposite");
    // Two angles on a straight line have no pair name.
    expect(anglePairOnParallelLines(lines(["top", "above-left"], ["top", "above-right"]))).toBeNull();
  });

  it("corrects the reason given (the same photo was called alternate, then corresponding)", () => {
    const board: WhiteboardResponse = {
      intro: "Let's find angle $x$ where lines $AB$ and $CD$ are parallel.",
      blocks: [
        lines(["top", "below-left"], ["bottom", "above-right"]),
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "Use corresponding angles",
              explanation: "Corresponding angles are equal when lines are parallel.",
              latexBefore: "x",
              latexAfter: "x = 65^{\\circ}",
              arrowDirection: "simplify",
            },
          ],
        },
      ],
      conclusion: "So, angle $x = 65^{\\circ}$. This is because corresponding angles are equal.",
      subject: "Maths",
    };
    const settled = settleShapeAnswers(board, "photo");
    expect(settled.conclusion).toBe("So, angle $x = 65^{\\circ}$. This is because alternate angles are equal.");
    const step = (settled.blocks[1] as EquationStepBlock).steps[0];
    expect(step.operationLabel).toBe("Use alternate angles");
    expect(step.explanation).toBe("Alternate angles are equal when lines are parallel.");
    // The maths and the drawing are untouched.
    expect(step.latexAfter).toBe("x = 65^{\\circ}");
    expect(settled.blocks[0]).toEqual(board.blocks[0]);
  });

  it("leaves a reason that is already right alone", () => {
    const board: WhiteboardResponse = {
      intro: "",
      blocks: [lines(["top", "below-left"], ["bottom", "above-right"])],
      conclusion: "x = 65° because alternate angles are equal.",
      subject: "Maths",
    };
    expect(settleShapeAnswers(board, "photo")).toEqual(board);
  });
});
