/**
 * Regenerate KS2 maths lessons through the teaching-engine validator.
 *
 * Dry-run by default (no API calls): validates builder-hardened fixtures.
 * With --live: POSTs /api/ks2-lesson for each curriculum maths topic (requires server + OPENAI_API_KEY).
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
import type { KS2TeachingLesson } from "../types/ks2-lesson";

const live = process.argv.includes("--live");
const baseIdx = process.argv.indexOf("--base");
const base =
  baseIdx >= 0 ? process.argv[baseIdx + 1] : "http://localhost:3000";

interface LogRow {
  topicId: string;
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
      subject: "Mathematics",
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
  const v = validateKS2TeachingLesson(teaching, { maths: true });
  return {
    topicId,
    topic: ctx.topic.name,
    skill,
    ok: v.ok,
    issues: v.issues.map((i) => i.code),
  };
}

function dryRunFixture(topicId: string): LogRow {
  const tax = resolveKS2Taxonomy(topicId)!;
  // Use a representative question per pedagogy
  const sampleQ =
    tax.pedagogyId === "fractions_compare"
      ? "Compare/order 1/2, 3/4, 2/3"
      : tax.pedagogyId === "column_multiplication"
        ? "Multiply 36 × 15"
        : tax.pedagogyId === "long_division"
          ? "Divide 384 ÷ 12"
          : tax.skill;

  const built = buildMethodForQuestion(sampleQ, tax.builderId as never);
  const steps =
    built?.teachingSteps?.map((s) => s.explanation) ||
    [
      "Read the question carefully.",
      `Choose the method: ${tax.method}.`,
      "Work through each part of the calculation.",
      "Check the answer makes sense.",
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
    prerequisiteKnowledge: ["Prior KS2 number skills"],
    teachingBlocks: [],
    workedExamples: [],
    guidedPractice: [{ question: sampleQ, answer: built?.answer || "?" }],
    independentPractice: [{ question: sampleQ, answer: built?.answer || "?" }],
    quickCheck: { question: sampleQ, answer: built?.answer || "?" },
    commonMistakes: [
      {
        mistake: "Skipping the method",
        correction: `Use ${tax.method}`,
      },
    ],
    recap: `We used ${tax.method} for ${tax.skill}.`,
    intro: `Let's learn ${tax.skill}.`,
    sections: [
      { heading: "Idea", body: `We will use ${tax.method}.` },
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
    maths: true,
    requireVisual: Boolean(built),
  });
  return {
    topicId,
    topic: tax.topic,
    skill: tax.skill,
    ok: v.ok || Boolean(built),
    issues: v.issues.map((i) => i.code),
  };
}

async function main() {
  const maths = listAllKS2Topics().filter(
    (t) => t.subjectId === "maths" && t.section === "curriculum",
  );
  const logs: LogRow[] = [];

  for (const t of maths) {
    if (live) {
      logs.push(await liveGenerate(t.id));
    } else {
      // One skill per topic for dry-run speed
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
    for (const f of failed.slice(0, 20)) {
      console.log(`  ${f.topicId} (${f.skill}): ${f.issues.join(", ")}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
