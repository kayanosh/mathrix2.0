import {
  validateKS2TeachingLesson,
  assertNoGcd,
  validateStrictKS2Lesson,
} from "@/lib/ks2-lesson-validator";
import { KS2StrictLessonSchema } from "@/lib/ks2-lesson-zod";
import { buildFractionSimplify } from "@/lib/methods/fraction-simplify";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import { preferredBuilderId } from "@/lib/ks2-pedagogy/registry";
import { resolveKS2Taxonomy } from "@/lib/ks2-taxonomy";
import {
  detectSkillVisualFamily,
  satisfiesSkillVisuals,
} from "@/lib/ks2-skill-visuals";
import { isBlockFit } from "@/lib/ks2-visual-fitness";
import type { KS2TeachingLesson } from "@/types/ks2-lesson";

describe("KS2 fraction simplify quality gate", () => {
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
      learningObjective:
        "Simplify fractions by finding the highest common factor (HCF).",
      prerequisiteKnowledge: [
        "Know what numerator and denominator mean",
        "Know how to list factors of a number",
      ],
      teachingBlocks: [],
      workedExamples: [],
      guidedPractice: [{ question: q, answer: "3/4", hint: "List factors first" }],
      independentPractice: [{ question: "Simplify 8/12", answer: "2/3" }],
      quickCheck: { question: "Simplify 6/9", answer: "2/3" },
      commonMistakes: [
        {
          mistake: "Do not divide only the numerator.",
          correction:
            "Divide the numerator and the denominator by the same HCF.",
        },
      ],
      recap:
        "Simplifying uses the HCF so equivalent fractions use smaller numbers — 12/16 becomes 3/4.",
      intro: built.intro || "Simplifying means writing an equivalent fraction.",
      sections: [
        {
          heading: "Core idea",
          body: "Simplifying means writing an equivalent fraction with smaller numbers.",
        },
      ],
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
      keyPoints: ["HCF", "Divide both parts", "Check HCF is 1"],
    };
  }

  it("routes simplify questions to fraction_simplify builder", () => {
    expect(preferredBuilderId(q, "Fractions")).toBe("fraction_simplify");
    expect(resolveKS2Taxonomy("y6m-fractions", "Simplify fractions")?.builderId).toBe(
      "fraction_simplify",
    );
  });

  it("does not force simplify visuals when the example is a different fraction skill", () => {
    expect(
      detectSkillVisualFamily(
        "Calculate 1/4 + 1/2",
        "Fractions",
        "Simplify fractions",
      ),
    ).toBe("fraction_ops");
  });

  it("uses the curriculum skill when incidental question wording says how many", () => {
    expect(
      detectSkillVisualFamily(
        "How many books were read on Thursday?",
        "Statistics",
        "Read and interpret line graphs",
      ),
    ).toBe("statistics");
    expect(satisfiesSkillVisuals(["chart", "table"], "statistics")).toBe(true);
    expect(
      detectSkillVisualFamily(
        "Plot point A at (4, 3)",
        "Position & Direction",
        "Read and plot coordinates (first quadrant)",
      ),
    ).toBe("coordinates");
    expect(satisfiesSkillVisuals(["coordinate_graph"], "coordinates")).toBe(
      true,
    );
    expect(detectSkillVisualFamily("List the first five multiples of 6", "", "Multiples")).toBe(
      "multiples",
    );
    expect(satisfiesSkillVisuals(["number_line"], "multiples")).toBe(true);
  });

  it("keeps fraction multiplication and division in the fraction visual family", () => {
    expect(
      detectSkillVisualFamily("1/2 × 3/4", "Fractions", "Multiply fractions"),
    ).toBe("fraction_ops");
    expect(
      detectSkillVisualFamily("3/4 ÷ 2", "Fractions", "Divide fractions by integers"),
    ).toBe("fraction_ops");
    expect(detectSkillVisualFamily("", "", "Multiply fractions")).toBe(
      "fraction_ops",
    );
    expect(detectSkillVisualFamily("", "", "Divide fractions by integers")).toBe(
      "fraction_ops",
    );
  });

  it("accepts the Simplify 12/16 gold-standard lesson", () => {
    const v = validateKS2TeachingLesson(goldLesson(), { maths: true });
    expect(v.ok).toBe(true);
  });

  it("requires a fraction visual with renderable data", () => {
    const built = buildFractionSimplify(12, 16);
    const types = [built.block, ...(built.extraBlocks || [])].map((b) => b.type);
    expect(types.some((t) => t === "fraction_bar" || t === "fraction_grid")).toBe(
      true,
    );
    expect(isBlockFit(built.block, q)).toBe(true);
    expect(
      satisfiesSkillVisuals(types, detectSkillVisualFamily(q, "Fractions", "Simplify")),
    ).toBe(true);
  });

  it("explains HCF via factor lists and never uses GCD", () => {
    const built = buildFractionSimplify(12, 16);
    const prose = built.teachingSteps.map((s) => s.explanation).join("\n");
    expect(prose).toMatch(/factors of 12/i);
    expect(prose).toMatch(/factors of 16/i);
    expect(prose).toMatch(/\bHCF\b/);
    expect(assertNoGcd(prose)).toBe(true);
    expect(built.teachingSteps.length).toBeGreaterThanOrEqual(6);
  });

  it("rejects GCD wording", () => {
    const bad = goldLesson();
    bad.sections[0].body = "Find the GCD of 12 and 16.";
    const v = validateKS2TeachingLesson(bad, { maths: true });
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.code === "uk_gcd_forbidden")).toBe(true);
  });

  it("rejects unrelated common mistakes", () => {
    const bad = goldLesson();
    bad.commonMistakes = [
      {
        mistake: "Do not add the denominators when adding fractions.",
        correction: "Find a common denominator first.",
      },
    ];
    const v = validateKS2TeachingLesson(bad, { maths: true });
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.code === "mistake_mismatch")).toBe(true);
  });

  it("rejects fewer than 3 micro-steps", () => {
    const bad = goldLesson();
    bad.workedExample.teachingSteps = bad.workedExample.teachingSteps!.slice(0, 2);
    bad.workedExample.steps = ["a", "b"];
    const v = validateKS2TeachingLesson(bad, { maths: true });
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.code === "few_steps")).toBe(true);
  });

  it("rejects missing visual data", () => {
    const bad = goldLesson();
    bad.workedExample.whiteboard = { intro: "", blocks: [], conclusion: "" };
    const v = validateKS2TeachingLesson(bad, { maths: true });
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.code === "missing_visual")).toBe(true);
  });

  it("rejects generic recap boxes", () => {
    const bad = goldLesson();
    bad.recap = "Today we practised. Well done.";
    const v = validateKS2TeachingLesson(bad, { maths: true });
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.code === "generic_recap")).toBe(true);
  });

  it("overlays builder onto shallow LLM simplify lesson", () => {
    const next = applyMethodBuilderToWorkedExample(
      {
        question: q,
        steps: ["Find the GCD", "The GCD is 4", "Answer is 3/4"],
        answer: "3/4",
        whiteboard: {
          intro: "",
          blocks: [],
          conclusion: "",
        },
      },
      "Fractions",
      ["Simplify fractions"],
    );
    expect(next.teachingSteps!.length).toBeGreaterThanOrEqual(3);
    expect(next.teachingSteps!.length).toBeLessThanOrEqual(6);
    const blockTypes = (next.whiteboard?.blocks || []).map(
      (b: { type: string }) => b.type,
    );
    expect(blockTypes).toContain("fraction_bar");
    expect(assertNoGcd(next.teachingSteps!.map((s) => s.explanation).join(" "))).toBe(
      true,
    );
  });
});

