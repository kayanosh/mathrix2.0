import {
  validateKS2TeachingLesson,
  normalizeToTeachingLesson,
  validateVisualBlock,
} from "@/lib/ks2-lesson-validator";
import { buildFractionNumberLine } from "@/lib/methods/fraction-number-line";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import { auditAllKS2MathsTopics, resolveKS2Taxonomy } from "@/lib/ks2-taxonomy";
import { KS2_VISUAL_RULES } from "@/lib/ks2-visual-rules";
import { isBlockFit } from "@/lib/ks2-visual-fitness";
import type { KS2TeachingLesson } from "@/types/ks2-lesson";
import type { VisualBlock } from "@/types/whiteboard";

describe("KS2 taxonomy + visual rules", () => {
  it("maps fractions compare skill to fraction_number_line", () => {
    const node = resolveKS2Taxonomy("y5m-fractions", "Compare and order fractions");
    expect(node?.builderId).toBe("fraction_number_line");
    expect(node?.visualRuleId).toBe("fractions");
    expect(node?.strand).toContain("Fractions");
  });

  it("audits many curriculum maths skills", () => {
    const rows = auditAllKS2MathsTopics();
    expect(rows.length).toBeGreaterThan(40);
    expect(rows.every((r) => r.route.startsWith("/ks2/topic/"))).toBe(true);
  });

  it("defines every visual rule id", () => {
    expect(Object.keys(KS2_VISUAL_RULES).length).toBeGreaterThanOrEqual(10);
  });
});

describe("KS2 teaching lesson validator", () => {
  const goldQuestion = "Compare/order 1/2, 3/4, 2/3";

  function goldLesson(): KS2TeachingLesson {
    const built = buildFractionNumberLine([
      { n: 1, d: 2 },
      { n: 3, d: 4 },
      { n: 2, d: 3 },
    ]);
    return {
      schemaVersion: 2,
      keyStage: "KS2",
      topic: "Fractions",
      skill: "Compare and order fractions",
      method: "Common denominator method",
      learningObjective: "Order unit fractions using a common denominator.",
      prerequisiteKnowledge: ["Know what numerator and denominator mean"],
      teachingBlocks: [],
      workedExamples: [],
      guidedPractice: [
        { question: goldQuestion, answer: "1/2, 2/3, 3/4" },
      ],
      independentPractice: [
        { question: "Order 1/3, 1/2, 1/4", answer: "1/4, 1/3, 1/2" },
      ],
      quickCheck: { question: "Which is greater, 2/3 or 3/4?", answer: "3/4" },
      commonMistakes: [
        {
          mistake: "Do not compare only the denominators.",
          correction: "Rewrite with a common denominator, then compare numerators.",
        },
      ],
      recap: "Use a common denominator and a 0–1 number line to order fractions.",
      intro: "Let's compare fractions carefully.",
      sections: [
        {
          heading: "Common denominator",
          body: "Equal-sized pieces make comparing fair.",
        },
      ],
      workedExample: {
        question: goldQuestion,
        steps: built.captions,
        answer: built.answer || "1/2, 2/3, 3/4",
        whiteboard: {
          intro: built.intro || "",
          blocks: [built.block, ...(built.extraBlocks || [])],
          conclusion: built.answer || "",
        },
        teachingSteps: built.teachingSteps,
      },
      keyPoints: ["Common denominator", "Number line markers"],
    };
  }

  it("accepts the fraction compare gold-standard lesson", () => {
    const v = validateKS2TeachingLesson(goldLesson(), { maths: true });
    expect(v.ok).toBe(true);
  });

  it("rejects vague language and thin steps", () => {
    const bad = goldLesson();
    bad.learningObjective = "";
    bad.workedExample.steps = ["Answer is 1/2"];
    bad.workedExample.teachingSteps = undefined;
    bad.intro = "It is easy — simply add them. Just do the method.";
    bad.commonMistakes = [];
    const v = validateKS2TeachingLesson(bad, { maths: true });
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.code === "missing_objective")).toBe(true);
    expect(v.issues.some((i) => i.code === "few_steps")).toBe(true);
    expect(v.issues.some((i) => i.code === "vague_language")).toBe(true);
    expect(v.issues.some((i) => i.code === "missing_mistake")).toBe(true);
  });

  it("rejects empty number lines for fraction questions", () => {
    const issues = validateVisualBlock(
      { type: "number_line", range: [0, 1], tickInterval: 1, markers: [] },
      goldQuestion,
    );
    expect(issues.some((i) => i.code === "number_line_no_markers")).toBe(true);
  });

  it("requires shaded fraction bars", () => {
    const issues = validateVisualBlock(
      { type: "fraction_bar", numerator: 1, denominator: 0 },
      goldQuestion,
    );
    expect(issues.some((i) => i.code === "fraction_bar_invalid")).toBe(true);
  });

  it("normalizes legacy flat lessons", () => {
    const n = normalizeToTeachingLesson(
      {
        intro: "Hi",
        sections: [],
        workedExample: {
          question: goldQuestion,
          steps: ["a", "b", "c", "d"],
          answer: "1/2, 2/3, 3/4",
        },
        keyPoints: [],
        learningObjective: "Order fractions",
        prerequisiteKnowledge: ["fractions"],
        commonMistakes: [
          { mistake: "denominators only", correction: "use LCD" },
        ],
        recap: "Use LCD",
      },
      { topic: "Fractions" },
    );
    expect(n.schemaVersion).toBe(2);
    expect(n.workedExamples[0].question).toBe(goldQuestion);
  });
});

