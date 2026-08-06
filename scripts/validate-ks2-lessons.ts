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
import { deterministicMathsAnswer } from "../lib/ks2-maths-accuracy";
import {
  validateKS2TeachingLesson,
  assertNoGcd,
} from "../lib/ks2-lesson-validator";
import { usesTeachingEngine } from "../lib/ks2-subject-pedagogy/shared";
import type { KS2TeachingLesson } from "../types/ks2-lesson";
import REAL_SAMPLE_QUESTIONS_JSON from "./fixtures/ks2-sample-questions.json";

/**
 * Real questions these skills have actually generated, keyed "topic|skill".
 * Committed so this validator stays offline and deterministic for CI;
 * regenerate with `npx tsx scripts/generate-sample-questions.ts` (DEF-009).
 */
const REAL_SAMPLE_QUESTIONS = REAL_SAMPLE_QUESTIONS_JSON as Record<string, string>;

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
  if (
    tax.pedagogyId === "place_value_rounding" ||
    /\bround\b/i.test(tax.skill)
  ) {
    if (/decimal/i.test(tax.skill + tax.topic)) {
      return "Round 3.456 to 2 decimal places";
    }
    return "Round 57,892 to the nearest 10,000";
  }
  // DEF-008/DEF-009: comma-formatted numbers >= 1,000 are exactly the case
  // that exposed a real production bug (a shared operand parser silently
  // truncated them), and this harness could not have caught it while every
  // sample question here was either a decimal or a plain skill-name string —
  // never a realistic large-number question. Cover the two skills directly
  // implicated (see MATHRIX_DEFECT_REGISTER.csv DEF-008).
  if (/more than 4 digits/i.test(tax.skill)) {
    return /subtract/i.test(tax.skill)
      ? "62,403 - 27,568"
      : "47,586 + 28,749";
  }
  // DEF-009: prefer a REAL question this skill has actually generated, taken
  // from the committed fixture (scripts/generate-sample-questions.ts). Testing
  // a skill against its own NAME cannot catch a wrong-answer defect — that is
  // precisely how DEF-008 survived a run reporting "377/378 passed". Every
  // wrong-answer defect in this audit came from a real generated question.
  const real = REAL_SAMPLE_QUESTIONS[`${tax.topic}|${tax.skill}`];
  if (real) return real;

  // Still nothing real on record: fall back to the skill name, but say so
  // loudly rather than passing silently.
  console.warn(
    `[validate-ks2-lessons] no realistic sample question for maths skill "${tax.skill}" (topic ${tax.topic}) — testing against the skill name as a placeholder question, which cannot catch a wrong-answer defect for this skill. Regenerate the fixture with: npx tsx scripts/generate-sample-questions.ts. See DEF-009.`,
  );
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

  // Use the SAME answer source production uses. The column/division builders
  // put their result on block.answer rather than the top-level answer, so
  // reading only `built.answer` stored the literal string "see method" as the
  // answer to a deterministically solvable question — which the accuracy audit
  // then (correctly) flagged as a mismatch once DEF-026 taught it to solve
  // column arithmetic. Fixture and production must agree, or the harness
  // reports its own inconsistency as a lesson defect.
  const solvedAnswer =
    tax.subjectId === "maths"
      ? (deterministicMathsAnswer(sampleQ)?.answer ?? built?.answer ?? null)
      : (built?.answer ?? null);
  const answerText = solvedAnswer || "see method";

  // A builder legitimately yields only 1-2 steps for many real questions
  // ("Write 0.37 as a fraction" is one step), while the validator requires at
  // least 3 and wants reasoning before the answer. A REAL lesson meets those
  // from its LLM-authored teaching content, which this synthetic fixture has
  // none of — so without scaffolding, switching to real questions (DEF-009)
  // made the harness report 46 `few_steps`/`answer_before_reasoning` failures
  // that say nothing about the lessons, only about the fixture. Scaffold the
  // builder's steps up to the structural minimum, keeping the builder's own
  // content (which is what this harness exists to check) and placing it LAST
  // so the answer never precedes the reasoning.
  const MIN_STEPS = 3;
  const scaffoldFor = (n: number) =>
    [
      "Read the question carefully and note what is being asked.",
      `Choose the method: ${tax.method}.`,
      "Set out the working before calculating.",
    ].slice(0, Math.max(0, n));

  const builderExplanations = built?.teachingSteps?.map((s) => s.explanation);
  const steps = builderExplanations
    ? [
        ...scaffoldFor(MIN_STEPS - builderExplanations.length),
        ...builderExplanations,
      ]
    : [
        "Read the question carefully.",
        `Choose the method: ${tax.method}.`,
        "Work through each part carefully.",
        "Explain why this step works for the skill.",
        "Check the answer makes sense.",
        "Write the final answer clearly.",
      ];

  const scaffoldSteps = (built?.teachingSteps
    ? scaffoldFor(MIN_STEPS - built.teachingSteps.length)
    : []
  ).map((explanation, i) => ({
    title: i === 0 ? "Understand the question" : `Set up (${i + 1})`,
    explanation,
    why: `This is how ${tax.method} works.`,
    narration: explanation,
    cellKeys: [] as string[],
    carryKeys: [] as string[],
    noteKeys: [] as string[],
  }));

  const teachingSteps = built?.teachingSteps
    ? [
        ...scaffoldSteps,
        ...built.teachingSteps.map((s, i) =>
          i === 0 || s.why
            ? { ...s, why: s.why || `This is how ${tax.method} works.` }
            : s,
        ),
      ]
    : steps.map((explanation, i) => ({
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
      { question: sampleQ, answer: answerText },
    ],
    independentPractice: [
      { question: sampleQ, answer: answerText },
    ],
    quickCheck: { question: sampleQ, answer: answerText },
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
      answer: answerText,
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