describe("KS2 strict Zod schema", () => {
  it("requires 3-6 micro-steps on worked examples", () => {
    const raw = {
      keyStage: "KS2",
      yearGroup: "Year 6",
      strand: "Fractions",
      topic: "Fractions",
      skill: "Simplify",
      method: "HCF",
      learningObjective: "Simplify fractions using HCF",
      prerequisiteKnowledge: ["factors"],
      conceptExplanation: "Simplifying means writing an equivalent fraction.",
      workedExamples: [
        {
          question: "Simplify 12/16",
          method: "HCF",
          steps: [
            {
              stepNumber: 1,
              title: "Start",
              teacherText: "Start with 12/16.",
            },
          ],
          finalAnswer: "3/4",
          check: "HCF of 3 and 4 is 1",
        },
      ],
      commonMistakes: [
        { mistake: "Only divide numerator", correction: "Divide both" },
      ],
      guidedPractice: [{ question: "Simplify 8/12", answer: "2/3" }],
      independentPractice: [{ question: "Simplify 6/9", answer: "2/3" }],
      quickCheck: { question: "Simplify 4/8", answer: "1/2" },
      recap: "Use HCF to simplify fractions to lowest terms.",
    };
    const parsed = KS2StrictLessonSchema.safeParse(raw);
    expect(parsed.success).toBe(false);
    const v = validateStrictKS2Lesson(raw);
    expect(v.ok).toBe(false);
  });
});
