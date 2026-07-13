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

  it("uses KS2 teaching steps as the tutor timeline", () => {
    const ks2: WhiteboardResponse = {
      intro: "Round 47,382 carefully.",
      blocks: [
        {
          type: "number_line",
          range: [40000, 50000],
          tickInterval: 5000,
          markers: [{ value: 47382, label: "47,382", style: "filled" }],
        },
        {
          type: "table",
          headers: ["Ten Thousands", "Thousands", "Hundreds", "Tens", "Ones"],
          rows: [["4", "7", "3", "8", "2"]],
        },
      ],
      teachingSteps: [
        {
          title: "Show the place-value chart",
          explanation: "Put every digit in its own column.",
          narration: "Put every digit in its own column.",
        },
        {
          title: "Find the multiples either side",
          explanation: "Use the number line from 40,000 to 50,000.",
          why: "These are the nearest multiples of 10,000.",
          narration: "Find 40,000 and 50,000 on the number line.",
        },
      ],
      conclusion: "The answer is 50,000.",
    };
    const plan = buildNarrationPlan(ks2);
    const models = buildTutorSteps(ks2, plan);
    const teaching = models.filter((step) => step.kind === "teaching_step");
    expect(teaching).toHaveLength(2);
    expect(teaching[0].title).toBe("Show the place-value chart");
    expect(teaching[0].visual.type).toBe("block");
    expect(teaching[1].why).toMatch(/nearest multiples/);
    expect(models.some((step) => step.title === "Table")).toBe(false);
  });
});
