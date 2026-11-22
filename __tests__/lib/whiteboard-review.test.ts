/**
 * What a review of the whiteboard against the running app turned up.
 *
 * Sixteen typed questions and nine photos were put through the real pipeline
 * and looked at on the board. Each test below is one thing that was wrong, with
 * the data the app actually produced.
 */
import { applyMethodBuilderToWhiteboard } from "@/lib/methods/apply-builder";
import { buildNarrationPlan } from "@/lib/narration";
import { hashQuestion } from "@/lib/question-cache";
import {
  describeShape,
  isHeightMark,
  lShapeFromSixSides,
  quadrilateralPoints,
  shapeHeight,
  tidyShapeBlock,
} from "@/lib/shape-geometry";
import { buildTutorSteps } from "@/lib/tutor-steps";
import { validateResponse, withoutBrokenArrows } from "@/lib/validate";
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

describe("a correct shape answer is not replaced by one of its own sums", () => {
  const trapezium: WhiteboardResponse = {
    intro: "We can find the area of a trapezium using its formula.",
    blocks: [
      steps([
        ["", "\\text{Area} = \\frac{1}{2} \\times (10 + 6) \\times 4"],
        ["\\text{Area} = \\frac{1}{2} \\times (10 + 6) \\times 4", "\\text{Area} = \\frac{1}{2} \\times 16 \\times 4"],
        ["\\text{Area} = \\frac{1}{2} \\times 16 \\times 4", "\\text{Area} = 32"],
      ]),
    ],
    conclusion: "The area of the trapezium is 32 cm².",
    subject: "Maths",
  };
  const question =
    "A trapezium has parallel sides of 6 cm and 10 cm. The distance between them is 4 cm. Work out its area.";

  it("keeps the trapezium working: the pupil was being told the area is 8", () => {
    const shown = applyMethodBuilderToWhiteboard(trapezium, question);
    expect(shown.conclusion).toBe("The area of the trapezium is 32 cm².");
    expect(shown.blocks).toEqual(trapezium.blocks);
  });

  it("keeps the area of a triangle, the other place half-times-something appears", () => {
    const triangle: WhiteboardResponse = {
      intro: "Use half base times height.",
      blocks: [steps([["A = \\frac{1}{2} \\times 12 \\times 8", "A = 48"]])],
      conclusion: "The area of the triangle is $48 \\text{ cm}^2$.",
      subject: "Maths",
    };
    const shown = applyMethodBuilderToWhiteboard(
      triangle,
      "An isosceles triangle has two equal sides of 10 cm and a base of 12 cm. Work out its area.",
    );
    expect(shown.conclusion).toBe(triangle.conclusion);
  });

  it("still uses the built-in method when the question itself is the sum", () => {
    const shown = applyMethodBuilderToWhiteboard(
      { intro: "", blocks: [steps([["\\frac{2}{3} + \\frac{3}{4}", "\\frac{17}{12}"]])], conclusion: "17/12", subject: "Maths" },
      "Work out 2/3 + 3/4",
    );
    expect(JSON.stringify(shown)).toContain("17");
    expect(shown.teachingSteps?.length ?? shown.blocks.length).toBeGreaterThan(0);
  });

  it("does not turn a straight-line graph into a lesson on reading one point", () => {
    const graph: WhiteboardResponse = {
      intro: "Let's draw the graph of $y = 2x - 1$.",
      blocks: [
        {
          type: "coordinate_graph",
          xRange: [-2, 3],
          yRange: [-6, 6],
          plots: [{ equation: "y = 2x - 1", fn: "2*x - 1" }],
          points: [{ point: { x: 0.5, y: 0 }, label: "x-intercept (0.5, 0)" }],
          grid: true,
        } as WhiteboardResponse["blocks"][number],
      ],
      conclusion: "The graph crosses the x-axis at $(0.5, 0)$.",
      subject: "Maths",
    };
    const shown = applyMethodBuilderToWhiteboard(
      graph,
      "Draw the graph of y = 2x - 1 for values of x from -2 to 3. Where does it cross the x-axis?",
    );
    expect(shown.intro).toBe(graph.intro);
    expect(shown.blocks).toEqual(graph.blocks);
  });

  it("answers saved before the fix are not served again", () => {
    // The key carries a version, so a row written under the old key is never found.
    const key = hashQuestion("area of a trapezium", "GCSE", "higher", "AQA");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toBe("0e1f5ba4e4a51d4b8ea6fcd1ec0ee84be32fb9d4b3e1a6ce5b9fd1f5d4b5f0a1");
    expect(hashQuestion("a", "GCSE")).not.toBe(hashQuestion("b", "GCSE"));
  });
});

