import {
  validateKS2TeachingLesson,
  assertNoGcd,
} from "@/lib/ks2-lesson-validator";
import {
  buildDecimalRounding,
  buildRoundingNumberLine,
} from "@/lib/methods/rounding-number-line";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import {
  detectSkillVisualFamily,
  satisfiesSkillVisuals,
} from "@/lib/ks2-skill-visuals";
import { coerceCanonicalLessonKeys } from "@/lib/ks2-lesson-zod";
import type { KS2TeachingLesson } from "@/types/ks2-lesson";

describe("KS2 rounding lesson quality", () => {
  const q = "Round 3.456 to 2 decimal places";

  function goldLesson(): KS2TeachingLesson {
    const built = buildDecimalRounding(3.456, 2);
    return {
      schemaVersion: 2,
      keyStage: "KS2",
      yearGroup: "Year 6",
      strand: "Fractions, Decimals & Percentages",
      topic: "Decimals",
      skill: "Round decimals",
      method: "Rounding on a number line",
      learningObjective: "Round decimals to a given number of decimal places.",
      prerequisiteKnowledge: ["Know tenths, hundredths and thousandths"],
      teachingBlocks: [],
      workedExamples: [],
      guidedPractice: [{ question: q, answer: "3.46", hint: "Look at the thousandths" }],
      independentPractice: [
        { question: "Round 2.734 to 1 decimal place", answer: "2.7" },
      ],
      quickCheck: { question: "Round 5.555 to 2 d.p.", answer: "5.56" },
      commonMistakes: [
        {
          mistake: "Do not truncate the extra digits.",
          correction:
            "Look at the deciding digit and round up when it is 5 or more.",
        },
      ],
      recap:
        "When rounding decimals, use the deciding digit: 5 or more rounds up, and keep the correct number of decimal places.",
      intro: built.intro || "Let's round decimals carefully.",
      sections: [
        {
          heading: "Core idea",
          body: "Rounding means choosing the nearest value at the target place.",
        },
      ],
      workedExample: {
        question: q,
        steps: built.captions,
        answer: built.answer || "3.46",
        whiteboard: {
          intro: built.intro || "",
          blocks: [built.block, ...(built.extraBlocks || [])],
          conclusion: built.answer || "",
        },
        teachingSteps: built.teachingSteps,
      },
      keyPoints: ["Deciding digit", "5 or more", "Correct decimal places"],
    };
  }

  it("detects rounding family and requires chart + number line", () => {
    expect(detectSkillVisualFamily(q, "Decimals", "Round decimals")).toBe(
      "rounding",
    );
    const built = buildDecimalRounding(3.456, 2);
    const types = [built.block, ...(built.extraBlocks || [])].map((b) => b.type);
    expect(types).toContain("number_line");
    expect(types).toContain("table");
    expect(satisfiesSkillVisuals(types, "rounding")).toBe(true);
  });

  it("accepts the rounding gold-standard lesson", () => {
    const v = validateKS2TeachingLesson(goldLesson(), { maths: true });
    expect(v.ok).toBe(true);
  });

  it("explains deciding digit and 5-or-more with ≥6 steps", () => {
    const built = buildDecimalRounding(3.456, 2);
    const prose = built.teachingSteps.map((s) => s.explanation).join("\n");
    expect(built.teachingSteps.length).toBeGreaterThanOrEqual(6);
    expect(prose).toMatch(/decid/i);
    expect(prose).toMatch(/5 or more/i);
    expect(built.answer).toBe("3.46");
  });

  it("rejects off-skill common mistakes for rounding", () => {
    const bad = goldLesson();
    bad.commonMistakes = [
      {
        mistake: "Do not add the denominators when adding fractions.",
        correction: "Find a common denominator.",
      },
    ];
    const v = validateKS2TeachingLesson(bad, { maths: true });
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.code === "mistake_mismatch")).toBe(true);
  });

  it("rejects mixed skill (simplify skill + add question)", () => {
    const bad = goldLesson();
    bad.skill = "Simplify fractions";
    bad.workedExample.question = "Calculate 1/4 + 1/2";
    const v = validateKS2TeachingLesson(bad, { maths: true });
    expect(v.issues.some((i) => i.code === "mixed_skill")).toBe(true);
  });

  it("integer rounding also emits table + number line", () => {
    const built = buildRoundingNumberLine(57892, 10000);
    const types = [built.block, ...(built.extraBlocks || [])].map((b) => b.type);
    expect(types).toContain("table");
    expect(types).toContain("number_line");
    expect(built.teachingSteps.length).toBeGreaterThanOrEqual(6);
  });

  it("overlays builder onto shallow LLM rounding lesson", () => {
    const next = applyMethodBuilderToWorkedExample(
      {
        question: q,
        steps: ["Round it", "Answer is 3.46"],
        answer: "3.46",
      },
      "Decimals",
      ["Round decimals"],
    );
    expect(next.teachingSteps!.length).toBeGreaterThanOrEqual(6);
    const types = (
      (next as { whiteboard?: { blocks?: { type: string }[] } }).whiteboard
        ?.blocks || []
    ).map((b) => b.type);
    expect(types).toContain("number_line");
    expect(types).toContain("table");
  });

  it("coerces canonical priorKnowledge / commonMistake keys", () => {
    const coerced = coerceCanonicalLessonKeys({
      priorKnowledge: ["tenths"],
      coreExplanation: "Rounding chooses the nearest value at a place.",
      commonMistake: {
        mistake: "Looking at the wrong digit when rounding",
        correction: "Use the digit one place to the right",
      },
      workedExample: {
        question: q,
        method: "number line",
        finalAnswer: "3.46",
        check: "has 2 d.p.",
        steps: [
          { stepNumber: 1, title: "A", teacherText: "Start with the number." },
          { stepNumber: 2, title: "B", teacherText: "Find the target place." },
          { stepNumber: 3, title: "C", teacherText: "Look at deciding digit." },
          { stepNumber: 4, title: "D", teacherText: "Apply 5 or more rule." },
          { stepNumber: 5, title: "E", teacherText: "Write the rounded value." },
          { stepNumber: 6, title: "F", teacherText: "Check decimal places." },
        ],
      },
    });
    expect(coerced.prerequisiteKnowledge).toEqual(["tenths"]);
    expect(coerced.conceptExplanation).toMatch(/Rounding/);
    expect(Array.isArray(coerced.commonMistakes)).toBe(true);
    const we = coerced.workedExample as { answer?: string; steps?: string[] };
    expect(we.answer).toBe("3.46");
    expect(we.steps?.length).toBe(6);
    expect(assertNoGcd(JSON.stringify(coerced))).toBe(true);
  });
});
