/**
 * Shapes-topic visual-vs-question audit: does the rendered image match the
 * question, and is the maths correct?
 * Usage: npx tsx scripts/audit-ks2-shapes-visuals.ts [baseUrl]
 *
 * For every skill of every KS2 shapes topic (shape, position & direction,
 * perimeter & area, volume — years 5 and 6) this checks:
 *   1. Standard lesson validation (blocking issues)
 *   2. Deterministic answer verification where the question is solvable
 *   3. Image/question consistency:
 *      - L-shaped/rectilinear perimeter → rectilinear labeled_shape whose
 *        perimeter equals the stated answer
 *      - "lines of symmetry" → symmetryLines matches the stated answer
 *      - protractor questions → protractor block with the question's angle
 *      - named shapes (triangle/circle/rectangle/polygon) → matching shape
 *      - every labeled_shape uses a shape name the renderer supports
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getKS2TopicById } from "../lib/ks2";
import {
  normalizeToTeachingLesson,
  validateKS2TeachingLesson,
} from "../lib/ks2-lesson-validator";
import {
  deterministicMathsAnswer,
  mathsAnswersEquivalent,
} from "../lib/ks2-maths-accuracy";
import type { KS2TeachingLesson } from "../types/ks2-lesson";

const BASE_URL = process.argv[2] || "http://localhost:3000";
const CONCURRENCY = Math.max(1, Number(process.env.KS2_AUDIT_CONCURRENCY || 3));

const SHAPE_TOPICS = [
  "y5m-perimeter-area",
  "y5m-shape",
  "y5m-position-direction",
  "y5m-volume",
  "y6m-area-perimeter-volume",
  "y6m-shape",
  "y6m-position-direction",
];

const KNOWN_SHAPES = new Set([
  "triangle",
  "circle",
  "rectangle",
  "parallelogram",
  "trapezium",
  "polygon",
  "rectilinear",
  "cuboid",
  "net",
  "straight_line",
  "around_point",
]);

interface Row {
  topicId: string;
  skill: string;
  ok: boolean;
  status: number;
  cached: boolean;
  checks: string[];
  failures: string[];
}

type Block = { type?: string; [k: string]: unknown };

function questionNumbers(q: string): number[] {
  return (q.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) || []).map(Number);
}

function checkVisualConsistency(
  question: string,
  answer: string,
  blocks: Block[],
  failures: string[],
  checks: string[],
) {
  const q = question.toLowerCase();
  const shapes = blocks.filter((b) => b.type === "labeled_shape");

  // Every shape block must use a supported shape name (the dialect guard).
  for (const s of shapes) {
    checks.push("labeled_shape uses a renderer-supported shape name");
    if (!KNOWN_SHAPES.has(String(s.shape))) {
      failures.push(
        `labeled_shape shape "${String(s.shape)}" is not renderer-supported (renders as a bare polygon)`,
      );
    }
  }

  // Rectilinear / L-shaped perimeter questions.
  if (/perimeter/.test(q) && /rectilinear|l-?shaped|compound/.test(q)) {
    checks.push("rectilinear question uses the rectilinear shape");
    const rect = shapes.find((s) => s.shape === "rectilinear");
    if (!rect) {
      failures.push("rectilinear perimeter question has no rectilinear shape block");
    } else {
      const r = rect.rectilinear as
        | { width: number; height: number; notchWidth: number; notchHeight: number }
        | undefined;
      if (!r || !(r.width > r.notchWidth && r.height > r.notchHeight)) {
        failures.push("rectilinear shape has impossible dimensions");
      } else {
        const perimeter = 2 * (r.width + r.height);
        const ans = questionNumbers(answer)[0];
        checks.push(`rectilinear perimeter ${perimeter} matches answer`);
        if (ans !== undefined && Math.abs(ans - perimeter) > 1e-9) {
          failures.push(
            `rectilinear image perimeter ${perimeter} but answer says ${ans}`,
          );
        }
      }
    }
  }

  // Lines of symmetry questions.
  if (/lines? of symmetry/.test(q)) {
    checks.push("symmetry question draws symmetry lines");
    const withLines = shapes.find(
      (s) => typeof s.symmetryLines === "number" && (s.symmetryLines as number) > 0,
    );
    if (!withLines) {
      failures.push("symmetry question has no symmetryLines on its shape");
    } else {
      // Only compare against an explicit "N lines" phrase — yes/no
      // questions answer "Yes, the line x = 0 …", and grabbing the first
      // number would read the 0 from the equation as a line count.
      const m = /(\d+)\s*lines?/i.exec(answer);
      checks.push("symmetryLines count matches the answer");
      if (m && Number(m[1]) !== withLines.symmetryLines) {
        failures.push(
          `shape draws ${String(withLines.symmetryLines)} lines but answer says ${m[1]}`,
        );
      }
    }
  }

  // Protractor questions.
  if (/protractor|measur\w*[^.!?]*\bangle|\bangle[^.!?]*measur\w*/i.test(question)) {
    checks.push("angle-measuring question shows a protractor");
    const prot = blocks.find((b) => b.type === "protractor");
    if (!prot) {
      failures.push("angle-measuring question has no protractor block");
    } else {
      const nums = questionNumbers(question);
      const angle = Number(prot.angle);
      checks.push("protractor angle comes from the question");
      if (nums.length > 0 && !nums.some((n) => Math.abs(n - angle) < 1e-9)) {
        failures.push(
          `protractor shows ${angle}° but the question only mentions ${nums.join(", ")}`,
        );
      }
    }
  }

  // Named shape consistency (when the question names a specific shape).
  const named: [RegExp, string][] = [
    [/\btriangle/, "triangle"],
    [/\bcircle/, "circle"],
    [/\brectangle\b|\boblong\b/, "rectangle"],
  ];
  for (const [re, expected] of named) {
    if (re.test(q) && !/rectilinear|l-?shaped/.test(q) && shapes.length > 0) {
      checks.push(`question's ${expected} matches the drawn shape`);
      const match = shapes.some((s) => s.shape === expected || s.shape === "polygon");
      if (!match) {
        failures.push(
          `question is about a ${expected} but the shape is "${String(shapes[0].shape)}"`,
        );
      }
    }
  }
}

