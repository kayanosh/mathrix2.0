import { buildNarrationPlan } from "@/lib/narration";
import { buildTutorSteps } from "@/lib/tutor-steps";
import type { WhiteboardResponse } from "@/types/whiteboard";

describe("buildTutorSteps", () => {
  const data: WhiteboardResponse = {
    intro: "Let's solve x² − 5x − 6 = 0.",
    blocks: [
      {
        type: "equation_steps",
        steps: [
          {
            stepNumber: 1,
            operationLabel: "Factorise",
            explanation: "Write as (x − 6)(x + 1) = 0.",
            why: "We need two numbers that multiply to −6 and add to −5.",
            rule: "Factorising quadratics",
            latexBefore: "x^2 - 5x - 6 = 0",
            latexAfter: "(x - 6)(x + 1) = 0",
            arrowDirection: "simplify",
          },
          {
            stepNumber: 2,
            operationLabel: "Solve each factor",
            explanation: "Set each bracket equal to zero.",
            latexBefore: "(x - 6)(x + 1) = 0",
            latexAfter: "x = 6 \\text{ or } x = -1",
            arrowDirection: "simplify",
          },
        ],
      },
    ],
    conclusion: "So x = 6 or x = −1.",
  };

  it("maps cues into title / explanation / why cards", () => {
    const plan = buildNarrationPlan(data);
    const steps = buildTutorSteps(data, plan);

    expect(steps[0].kind).toBe("intro");
    expect(steps[0].title).toBe("Let's begin");

    const factor = steps.find((s) => s.title === "Factorise");
    expect(factor).toBeDefined();
    expect(factor!.why).toContain("multiply to");
    expect(factor!.rule).toBe("Factorising quadratics");
    expect(factor!.visual.type).toBe("equation");
  });

  it("keeps one model per narration cue", () => {
    const plan = buildNarrationPlan(data);
    const steps = buildTutorSteps(data, plan);
    expect(steps).toHaveLength(plan.length);
  });
});
