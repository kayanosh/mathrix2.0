import { validateKS2TeachingLesson } from "@/lib/ks2-lesson-validator";
import {
  auditKS2CurriculumSubjects,
  resolveKS2Taxonomy,
} from "@/lib/ks2-taxonomy";
import { englishLessonExtra, isEnglishGpsTopic } from "@/lib/ks2-english";
import { scienceLessonExtra } from "@/lib/ks2-science";
import { computingLessonExtra } from "@/lib/ks2-computing";
import { arabicLessonExtra } from "@/lib/ks2-arabic";
import { usesTeachingEngine } from "@/lib/ks2-subject-pedagogy/shared";
import type { KS2TeachingLesson } from "@/types/ks2-lesson";

function sampleNonMathsLesson(
  topic: string,
  skill: string,
  method: string,
): KS2TeachingLesson {
  return {
    schemaVersion: 2,
    keyStage: "KS2",
    topic,
    skill,
    method,
    learningObjective: `Learn ${skill} using ${method}.`,
    prerequisiteKnowledge: ["Prior Year 5 skills"],
    teachingBlocks: [],
    workedExamples: [],
    guidedPractice: [{ question: "Try this with a hint", hint: "Look carefully", answer: "A" }],
    independentPractice: [{ question: "Try alone", answer: "B" }],
    quickCheck: { question: "Quick check?", answer: "C" },
    commonMistakes: [
      { mistake: "Rushing", correction: "Slow down and use the method." },
    ],
    recap: `We used ${method} for ${skill}.`,
    intro: `Let's learn ${skill}.`,
    sections: [{ heading: "Idea", body: `Use ${method}.` }],
    workedExample: {
      question: `Example for ${skill}`,
      steps: [
        "Read the question carefully.",
        `Apply ${method}.`,
        "Check each part of the answer.",
        "Explain why this method works for this skill.",
      ],
      answer: "Model answer",
    },
    keyPoints: [method],
  };
}

describe("multi-subject teaching engine", () => {
  it("marks english/science/computing/arabic as teaching-engine subjects", () => {
    expect(usesTeachingEngine("english")).toBe(true);
    expect(usesTeachingEngine("science")).toBe(true);
    expect(usesTeachingEngine("computing")).toBe(true);
    expect(usesTeachingEngine("arabic")).toBe(true);
    expect(usesTeachingEngine("vr")).toBe(false);
  });

  it("resolves English reading taxonomy", () => {
    const node = resolveKS2Taxonomy("y5e-read-autumn");
    expect(node?.subjectId).toBe("english");
    expect(node?.strand).toBe("Reading");
    expect(node?.visualRuleId).toBe("literacy");
    const rows = auditKS2CurriculumSubjects(["english"]);
    expect(rows.length).toBeGreaterThan(10);
    expect(rows.every((r) => r.subjectId === "english")).toBe(true);
  });

  it("audits science, computing, arabic curriculum skills", () => {
    const sci = auditKS2CurriculumSubjects(["science"]);
    const comp = auditKS2CurriculumSubjects(["computing"]);
    const arb = auditKS2CurriculumSubjects(["arabic"]);
    expect(sci.length).toBeGreaterThan(5);
    expect(comp.length).toBeGreaterThan(3);
    expect(arb.length).toBeGreaterThan(3);
    expect(sci[0].visualRuleId).toBe("science_enquiry");
    expect(comp[0].visualRuleId).toBe("computing");
    expect(arb[0].visualRuleId).toBe("languages");
  });

  it("accepts English and Science lessons without maths visuals", () => {
    const eng = sampleNonMathsLesson(
      "Reading — Autumn",
      "Inference",
      "Evidence → infer → answer",
    );
    const sci = sampleNonMathsLesson(
      "Forces",
      "Friction",
      "Name the force → show direction → explain effect",
    );
    expect(validateKS2TeachingLesson(eng, { subject: "english" }).ok).toBe(true);
    expect(validateKS2TeachingLesson(sci, { subject: "science" }).ok).toBe(true);
  });

  it("still requires visuals for maths", () => {
    const maths = sampleNonMathsLesson("Fractions", "Compare", "LCD");
    const v = validateKS2TeachingLesson(maths, { subject: "maths" });
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.code === "missing_visual")).toBe(true);
  });

  it("rejects geometry placeholders used as science illustrations", () => {
    const science = sampleNonMathsLesson(
      "Forces",
      "Gravity",
      "Name the force → show direction → explain effect",
    );
    science.workedExample.whiteboard = {
      intro: "Use this force-arrow diagram.",
      blocks: [{ type: "labeled_shape", shape: "polygon" }],
      conclusion: "Gravity pulls down.",
    };

    const result = validateKS2TeachingLesson(science, { subject: "science" });
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "subject_visual_mismatch")).toBe(true);
  });

  it("covers GPS English topics in prompt extras", () => {
    expect(isEnglishGpsTopic("Grammar, Punctuation & Spelling")).toBe(true);
    expect(
      englishLessonExtra("English", "Grammar, Punctuation & Spelling", [
        "Relative clauses",
      ]),
    ).toMatch(/GPS/i);
  });

  it("emits subject lesson extras", () => {
    expect(scienceLessonExtra("Science", "Forces", ["Friction"])).toMatch(/SCIENCE/i);
    expect(scienceLessonExtra("Science", "Forces", ["Gravity"])).toMatch(/force_diagram/);
    expect(scienceLessonExtra("Science", "Forces", ["Gravity"])).toMatch(/Never use labeled_shape/);
    expect(computingLessonExtra("Computing", "Programming", ["Scratch"])).toMatch(
      /COMPUTING/i,
    );
    expect(arabicLessonExtra("Arabic", "Greetings", ["Hello"])).toMatch(/ARABIC/i);
  });
});