async function runSkill(topicId: string, topicName: string, skill: string): Promise<Row> {
  const response = await fetch(`${BASE_URL}/api/ks2-lesson`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topicId,
      subject: "Mathematics",
      topic: topicName,
      skill,
      subtopics: [skill],
      target: "school",
      tier: "secure",
      kind: "lesson",
      force: false,
    }),
  });
  const raw = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const checks: string[] = [];
  const failures: string[] = [];

  if (response.status !== 200) {
    return {
      topicId,
      skill,
      ok: false,
      status: response.status,
      cached: raw.cached === true,
      checks,
      failures: [
        `HTTP ${response.status}: ${String(raw.error || "request failed").slice(0, 160)}`,
      ],
    };
  }

  const lesson = normalizeToTeachingLesson(
    raw.lesson as Partial<KS2TeachingLesson>,
    { topic: topicName, skill },
  );
  const v = validateKS2TeachingLesson(lesson, {
    subject: "maths",
    requireVisual: true,
  });
  for (const issue of v.issues) {
    failures.push(`validator: ${issue.code}`);
  }

  const we = (lesson as KS2TeachingLesson).workedExample;
  const question = String(we?.question || "");
  const answer = String(we?.answer || "");
  const blocks = ((we?.whiteboard?.blocks || []) as Block[]).filter(Boolean);

  // Deterministic answer check
  if (question) {
    const expected = deterministicMathsAnswer(question);
    if (expected) {
      checks.push(`answer verified by ${expected.builderId}`);
      if (!mathsAnswersEquivalent(answer, expected.answer)) {
        failures.push(
          `wrong answer: "${answer}" (expected "${expected.answer}")`,
        );
      }
    }
  }

  if (question) checkVisualConsistency(question, answer, blocks, failures, checks);

  return {
    topicId,
    skill,
    ok: failures.length === 0,
    status: response.status,
    cached: raw.cached === true,
    checks,
    failures,
  };
}

async function main() {
  const jobs: { topicId: string; topic: string; skill: string }[] = [];
  for (const topicId of SHAPE_TOPICS) {
    const context = getKS2TopicById(topicId);
    if (!context?.topic) continue;
    for (const skill of context.topic.subtopics) {
      jobs.push({ topicId, topic: context.topic.name, skill });
    }
  }
  console.log(`Auditing ${jobs.length} shape-topic skills against ${BASE_URL}`);

  const rows: Row[] = [];
  let index = 0;
  async function worker() {
    while (index < jobs.length) {
      const job = jobs[index++];
      const row = await runSkill(job.topicId, job.topic, job.skill);
      rows.push(row);
      console.log(
        `${row.ok ? "PASS" : "FAIL"} ${row.topicId} | ${job.skill}${row.cached ? " (cached)" : ""}`,
      );
      for (const f of row.failures) console.log(`     - ${f}`);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()),
  );

  const pass = rows.filter((r) => r.ok).length;
  console.log(`\nShapes visual audit: ${pass}/${rows.length} skills pass`);
  mkdirSync(join(process.cwd(), "scripts", "output"), { recursive: true });
  writeFileSync(
    join(process.cwd(), "scripts", "output", "ks2-shapes-visual-audit.json"),
    JSON.stringify(rows, null, 2),
  );
  if (pass !== rows.length) process.exitCode = 1;
}

void main();
