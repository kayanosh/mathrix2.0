import {
  buildLinearEquation,
  parseLinearEquation,
} from "@/lib/methods/linear-equation";
import {
  buildQuadraticFactorSolve,
  findFactorPair,
  parseQuadraticEquation,
} from "@/lib/methods/quadratic-solve";
import { buildMethodForQuestion } from "@/lib/methods";
import { applyMethodBuilderToWhiteboard } from "@/lib/methods/apply-builder";
import type { EquationStepBlock } from "@/types/whiteboard";

describe("linear equation builder", () => {
  it("parses 2x + 4 = 10", () => {
    expect(parseLinearEquation("Solve $2x + 4 = 10$")).toEqual({
      variable: "x",
      a: 2,
      b: 4,
      c: 10,
    });
  });

  it("rejects quadratics", () => {
    expect(parseLinearEquation("x^2 - 5x - 6 = 0")).toBeNull();
  });

  it("builds steps with arrows for 2x + 4 = 10", () => {
    const built = buildLinearEquation({ variable: "x", a: 2, b: 4, c: 10 });
    expect(built.builderId).toBe("linear_equation");
    expect(built.answer).toBe("x = 3");
    const block = built.block as EquationStepBlock;
    expect(block.type).toBe("equation_steps");
    expect(block.steps.length).toBeGreaterThanOrEqual(4);
    const withArrows = block.steps.filter((s) => (s.arrows?.length ?? 0) > 0);
    expect(withArrows.length).toBeGreaterThanOrEqual(2);
    expect(withArrows.some((s) => s.latexBefore.includes("htmlId"))).toBe(true);
    expect(built.intro).toMatch(/isolate/i);
  });

  it("is selected by buildMethodForQuestion", () => {
    expect(buildMethodForQuestion("2x + 4 = 10")?.builderId).toBe(
      "linear_equation",
    );
  });
});

describe("quadratic factor-solve builder", () => {
  it("parses x^2 - 5x - 6 = 0", () => {
    expect(parseQuadraticEquation("Solve $x^2 - 5x - 6 = 0$")).toEqual({
      variable: "x",
      a: 1,
      b: -5,
      c: -6,
    });
  });

  it("finds the factor pair for b=-5, c=-6", () => {
    expect(findFactorPair(-5, -6)).toEqual({ p: -6, q: 1 });
  });

  it("builds factorise + arrow solves for x^2 - 5x - 6 = 0", () => {
    const built = buildQuadraticFactorSolve({
      variable: "x",
      a: 1,
      b: -5,
      c: -6,
    });
    expect(built.builderId).toBe("quadratic_solve");
    expect(built.answer).toMatch(/6/);
    expect(built.answer).toMatch(/-1/);
    const block = built.block as EquationStepBlock;
    const factorStep = block.steps.find(
      (s) =>
        s.latexAfter.includes("(x - 6)(x + 1)") ||
        s.latexAfter.includes("(x + 1)(x - 6)"),
    );
    expect(factorStep).toBeTruthy();
    expect(factorStep!.arrowDirection).toBe("simplify");
    const arrowSteps = block.steps.filter((s) => (s.arrows?.length ?? 0) > 0);
    expect(arrowSteps.length).toBe(2);
    expect(arrowSteps.every((s) => s.latexBefore.includes("htmlId"))).toBe(true);
  });

  it("is preferred over linear for quadratics", () => {
    expect(
      buildMethodForQuestion("Solve x^2 - 5x - 6 = 0")?.builderId,
    ).toBe("quadratic_solve");
  });
});

describe("applyMethodBuilderToWhiteboard algebra overlay", () => {
  it("replaces a weak board for a quadratic", () => {
    const out = applyMethodBuilderToWhiteboard(
      {
        intro: "Let's solve",
        blocks: [
          {
            type: "text",
            content: "The solutions are x = 6 and x = -1",
          },
        ],
        conclusion: "Done",
        subject: "Maths",
        topic: "Algebra",
      },
      "Solve x^2 - 5x - 6 = 0",
    );
    const eq = out.blocks.find((b) => b.type === "equation_steps") as
      | EquationStepBlock
      | undefined;
    expect(eq).toBeTruthy();
    expect(eq!.steps.some((s) => (s.arrows?.length ?? 0) > 0)).toBe(true);
    expect(out.blocks.some((b) => b.type === "text")).toBe(false);
    expect(out.intro).toMatch(/quadratic|factor/i);
  });

  it("upgrades a cached prose board on the same question", () => {
    const cachedProse = {
      intro: "Let's solve this quadratic equation step by step.",
      blocks: [
        {
          type: "text" as const,
          content:
            "This is a quadratic in the form ax^2+bx+c=0.\nFind two numbers...\nThe solutions are x=6 and x=-1.",
        },
      ],
      conclusion: "The solutions are x = 6 and x = -1.",
    };
    const out = applyMethodBuilderToWhiteboard(
      cachedProse,
      "Solve $x^2 - 5x - 6 = 0$",
    );
    expect(out.blocks[0].type).toBe("equation_steps");
    expect(out.blocks.every((b) => b.type !== "text")).toBe(true);
  });

  it("replaces a weak board for a linear equation", () => {
    const out = applyMethodBuilderToWhiteboard(
      {
        intro: "Solve it",
        blocks: [{ type: "text", content: "x = 3" }],
        conclusion: "Done",
      },
      "2x + 4 = 10",
    );
    const eq = out.blocks.find((b) => b.type === "equation_steps") as
      | EquationStepBlock
      | undefined;
    expect(eq).toBeTruthy();
    expect(eq!.steps.filter((s) => (s.arrows?.length ?? 0) > 0).length).toBeGreaterThanOrEqual(
      2,
    );
  });
});