describe("fraction compare builder visuals", () => {
  it("emits number line markers and fraction bars", () => {
    const built = buildFractionNumberLine([
      { n: 1, d: 2 },
      { n: 3, d: 4 },
      { n: 2, d: 3 },
    ]);
    expect(built.block.type).toBe("number_line");
    expect(isBlockFit(built.block, "Compare/order 1/2, 3/4, 2/3")).toBe(true);
    expect(built.extraBlocks?.some((b) => b.type === "fraction_bar")).toBe(true);
    expect(built.extraBlocks?.some((b) => b.type === "fraction_wall")).toBe(true);
    expect(
      built.teachingSteps.some((s) =>
        /do not compare only the denominators/i.test(s.explanation),
      ),
    ).toBe(true);
  });

  it("overlays onto blank LLM line via apply-builder", () => {
    const next = applyMethodBuilderToWorkedExample({
      question: "Compare/order 1/2, 3/4, 2/3",
      steps: ["Place", "Order"],
      answer: "?",
      whiteboard: {
        intro: "x",
        blocks: [
          { type: "number_line", range: [0, 1], tickInterval: 1, markers: [] },
        ],
        conclusion: "",
      },
    }, "Fractions");
    const types = (next.whiteboard?.blocks || []).map((b) => b.type);
    expect(types).toContain("number_line");
    expect(types).toContain("fraction_bar");
  });
});

describe("VisualRenderer / BlockRenderer coverage for new types", () => {
  const samples: VisualBlock[] = [
    { type: "fraction_bar", numerator: 1, denominator: 2, shaded: 1 },
    {
      type: "fraction_wall",
      rows: [{ denominator: 2 }, { denominator: 4 }],
    },
    {
      type: "bar_model",
      parts: [
        { label: "A", weight: 1 },
        { label: "B", weight: 2 },
      ],
    },
    { type: "hundred_square", shaded: 25, label: "25%" },
    {
      type: "area_model",
      rows: 3,
      cols: 4,
      labels: { product: "12" },
    },
    {
      type: "key_info",
      stem: "Sam has 24 sweets and gives away 1/3.",
      highlights: [{ text: "24", kind: "number" }, { text: "1/3", kind: "other" }],
    },
    {
      type: "force_diagram",
      objectLabel: "apple",
      objectEmoji: "🍎",
      forces: [{ label: "gravity", direction: "down" }],
    },
  ];

  it("marks every new visual type as fit when well-formed", () => {
    for (const b of samples) {
      expect(isBlockFit(b, "test")).toBe(true);
    }
  });
});