describe("an answer is not thrown away over an arrow that cannot be drawn", () => {
  const withArrow = (before: string, after: string) =>
    JSON.stringify({
      intro: "Let's find the side.",
      blocks: [
        { type: "labeled_shape", shape: "triangle", vertices: [{ label: "A" }, { label: "B" }, { label: "C" }] },
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "Rearrange",
              explanation: "Multiply both sides by 12.",
              latexBefore: before,
              latexAfter: after,
              arrows: [{ id: "arrow-1", label: "× 12", fromTerm: "12", toTerm: "12", style: "curly" }],
            },
          ],
        },
      ],
      conclusion: "The side is about 6.9 cm.",
      subject: "Maths",
    });

  it("an arrow with no anchors fails the check, as before", () => {
    const result = validateResponse(withArrow("\\sin(35) = \\frac{x}{12}", "x = 12 \\times \\sin(35)"), []);
    expect(result.ok).toBe(false);
    expect(result.data).toBeDefined();
  });

  it("the working is kept and only that arrow is dropped", () => {
    const result = validateResponse(withArrow("\\sin(35) = \\frac{x}{12}", "x = 12 \\times \\sin(35)"), []);
    const kept = withoutBrokenArrows(result.data as WhiteboardResponse);
    const block = kept.blocks[1] as EquationStepBlock;
    expect(block.steps).toHaveLength(1);
    expect(block.steps[0].arrows).toBeUndefined();
    expect(block.steps[0].latexAfter).toBe("x = 12 \\times \\sin(35)");
    expect(kept.blocks[0].type).toBe("labeled_shape");
  });

  it("an arrow that has both anchors is left alone", () => {
    const result = validateResponse(
      withArrow("\\sin(35) = \\frac{x}{\\htmlId{arrow-1-from}{12}}", "x = \\htmlId{arrow-1-to}{12} \\times \\sin(35)"),
      [],
    );
    const kept = withoutBrokenArrows(result.data as WhiteboardResponse);
    expect((kept.blocks[1] as EquationStepBlock).steps[0].arrows).toHaveLength(1);
  });

  it("a triangle with two given angles and one to find is not called wrong", () => {
    const raw = JSON.stringify({
      intro: "Find the missing angle.",
      blocks: [
        {
          type: "labeled_shape",
          shape: "triangle",
          vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
          angles: [
            { vertex: "A", degrees: 50, label: "50°" },
            { vertex: "B", degrees: 60, label: "60°" },
            { vertex: "C", degrees: 0, label: "x" },
          ],
        },
        { type: "equation_steps", steps: [{ stepNumber: 1, operationLabel: "Subtract", explanation: "Take away.", latexBefore: "180 - 110", latexAfter: "70" }] },
      ],
      conclusion: "Angle C is 70°.",
      subject: "Maths",
    });
    expect((validateResponse(raw, []).errors ?? []).join(" ")).not.toMatch(/angles sum/i);
  });
});

