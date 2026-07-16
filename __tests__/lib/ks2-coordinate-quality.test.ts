import { buildMethodForQuestion } from "@/lib/methods";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import {
  auditKS2MathsPracticeAnswers,
  hardenKS2MathsPracticeAnswers,
  mathsAnswersEquivalent,
} from "@/lib/ks2-maths-accuracy";

describe("KS2 coordinate accuracy", () => {
  it.each([
    ["Which quadrant contains the point (3, -4)?", "Quadrant IV"],
    ["Which quadrant contains the point (-1, -4)?", "Quadrant III"],
    ["Point A is 2 squares right and 4 squares up. Write its coordinates.", "(2,4)"],
    ["Point B is 5 squares left and 1 square down. Write its coordinates.", "(-5,-1)"],
    ["Translate (2, -1) by the vector (-3, 4).", "(-1,3)"],
    ["Reflect (3, -2) in the y-axis.", "(-3,-2)"],
    ["Which coordinate is in Quadrant 4: (-2,5) or (2,-5)?", "(2,-5)"],
    ["A point moves from (2,3) to (6,1). Write the translation vector.", "(4,-2)"],
  ])("solves %s", (question, answer) => {
    const built = buildMethodForQuestion(question);
    expect(built?.builderId).toBe("coordinate_plot");
    expect(built?.answer).toBe(answer);
    expect(built?.block.type).toBe("coordinate_graph");
    expect(built?.teachingSteps).toHaveLength(3);
  });

  it("translates every triangle vertex using a LaTeX column vector", () => {
    const built = buildMethodForQuestion(
      "Triangle ABC has vertices A(1,2), B(3,2) and C(2,4). Translate it by \\begin{pmatrix}3\\\\-2\\end{pmatrix}.",
    );
    expect(built?.builderId).toBe("coordinate_plot");
    expect(built?.answer).toBe("A′=(4,0), B′=(6,0), C′=(5,2)");
    expect(built?.block.type).toBe("coordinate_graph");
    if (built?.block.type === "coordinate_graph") {
      expect(built.block.points).toHaveLength(6);
      expect(built.block.segments).toHaveLength(3);
    }
  });

  it("reflects every vertex in the vertical mirror line x = 4", () => {
    const built = buildMethodForQuestion(
      "Reflect triangle ABC in the mirror line x = 4. The vertices are A(2,2), B(2,5) and C(3,2).",
    );
    expect(built?.builderId).toBe("coordinate_plot");
    expect(built?.answer).toBe("A′=(6,2), B′=(6,5), C′=(5,2)");
    if (built?.block.type === "coordinate_graph") {
      expect(built.block.points).toHaveLength(6);
      expect(built.block.segments).toHaveLength(4);
      expect(built.block.segments?.[0]).toEqual(
        expect.objectContaining({ label: "x = 4" }),
      );
    }
  });

  it("distinguishes the x-axis from a line with equation x = 4", () => {
    expect(buildMethodForQuestion("Reflect (3,-2) in the x-axis.")?.answer).toBe("(3,2)");
    expect(buildMethodForQuestion("Reflect (3,-2) in the y-axis.")?.answer).toBe("(-3,-2)");
  });

  it("uses the labelled graph for a read-the-point question and drops a stray number line", () => {
    const repaired = applyMethodBuilderToWorkedExample(
      {
        question: "What are the coordinates of point P?",
        steps: ["Compare the numbers"],
        answer: "(-3,2)",
        whiteboard: {
          intro: "Use a number line through zero to compare -3 and 2.",
          blocks: [
            {
              type: "number_line" as const,
              range: [-4, 3] as [number, number],
              tickInterval: 1,
              markers: [
                { value: -3, label: "-3", style: "filled" as const },
                { value: 2, label: "2", style: "filled" as const },
              ],
            },
            {
              type: "coordinate_graph" as const,
              xRange: [-5, 5] as [number, number],
              yRange: [-5, 5] as [number, number],
              plots: [],
              points: [{ point: { x: -3, y: 2 }, label: "P(-3,2)" }],
            },
          ],
          conclusion: "P is (-3,2).",
        },
      },
      "Position & Direction",
      ["Coordinates in four quadrants"],
    );

    expect(repaired.answer).toBe("(-3,2)");
    expect(repaired.whiteboard?.blocks.map((block) => block.type)).toEqual([
      "coordinate_graph",
    ]);
    expect(repaired.teachingSteps).toHaveLength(3);
  });

  it("repairs coordinate and quadrant practice answers exactly", () => {
    const lesson = {
      guidedPractice: [
        {
          question: "Point A is 2 squares right and 4 squares up. Write its coordinates.",
          answer: "(4,2)",
        },
        {
          question: "Which quadrant contains point C at (3,-4)?",
          answer: "(3,-4)",
        },
      ],
    };
    expect(auditKS2MathsPracticeAnswers(lesson)).toHaveLength(2);
    const repaired = hardenKS2MathsPracticeAnswers(lesson);
    expect(repaired.guidedPractice?.map((item) => item.answer)).toEqual([
      "(2,4)",
      "Quadrant IV",
    ]);
    expect(auditKS2MathsPracticeAnswers(repaired)).toEqual([]);
  });

  it("does not accept a coordinate with only the same final number", () => {
    expect(mathsAnswersEquivalent("(5,4)", "(2,4)")).toBe(false);
  });
});
