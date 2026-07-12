/**
 * Validate all KS2 teaching-engine lessons (deterministic fixtures + quality gate).
 *
 * Usage:
 *   npm run validate:ks2-lessons
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { listAllKS2Topics, getKS2TopicById } from "../lib/ks2";
import { resolveKS2Taxonomy, type KS2TaxonomyNode } from "../lib/ks2-taxonomy";
import { buildMethodForQuestion } from "../lib/methods";
import {
  validateKS2TeachingLesson,
  assertNoGcd,
} from "../lib/ks2-lesson-validator";
import { usesTeachingEngine } from "../lib/ks2-subject-pedagogy/shared";
import type { KS2TeachingLesson } from "../types/ks2-lesson";

const SUBJECTS = ["maths", "english", "science", "computing", "arabic"] as const;

interface Row {
  topicId: string;
  subjectId: string;
  route: string;
  topic: string;
  skill: string;
  ok: boolean;
  issues: string[];
  reasons: string[];
}

function sampleQuestion(tax: KS2TaxonomyNode): string {
  if (tax.subjectId !== "maths") {
    if (tax.subjectId === "english")
      return "Find evidence that shows how the character feels.";
    if (tax.subjectId === "science")
      return "Plan a fair test to compare which surface has more friction.";
    if (tax.subjectId === "computing")
      return "Write an algorithm to make a sprite move three steps.";
    return "Match these Arabic greetings to their English meanings.";
  }
  if (tax.pedagogyId === "fraction_simplify" || /simplif/i.test(tax.skill)) {
    return "Simplify 12/16";
  }
  if (tax.pedagogyId === "fractions_compare") {
    return "Compare/order 1/2, 3/4, 2/3";
  }
  return tax.skill;
}

function skillMistakes(tax: KS2TaxonomyNode) {
  if (tax.pedagogyId === "fraction_simplify") {
    return [
      {
        mistake: "Dividing only the numerator and not the denominator",
        correction: "Divide numerator and denominator by the same HCF",
      },
    ];
  }
  if (tax.commonMistakes.length) return tax.commonMistakes;
  return [
    {
      mistake: "Skipping the method",
      correction: `Use ${tax.method}`,
    },
  ];
}

function validateSkill(topicId: string, skill: string): Row {
  const tax = resolveKS2Taxonomy(topicId, skill)!;
  const sampleQ = sampleQuestion(tax);
  const built =
    tax.subjectId === "maths"
      ? buildMethodForQuestion(sampleQ, tax.builderId as never)
      : null;

  const steps = built?.teachingSteps?.map((s) => s.explanation) || [
    "Read the question carefully.",
    `Choose the method: ${tax.method}.`,
    "Work through each part carefully.",
    "Explain why this step works for the skill.",
    "Check the answer makes sense.",
    "Write the final answer clearly.",
  ];

  const teachingSteps =
    built?.teachingSteps?.map((s, i) =>
      i === 0 || s.why
        ? { ...s, why: s.why || `This is how ${tax.method} works.` }
        : s,
    ) ||
    steps.map((explanation, i) => ({
      title: `Step ${i + 1}`,
      explanation,
      why: i === 0 ? `This is how ${tax.method} works.` : undefined,
      narration: explanation,
      cellKeys: [] as string[],
      carryKeys: [] as string[],
      noteKeys: [] as string[],
    }));

  const lesson: KS2TeachingLesson = {
    schemaVersion: 2,
    keyStage: "KS2",
    yearGroup: tax.yearGroup,
    strand: tax.strand,
    topic: tax.topic,
    skill: tax.skill,
    method: tax.method,
    learningObjective: `Learn ${tax.skill}`,
    prerequisiteKnowledge: tax.prerequisites,
    teachingBlocks: [],
    workedExamples: [],
    guidedPractice: [
      { question: sampleQ, answer: built?.answer || "see method" },
    ],
    independentPractice: [
      { question: sampleQ, answer: built?.answer || "see method" },
    ],
    quickCheck: { question: sampleQ, answer: built?.answer || "see method" },
    commonMistakes: skillMistakes(tax),
    recap: `For ${tax.skill}, use ${tax.method}. Check your working.`,
    intro: `Let's learn ${tax.skill}.`,
    sections: [
      {
        heading: "Core idea",
        body: `We will use ${tax.method} for ${tax.skill}.`,
      },
    ],
    workedExample: {
      question: sampleQ,
      steps,
      answer: built?.answer || "see method",
      whiteboard: built
        ? {
            intro: built.intro || "",
            blocks: [built.block, ...(built.extraBlocks || [])],
            conclusion: built.answer || "",
          }
        : undefined,
      teachingSteps,
    },
    keyPoints: [tax.method],
  };

  const v = validateKS2TeachingLesson(lesson, {
    subject: tax.subjectId,
    requireVisual: tax.subjectId === "maths" && Boolean(built),
  });
  const issues = [...v.issues];
  if (!assertNoGcd(JSON.stringify(lesson))) {
    issues.push({
      code: "uk_gcd_forbidden",
      message: "GCD found in lesson content",
    });
  }

  return {
    topicId,
    subjectId: tax.subjectId,
    route: tax.route,
    topic: tax.topic,
    skill: tax.skill,
    ok: issues.length === 0,
    issues: issues.map((i) => i.code),
    reasons: issues.map((i) => i.message),
  };
}

async function main() {
  const topics = listAllKS2Topics().filter(
    (t) =>
      SUBJECTS.includes(t.subjectId as (typeof SUBJECTS)[number]) &&
      t.section === "curriculum" &&
      usesTeachingEngine(t.subjectId),
  );

  const rows: Row[] = [];
  for (const t of topics) {
    const ctx = getKS2TopicById(t.id);
    if (!ctx) continue;
    const skills =
      ctx.topic.subtopics.length > 0 ? ctx.topic.subtopics : [ctx.topic.name];
    for (const skill of skills) {
      rows.push(validateSkill(t.id, skill));
    }
  }

  const failed = rows.filter((r) => !r.ok);
  const passed = rows.filter((r) => r.ok);
  const outDir = join(process.cwd(), "scripts/output");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "ks2-validate-log.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        passed: passed.length,
        failed: failed.length,
        passedLessons: passed.map((r) => ({
          route: r.route,
          topic: r.topic,
          skill: r.skill,
        })),
        failedLessons: failed.map((r) => ({
          route: r.route,
          topic: r.topic,
          skill: r.skill,
          topicId: r.topicId,
          issues: r.issues,
          reasons: r.reasons,
        })),
      },
      null,
      2,
    ),
  );

  console.log(
    `KS2 lesson validation: ${passed.length} passed, ${failed.length} failed`,
  );
  if (failed.length) {
    console.log("\nFailed lessons:");
    for (const f of failed.slice(0, 40)) {
      console.log(
        `  ${f.route} | ${f.topic} | ${f.skill}\n    → ${f.issues.join(", ")}`,
      );
    }
    if (failed.length > 40) console.log(`  …and ${failed.length - 40} more`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