describe("shapes are drawn the way the question describes them", () => {
  const trapezium: LabeledShapeBlock = {
    type: "labeled_shape",
    shape: "trapezium",
    vertices: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }],
    sides: [
      { from: "A", to: "B", label: "10 cm" },
      { from: "C", to: "D", label: "6 cm" },
      { from: "A", to: "D", label: "" },
      { from: "B", to: "C", label: "" },
      { from: "A", to: "C", label: "4 cm" },
    ],
    angles: [],
  };

  it("drops sides with nothing written on them", () => {
    expect(tidyShapeBlock(trapezium).sides?.map((s) => s.label)).toEqual(["10 cm", "6 cm", "4 cm"]);
  });

  it("a length across opposite corners is the height, not a side", () => {
    const labels = ["A", "B", "C", "D"];
    expect(isHeightMark({ from: "A", to: "C", label: "4 cm" }, labels)).toBe(true);
    expect(isHeightMark({ from: "B", to: "C", label: "4 cm (height)" }, labels)).toBe(true);
    expect(isHeightMark({ from: "A", to: "B", label: "10 cm" }, labels)).toBe(false);
    expect(shapeHeight(tidyShapeBlock(trapezium))).toEqual({ length: 4, label: "4 cm" });
  });

  it("draws the 10 cm side longer than the 6 cm side, 4 cm apart", () => {
    const [a, b, c, d] = quadrilateralPoints(tidyShapeBlock(trapezium))!;
    expect(b.x - a.x).toBeCloseTo(10);
    expect(c.x - d.x).toBeCloseTo(6);
    expect(c.y - b.y).toBeCloseTo(4);
    // The parallel sides are level.
    expect(a.y).toBe(b.y);
    expect(c.y).toBe(d.y);
  });

  it("draws a rectangle to its sides, but never as a sliver", () => {
    const rectangle = (w: string, h: string): LabeledShapeBlock => ({
      type: "labeled_shape",
      shape: "rectangle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }],
      sides: [
        { from: "A", to: "B", label: w },
        { from: "B", to: "C", label: h },
      ],
    });
    const [, b, c] = quadrilateralPoints(rectangle("12 cm", "5 cm"))!;
    expect(b.x / c.y).toBeCloseTo(12 / 5);
    const [, b2, c2] = quadrilateralPoints(rectangle("100 m", "1 m"))!;
    expect(b2.x / c2.y).toBeCloseTo(4);
    expect(quadrilateralPoints(rectangle("x", "5 cm"))).toBeNull();
  });

  it("an L-shape that arrived as a six-cornered polygon is drawn as an L, not a hexagon", () => {
    const polygon: LabeledShapeBlock = {
      type: "labeled_shape",
      shape: "polygon",
      vertices: ["A", "B", "C", "D", "E", "F"].map((label) => ({ label })),
      sides: [
        { from: "A", to: "B", label: "8 m" },
        { from: "B", to: "C", label: "6 m" },
        { from: "D", to: "E", label: "3 m" },
        { from: "E", to: "F", label: "2 m" },
        { from: "A", to: "F", label: "vertical side" },
        { from: "C", to: "D", label: "horizontal side" },
      ],
    };
    const tidied = tidyShapeBlock(polygon);
    expect(tidied.shape).toBe("rectilinear");
    expect(tidied.rectilinear).toEqual({ width: 8, height: 6, notchWidth: 3, notchHeight: 2, unit: "m" });
    // Doing it twice changes nothing.
    expect(tidyShapeBlock(tidied)).toEqual(tidied);
  });

  it("reads an L-shape exactly when all six sides are given", () => {
    const sixSides = (lengths: number[]): LabeledShapeBlock => ({
      type: "labeled_shape",
      shape: "rectangle",
      vertices: ["A", "B", "C", "D", "E", "F"].map((label) => ({ label })),
      sides: lengths.map((n, i) => ({ from: "ABCDEF"[i], to: "ABCDEF"[(i + 1) % 6], label: `${n} cm` })),
    });
    // 10 across, 8 down, with a 4 by 4 corner missing.
    expect(lShapeFromSixSides(sixSides([10, 4, 4, 4, 6, 8]))).toEqual({ width: 10, height: 8, notchWidth: 4, notchHeight: 4 });
    // 8 across, 6 down, with a piece 3 across and 2 down missing.
    expect(lShapeFromSixSides(sixSides([8, 4, 3, 2, 5, 6]))).toEqual({ width: 8, height: 6, notchWidth: 3, notchHeight: 2 });
    // As misread from a photo: these cannot make an L-shape.
    expect(lShapeFromSixSides(sixSides([10, 4, 4, 6, 8, 8]))).toBeNull();
    expect(tidyShapeBlock(sixSides([10, 4, 4, 4, 6, 8])).shape).toBe("rectilinear");
  });

  it("angles written as side labels become the angles at the corners", () => {
    const fromPhoto: LabeledShapeBlock = {
      type: "labeled_shape",
      shape: "triangle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
      sides: [
        { from: "A", to: "B", label: "70°" },
        { from: "B", to: "C", label: "45°" },
        { from: "A", to: "C", label: "x" },
      ],
    };
    const tidied = tidyShapeBlock(fromPhoto);
    expect(tidied.sides).toEqual([]);
    expect(tidied.angles).toEqual([
      { vertex: "A", degrees: 70, label: "70°" },
      { vertex: "B", degrees: 45, label: "45°" },
      { vertex: "C", degrees: 0, label: "x" },
    ]);
  });

  it("a triangle with real side lengths is left alone", () => {
    const real: LabeledShapeBlock = {
      type: "labeled_shape",
      shape: "triangle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
      sides: [
        { from: "A", to: "B", label: "10 cm" },
        { from: "B", to: "C", label: "12 cm" },
        { from: "A", to: "C", label: "10 cm" },
      ],
    };
    expect(tidyShapeBlock(real)).toBe(real);
  });
});

