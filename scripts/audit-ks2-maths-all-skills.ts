/**
 * Runtime content-correctness sweep for EVERY skill of every KS2 maths topic.
 * Usage: npx tsx scripts/audit-ks2-maths-all-skills.ts [baseUrl]
 *
 * Same checks as audit-ks2-maths-runtime (validation, blocking issues,
 * deterministic answer comparison, visual presence) but loops every
 * subtopic instead of one preferred skill per topic.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getKS2TopicById, listAllKS2Topics } from "../lib/ks2";
import {
  normalizeToTeachingLesson,
  validateKS2TeachingLesson,
} from "../lib/ks2-lesson-validator";
import {
  auditKS2MathsPracticeAnswers,
  deterministicMathsAnswer,
  mathsAnswersEquivalent,
} from "../lib/ks2-maths-accuracy";
import type { KS2TeachingLesson } from "../types/ks2-lesson";

const BASE_URL = process.argv[2] || "http://localhost:3000";
const CONCURRENCY = Math.max(
  1,
  Number(process.env.KS2_AUDIT_CONCURRENCY || 3),
);

const PREFERRED_SKILL: Record<string, string> = {
  "y5m-place-value": "Round to the nearest 10, 100, 1000, 10,000 and 100,000",
  "y5m-add-subtract": "Column subtraction of numbers with more than 4 digits",
  "y5m-mult-div-a": "Multiples",
  "y5m-fractions": "Add and subtract fractions",
  "y5m-mult-div-b": "Multiply 2-digit by 2-digit",
  "y5m-decimals-percentages": "Equivalent fractions, decimals and percentages",
  "y5m-perimeter-area": "Perimeter of rectangles",
  "y5m-statistics": "Read and interpret tables",
  "y5m-shape": "Angles on a straight line",
  "y5m-position-direction": "Read and plot coordinates (first quadrant)",
  "y5m-decimals": "Add and subtract decimals",
  "y5m-negative-numbers": "Negative number problems",
  "y5m-converting-units": "Convert metric units",
  "y5m-volume": "What is volume?",
  "y6m-place-value": "Round any number",
  "y6m-add-subtract": "Add and subtract integers",
  "y6m-mult-div": "Order of operations (BIDMAS)",
  "y6m-fractions": "Add and subtract fractions",
  "y6m-converting-units": "Convert metric measures",
  "y6m-ratio": "Calculate ratio",
  "y6m-algebra": "One-step and two-step function machines",
  "y6m-decimals": "Multiply and divide by 10, 100 and 1000",
  "y6m-fdp": "Equivalent fractions, decimals and percentages",
  "y6m-area-perimeter-volume": "Volume of cuboids",
  "y6m-statistics": "The mean",
  "y6m-shape": "Angles in a triangle",
  "y6m-position-direction": "Coordinates in four quadrants",
  "y6m-problem-solving": "Multi-step problem solving",
};

type Kind = "lesson" | "guided";

interface AuditJob {
  topicId: string;
  topic: string;
  skill: string;
  kind: Kind;
}

interface AuditRow extends AuditJob {
  ok: boolean;
  status: number;
  durationMs: number;
  cached: boolean;
  workedQuestion?: string;
  workedAnswer?: string;
  deterministicBuilder?: string;
  issues: string[];
  warnings: string[];
}

async function runJob(job: AuditJob): Promise<AuditRow> {
  const started = Date.now();
  const response = await fetch(`${BASE_URL}/api/ks2-lesson`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topicId: job.topicId,
      subject: "Mathematics",
      topic: job.topic,
      skill: job.skill,
      subtopics: [job.skill],
      target: "school",
      tier: "secure",
      kind: job.kind,
      force: false,
    }),
  });
  const raw = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const issues: string[] = [];
  const warnings: string[] = [];
  const base: AuditRow = {
    ...job,
    ok: false,
    status: response.status,
    durationMs: Date.now() - started,
    cached: raw.cached === true,
    issues,
    warnings,
  };
  if (!response.ok || !raw.lesson || typeof raw.lesson !== "object") {
    issues.push(`HTTP ${response.status}: ${String(raw.error || "missing lesson")}`);
    return base;
  }

  const lesson = raw.lesson as Record<string, unknown>;
  const normalized = normalizeToTeachingLesson(lesson, {
    topic: job.topic,
    skill: job.skill,
  }) as KS2TeachingLesson;
  const validation = validateKS2TeachingLesson(normalized, {
    subject: "maths",
    requireVisual: true,
  });
  const blockingCodes = new Set([
    "answer_before_reasoning",
    "missing_visual",
    "unfit_visual",
    "visual_mismatch",
    "mixed_skill",
    "subject_visual_mismatch",
    "math_answer_mismatch",
    "equation_steps_incomplete",
    "multiples_sequence_invalid",
  ]);
  for (const issue of validation.issues) {
    const message = `${issue.code}: ${issue.message}`;
    if (blockingCodes.has(issue.code)) issues.push(message);
    else warnings.push(message);
  }

  const worked = normalized.workedExample;
  base.workedQuestion = worked?.question;
  base.workedAnswer = worked?.answer;
  if (!worked?.question || !worked.answer) {
    issues.push("missing worked question or answer");
  } else {
    const solved = deterministicMathsAnswer(worked.question);
    if (solved) {
      base.deterministicBuilder = solved.builderId;
      if (!mathsAnswersEquivalent(worked.answer, solved.answer)) {
        issues.push(
          `worked answer mismatch: supplied ${worked.answer}; expected ${solved.answer}`,
        );
      }
    } else {
      warnings.push("worked answer not deterministically checkable");
    }
  }

  for (const mismatch of auditKS2MathsPracticeAnswers(normalized)) {
    issues.push(
      `${mismatch.location} mismatch: supplied ${mismatch.supplied}; expected ${mismatch.expected}`,
    );
  }

  const stepCount = Math.max(
    worked?.steps?.length || 0,
    worked?.teachingSteps?.length || 0,
  );
  if (stepCount < 3 || stepCount > 6) {
    issues.push(`worked step count ${stepCount} is outside 3-6`);
  }
  const blocks = worked?.whiteboard?.blocks || [];
  if (blocks.length === 0) issues.push("worked example has no visual blocks");
  if (
    blocks.some(
      (block) =>
        block.type === "equation_steps" &&
        block.steps.some((step) => !step.latexBefore && !step.latexAfter),
    )
  ) {
    issues.push("worked example contains a blank equation line");
  }

  base.ok = issues.length === 0;
  return base;
}

async function mapConcurrent<T, R>(
  values: T[],
  worker: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, values.length) }, async () => {
      while (true) {
        const index = next;
        next += 1;
        if (index >= values.length) return;
        results[index] = await worker(values[index]);
      }
    }),
  );
  return results;
}

async function main() {
  const topics = listAllKS2Topics().filter(
    (topic) => topic.subjectId === "maths" && topic.section === "curriculum",
  );
  const jobs: AuditJob[] = [];
  for (const topic of topics) {
    const context = getKS2TopicById(topic.id);
    if (!context) continue;
    for (const skill of context.topic.subtopics) {
      jobs.push({ topicId: topic.id, topic: context.topic.name, skill, kind: "lesson" });
    }
  }

  const rows = await mapConcurrent(jobs, async (job) => {
    const row = await runJob(job);
    console.log(
      `${row.ok ? "PASS" : "FAIL"} ${row.kind.padEnd(6)} ${row.topicId} | ${row.skill} | ${row.durationMs}ms`,
    );
    return row;
  });
  const failed = rows.filter((row) => !row.ok);
  const checkedAnswers = rows.filter((row) => row.deterministicBuilder).length;
  const outDir = join(process.cwd(), "scripts/output");
  mkdirSync(outDir, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    topicPages: topics.length,
    flows: rows.length,
    passed: rows.length - failed.length,
    failed: failed.length,
    deterministicallyCheckedWorkedAnswers: checkedAnswers,
    rows,
  };
  writeFileSync(
    join(outDir, "ks2-maths-runtime-audit.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    `KS2 maths runtime audit: ${report.passed}/${report.flows} flows passed across ${report.topicPages} topic pages; ${checkedAnswers} worked answers deterministically checked.`,
  );
  if (failed.length > 0) {
    for (const row of failed) {
      console.error(`${row.topicId} ${row.kind}: ${row.issues.join(" | ")}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
