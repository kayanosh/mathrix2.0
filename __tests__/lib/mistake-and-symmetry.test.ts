import { validateKS2TeachingLesson } from "@/lib/ks2-lesson-validator";
import { buildFractionSimplify } from "@/lib/methods/fraction-simplify";
import type { KS2TeachingLesson } from "@/types/ks2-lesson";

const q = "Simplify 12/16";

function goldLesson(): KS2TeachingLesson {
  const built = buildFractionSimplify(12, 16);
  return {
    schemaVersion: 2,
    keyStage: "KS2",
    yearGroup: "Year 6",
    strand: "Fractions, Decimals & Percentages",
    topic: "Fractions",
    skill: "Simplify fractions using the highest common factor",
    method: "Simplify using highest common factor (HCF)",
    learningObjective: "Simplify fractions by finding the highest common factor (HCF).",
    prerequisiteKnowledge: ["Know what numerator and denominator mean"],
    teachingBlocks: [],
    workedExamples: [],
    guidedPractice: [{ question: q, answer: "3/4", hint: "List factors first" }],
    independentPractice: [{ question: "Simplify 8/12", answer: "2/3" }],
    quickCheck: { question: "Simplify 6/9", answer: "2/3" },
    commonMistakes: [
      {
        mistake: "Do not divide only the numerator.",
        correction: "Divide the numerator and the denominator by the same HCF.",
      },
    ],
    recap: "Simplifying uses the HCF — 12/16 becomes 3/4.",
    intro: "Simplifying means writing an equivalent fraction.",
    sections: [{ heading: "Core idea", body: "Write an equivalent fraction with smaller numbers." }],
    workedExample: {
      question: q,
      steps: built.captions,
      answer: built.answer || "3/4",
      whiteboard: {
        intro: built.intro || "",
        blocks: [built.block, ...(built.extraBlocks || [])],
        conclusion: built.answer || "",
      },
      teachingSteps: built.teachingSteps,
    },
    keyPoints: ["HCF", "Divide both parts"],
  };
}

describe("mistake_mismatch paraphrase tolerance", () => {
  it("accepts on-topic paraphrased mistakes (no keyword bingo required)", () => {
    const lesson = goldLesson();
    lesson.commonMistakes = [
      {
        mistake: "Thinking 4/8 cannot be simplified any further.",
        correction: "Four and eight share factors, so divide again until the parts are as small as possible.",
      },
    ];
    const v = validateKS2TeachingLesson(lesson, { maths: true });
    expect(v.issues.some((i) => i.code === "mistake_mismatch")).toBe(false);
  });

  it("still blocks cross-skill mistakes", () => {
    const lesson = goldLesson();
    lesson.commonMistakes = [
      {
        mistake: "Do not add the denominators when adding fractions.",
        correction: "Find a common denominator first.",
      },
    ];
    const v = validateKS2TeachingLesson(lesson, { maths: true });
    expect(v.issues.some((i) => i.code === "mistake_mismatch")).toBe(true);
  });
});