describe("what the tutor says while a shape is drawn", () => {
  it("is short sentences, with no blank side read out", () => {
    const said = describeShape({
      type: "labeled_shape",
      shape: "triangle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
      sides: [
        { from: "A", to: "B", label: "x" },
        { from: "B", to: "C", label: "12 cm" },
        { from: "A", to: "C", label: "" },
      ],
      angles: [
        { vertex: "A", degrees: 90, label: "90°", isRightAngle: true },
        { vertex: "C", degrees: 35, label: "35°" },
      ],
    });
    expect(said).toBe(
      "Here's the triangle. AB is x. BC is 12 cm. There is a right angle at A. The angle at C is 35°.",
    );
  });

  it("calls a height a height, and an L-shape an L-shape", () => {
    expect(
      describeShape({
        type: "labeled_shape",
        shape: "trapezium",
        vertices: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }],
        sides: [
          { from: "A", to: "B", label: "10 cm" },
          { from: "C", to: "D", label: "6 cm" },
          { from: "A", to: "C", label: "4 cm (height)" },
        ],
      }),
    ).toBe("Here's the trapezium. AB is 10 cm. CD is 6 cm. The height is 4 cm.");

    expect(
      describeShape({
        type: "labeled_shape",
        shape: "rectilinear",
        rectilinear: { width: 8, height: 6, notchWidth: 3, notchHeight: 2, unit: "m" },
      }),
    ).toBe("Here's the L-shape. It is 8 m across and 6 m down. A piece 3 m by 2 m is cut out of one corner.");
  });

  it("reaches the voice with the units said in full", () => {
    const plan = buildNarrationPlan({
      intro: "Let's find the area.",
      blocks: [{ type: "labeled_shape", shape: "circle", circle: { radius: "7 cm", showRadius: true } }],
      conclusion: "Done.",
      subject: "Maths",
    });
    expect(plan.find((cue) => cue.kind === "shape")?.text).toBe("Here's the circle. The radius is 7 centimetres.");
  });
});

describe("the closing lines on the board", () => {
  const data: WhiteboardResponse = {
    intro: "Let's find the hypotenuse.",
    blocks: [steps([["a^2 + b^2 = c^2", "c = 10"]])],
    conclusion: "So the hypotenuse is 10 cm.",
    keyTakeaway: "The hypotenuse is always the longest side.",
    hint: "Square each side before you add.",
    subject: "Maths",
  };

  it("the key idea and the hint are two different lines", () => {
    const closing = buildTutorSteps(data, buildNarrationPlan(data)).filter((s) => s.visual.type === "hint");
    expect(closing.map((s) => s.title)).toEqual(["Key idea", "Watch out"]);
    expect(closing.map((s) => s.explanation)).toEqual([
      "The hypotenuse is always the longest side.",
      "Square each side before you add.",
    ]);
  });

  it("a sentence given as both is said once", () => {
    const same = { ...data, hint: data.keyTakeaway };
    const closing = buildTutorSteps(same, buildNarrationPlan(same)).filter((s) => s.visual.type === "hint");
    expect(closing).toHaveLength(1);
  });
});

describe("checks that are certain", () => {
  const table = (conclusion: string): WhiteboardResponse => ({
    intro: "Let's work out the mean.",
    blocks: [
      {
        type: "table",
        headers: ["Score", "Frequency", "f \\times x"],
        rows: [
          ["1", "3", "3"],
          ["2", "5", "10"],
          ["3", "8", "24"],
          ["4", "4", "16"],
        ],
      },
    ],
    conclusion,
    subject: "Maths",
  });
  const meanCheck = (conclusion: string) =>
    runToolChecks(table(conclusion)).checks.find((c) => c.check === "Mean from the frequency table");

  it("catches a mean that does not match its own table (53 ÷ 20 answered as 2.6)", () => {
    const check = meanCheck("So, the mean score is $2.6$.");
    expect(check?.passed).toBe(false);
    expect(check?.decisive).toBe(true);
    expect(check?.detail).toContain("53 ÷ 20 = 2.65");
  });

  it("passes the right mean, and a mean rounded correctly", () => {
    expect(meanCheck("The mean score is $2.65$.")?.passed).toBe(true);
    expect(meanCheck("The mean score is 2.7 to 1 decimal place.")?.passed).toBe(true);
  });

  it("says nothing about a table that is not being used for a mean", () => {
    expect(meanCheck("The mode is 3.")).toBeUndefined();
  });

  it("catches L-shape side lengths that cannot fit together", () => {
    const lShape = (lengths: number[]): WhiteboardResponse => ({
      intro: "",
      blocks: [
        {
          type: "labeled_shape",
          shape: "rectangle",
          vertices: ["A", "B", "C", "D", "E", "F"].map((label) => ({ label })),
          sides: lengths.map((n, i) => ({ from: "ABCDEF"[i], to: "ABCDEF"[(i + 1) % 6], label: `${n} cm` })),
        },
      ],
      conclusion: "",
      subject: "Maths",
    });
    const check = (lengths: number[]) =>
      runToolChecks(lShape(lengths)).checks.find((c) => c.check === "L-shape sides fit together");
    expect(check([10, 4, 4, 6, 8, 8])).toMatchObject({ passed: false, decisive: true });
    expect(check([10, 4, 4, 4, 6, 8])).toMatchObject({ passed: true });
  });
});
