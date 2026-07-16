import { buildMethodForQuestion } from "@/lib/methods";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import {
  auditKS2MathsPracticeAnswers,
  hardenKS2MathsPracticeAnswers,
} from "@/lib/ks2-maths-accuracy";
import { validateKS2TeachingLesson } from "@/lib/ks2-lesson-validator";

describe("KS2 order of operations accuracy", () => {
  it("solves the complete screenshot expression instead of stopping at 540", () => {
    const built = buildMethodForQuestion("36 × 15 ÷ 5 + 8");
    expect(built?.builderId).toBe("order_of_operations");
    expect(built?.answer).toBe("116");
    expect(built?.block.type).toBe("equation_steps");
    expect(built?.teachingSteps.map((step) => step.explanation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("540 \\div 5 + 8"),
        expect.stringContaining("108 + 8"),
        expect.stringContaining("116"),
      ]),
    );
  });

  it.each([
    ["Work out 3 + 4 × 2", "11"],
    ["Work out (5 + 3) × 2", "16"],
    ["Work out 20 - 3 × 4", "8"],
    ["Work out 24 ÷ 6 × 3", "12"],
    ["Work out 5^2 - 3 × (4 + 1)", "10"],
  ])("applies BIDMAS correctly for %s", (question, answer) => {
    const built = buildMethodForQuestion(question);
    expect(built?.builderId).toBe("order_of_operations");
    expect(built?.answer).toBe(answer);
  });

  it("replaces the corrupt mixed visual and removes the empty AI steps", () => {
    const repaired = applyMethodBuilderToWorkedExample(
      {
        question: "36 × 15 ÷ 5 + 8",
        steps: ["Multiply first", ")", ")"],
        answer: "540",
        whiteboard: {
          intro: "Let's multiply 36 × 15.",
          blocks: [
            {
              type: "column_method",
              method: "column_multiplication",
              rows: ["36", "×15", "180", "360", "540"],
              question: "36 × 15",
              answer: "540",
            },
            {
              type: "equation_steps",
              steps: [
                {
                  stepNumber: 1,
                  operationLabel: "",
                  explanation: ")",
                  latexBefore: "",
                  latexAfter: "",
                  arrowDirection: "down",
                },
              ],
            },
          ],
          conclusion: "540",
        },
      },
      "Multiplication & Division",
      ["Order of operations (BIDMAS)"],
    );

    expect(repaired.answer).toBe("116");
    expect(repaired.whiteboard?.blocks.map((block) => block.type)).toEqual([
      "equation_steps",
    ]);
    expect(repaired.whiteboard?.conclusion).toContain("116");
    expect(repaired.steps).not.toContain(")");
  });

  it("repairs Learn and Guided practice answers from their complete questions", () => {
    const lesson = {
      guidedPractice: [
        { question: "Work out 3 + 4 × 2", hint: "Multiply first", answer: "14" },
      ],
      independentPractice: [
        { question: "Work out 20 - 3 × 4", answer: "68" },
      ],
      quickCheck: { question: "Work out 24 ÷ 6 × 3", answer: "4" },
      tryThis: { question: "Work out (5 + 3) × 2", answer: "13" },
    };
    expect(auditKS2MathsPracticeAnswers(lesson)).toHaveLength(4);
    const repaired = hardenKS2MathsPracticeAnswers(lesson);
    expect(repaired.guidedPractice?.[0].answer).toBe("11");
    expect(repaired.independentPractice?.[0].answer).toBe("8");
    expect(repaired.quickCheck?.answer).toBe("12");
    expect(repaired.tryThis?.answer).toBe("16");
    expect(auditKS2MathsPracticeAnswers(repaired)).toEqual([]);
  });

  it("blocks an unsolved full expression and empty equation lines", () => {
    const result = validateKS2TeachingLesson(
      {
        topic: "Multiplication & Division",
        skill: "Order of operations (BIDMAS)",
        learningObjective: "Use BIDMAS to solve a complete expression.",
        prerequisiteKnowledge: ["Know multiplication facts."],
        intro: "We will keep every operation visible.",
        sections: [
          {
            heading: "Core idea",
            body: "Use brackets first, then multiplication and division from left to right.",
          },
        ],
        workedExample: {
          question: "36 × 15 ÷ 5 + 8",
          steps: ["Multiply", "Divide", "Add"],
          teachingSteps: [
            {
              title: "Multiply",
              explanation: "First multiply 36 by 15.",
              why: "Multiplication is completed before addition.",
              narration: "Multiply first.",
              cellKeys: [],
              carryKeys: [],
              noteKeys: [],
            },
            {
              title: "Divide",
              explanation: "Then divide by 5.",
              narration: "Divide next.",
              cellKeys: [],
              carryKeys: [],
              noteKeys: [],
            },
            {
              title: "Add",
              explanation: "Then add 8.",
              narration: "Add last.",
              cellKeys: [],
              carryKeys: [],
              noteKeys: [],
            },
          ],
          answer: "540",
          whiteboard: {
            intro: "Use BIDMAS.",
            blocks: [
              {
                type: "equation_steps",
                steps: [
                  {
                    stepNumber: 1,
                    operationLabel: "",
                    explanation: ")",
                    latexBefore: "",
                    latexAfter: "",
                    arrowDirection: "down",
                  },
                ],
              },
            ],
            conclusion: "540",
          },
        },
        commonMistakes: [
          {
            mistake: "Stopping after multiplication",
            correction: "Continue until the whole expression is solved.",
          },
        ],
        recap: "Use BIDMAS and rewrite the complete expression each time.",
      },
      { subject: "maths", requireVisual: true },
    );
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "math_answer_mismatch",
        "equation_steps_incomplete",
      ]),
    );
  });
});
