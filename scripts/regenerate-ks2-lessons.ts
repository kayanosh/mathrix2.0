/**
 * Regenerate KS2 teaching-engine lessons through the validator (dry-run or live).
 *
 * Usage:
 *   npx tsx scripts/regenerate-ks2-lessons.ts
 *   npx tsx scripts/regenerate-ks2-lessons.ts --live --base http://localhost:3000
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { listAllKS2Topics, getKS2TopicById } from "../lib/ks2";
import { resolveKS2Taxonomy } from "../lib/ks2-taxonomy";
import { buildMethodForQuestion } from "../lib/methods";
import {
  normalizeToTeachingLesson,
  validateKS2TeachingLesson,
} from "../lib/ks2-lesson-validator";
import { usesTeachingEngine } from "../lib/ks2-subject-pedagogy/shared";
import type { KS2TeachingLesson } from "../types/ks2-lesson";

const live = process.argv.includes("--live");
const baseIdx = process.argv.indexOf("--base");
const base =
  baseIdx >= 0 ? process.argv[baseIdx + 1] : "http://localhost:3000";

const SUBJECTS = ["maths", "english", "science", "computing", "arabic"] as const;

interface LogRow {
  topicId: string;
  subjectId: string;
  topic: string;
  skill: string;
  ok: boolean;
  issues: string[];
}

async function liveGenerate(topicId: string): Promise<LogRow> {
  const ctx = getKS2TopicById(topicId)!;
  const skill = ctx.topic.subtopics[0] || ctx.topic.name;
  const res = await fetch(`${base}/api/ks2-lesson`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topicId,
      subject: ctx.subject.name,
      topic: ctx.topic.name,
      subtopics: ctx.topic.subtopics,
      target: "curriculum",
      tier: "secure",
      kind: "lesson",
      force: true,
    }),
  });
  if (!res.ok) {
    return {
      topicId,
      subjectId: ctx.subject.id,
      topic: ctx.topic.name,
      skill,
      ok: false,
      issues: [`http_${res.status}`],
    };
  }
  const data = (await res.json()) as { lesson: Record<string, unknown> };
  const teaching = normalizeToTeachingLesson(data.lesson, {
    topic: ctx.topic.name,
    skill,
  });
  const v = validateKS2TeachingLesson(teaching, {
    subject: ctx.subject.id,
    requireVisual: ctx.subject.id === "maths",
  });
  return {
    topicId,
    subjectId: ctx.subject.id,
    topic: ctx.topic.name,
    skill,
    ok: v.ok,
    issues: v.issues.map((i) => i.code),
  };
}

function dryRunFixture(topicId: string): LogRow {
  const tax = resolveKS2Taxonomy(topicId)!;
  const sampleQ =
    tax.subjectId === "maths"
      ? tax.pedagogyId === "fraction_simplify" || /simplif/i.test(tax.skill)
        ? "Simplify 12/16"
        : tax.pedagogyId === "fractions_compare"
          ? "Compare/order 1/2, 3/4, 2/3"
          : tax.skill
      : tax.subjectId === "english"
        ? "Find evidence that shows how the character feels."
        : tax.subjectId === "science"
          ? "Plan a fair test to compare which surface has more friction."
          : tax.subjectId === "computing"
            ? "Write an algorithm to make a sprite move three steps."
            : "Match these Arabic greetings to their English meanings.";

  const built =
    tax.subjectId === "maths"
      ? buildMethodForQuestion(sampleQ, tax.builderId as never)
      : null;

  const steps = built?.teachingSteps?.map((s) => s.explanation) || [
    "Read the question carefully.",
    `Choose the method: ${tax.method}.`,
    "Work through each part carefully.",
    "Explain why this step works for the skill.",
    "Check the answer makes sense because the method fits the skill.",
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
    guidedPractice: [{ question: sampleQ, answer: built?.answer || "see method" }],
    independentPractice: [
      { question: sampleQ, answer: built?.answer || "see method" },
    ],
    quickCheck: { question: sampleQ, answer: built?.answer || "see method" },
    commonMistakes:
      tax.pedagogyId === "fraction_simplify"
        ? [
            {
              mistake: "Dividing only the numerator and not the denominator",
              correction: "Divide numerator and denominator by the same HCF",
            },
          ]
        : tax.commonMistakes.length
          ? tax.commonMistakes
          : [
              {
                mistake: "Skipping the method",
                correction: `Use ${tax.method}`,
              },
            ],
    recap: `For ${tax.skill}, use ${tax.method}. Check your working.`,
    intro: `Let's learn ${tax.skill}.`,
    sections: [{ heading: "Idea", body: `We will use ${tax.method}.` }],
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
  return {
    topicId,
    subjectId: tax.subjectId,
    topic: tax.topic,
    skill: tax.skill,
    ok: v.ok,
    issues: v.issues.map((i) => i.code),
  };
}

async function main() {
  const topics = listAllKS2Topics().filter(
    (t) =>
      SUBJECTS.includes(t.subjectId as (typeof SUBJECTS)[number]) &&
      t.section === "curriculum" &&
      usesTeachingEngine(t.subjectId),
  );
  const logs: LogRow[] = [];

  for (const t of topics) {
    if (live) {
      logs.push(await liveGenerate(t.id));
    } else {
      logs.push(dryRunFixture(t.id));
    }
  }

  const failed = logs.filter((l) => !l.ok);
  const outDir = join(process.cwd(), "scripts/output");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "ks2-regen-log.json"),
    JSON.stringify(
      {
        mode: live ? "live" : "dry-run",
        generatedAt: new Date().toISOString(),
        passed: logs.length - failed.length,
        failed: failed.length,
        logs,
      },
      null,
      2,
    ),
  );

  console.log(
    `Regen ${live ? "live" : "dry-run"}: ${logs.length - failed.length}/${logs.length} passed`,
  );
  if (failed.length) {
    console.log("Failures:");
    for (const f of failed.slice(0, 25)) {
      console.log(
        `  ${f.subjectId}/${f.topicId} (${f.skill}): ${f.issues.join(", ")}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
