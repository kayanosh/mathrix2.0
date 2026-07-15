/**
 * Warm missing KS2 v19 lesson-cache entries through the public lesson route.
 *
 * Examples:
 *   npm run warm:ks2-lessons -- --base http://localhost:3000 --subject maths
 *   npm run warm:ks2-lessons -- --topic y6m-fractions --kind lesson,guided
 *   npm run warm:ks2-lessons -- --all-topics --first-skill --kind lesson
 */

import { getKS2TopicById, listAllKS2Topics } from "../lib/ks2";
import { usesTeachingEngine } from "../lib/ks2-subject-pedagogy/shared";

type LessonKind = "lesson" | "guided";

interface WarmItem {
  topicId: string;
  subjectId: string;
  subject: string;
  topic: string;
  skill: string;
  kind: LessonKind;
  target: string;
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const base = (arg("base") || "http://localhost:3000").replace(/\/$/, "");
const topicFilter = arg("topic");
const allTopics = process.argv.includes("--all-topics");
const firstSkillOnly = process.argv.includes("--first-skill");
const subjectFilter = (arg("subject") || "maths")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const kinds = (arg("kind") || "lesson,guided")
  .split(",")
  .map((value) => value.trim())
  .filter((value): value is LessonKind => value === "lesson" || value === "guided");
const targetOverride = arg("target");
const tier = arg("tier") || "secure";
const concurrency = Math.min(Math.max(Number(arg("concurrency")) || 2, 1), 5);

const items: WarmItem[] = listAllKS2Topics()
  .filter(
    (topic) =>
      (allTopics ||
        (topic.section === "curriculum" &&
          usesTeachingEngine(topic.subjectId) &&
          subjectFilter.includes(topic.subjectId.toLowerCase()))) &&
      (!topicFilter || topic.id === topicFilter),
  )
  .flatMap((topic) => {
    const context = getKS2TopicById(topic.id);
    if (!context) return [];
    const allSkills = context.topic.subtopics.length
      ? context.topic.subtopics
      : [context.topic.name];
    const skills = firstSkillOnly ? allSkills.slice(0, 1) : allSkills;
    return skills.flatMap((skill) =>
      kinds.map((kind) => ({
        topicId: topic.id,
        subjectId: context.subject.id,
        subject: context.subject.name,
        topic: context.topic.name,
        skill,
        kind,
        target: targetOverride || context.section,
      })),
    );
  });

let nextIndex = 0;
let warmed = 0;
let alreadyCached = 0;
const failures: string[] = [];

async function warm(item: WarmItem): Promise<void> {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${base}/api/ks2-lesson`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicId: item.topicId,
        subject: item.subject,
        topic: item.topic,
        skill: item.skill,
        subtopics: [item.skill],
        target: item.target,
        tier,
        kind: item.kind,
        force: false,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      cached?: boolean;
      cacheable?: boolean;
      error?: string;
      issues?: string[];
      qualityWarnings?: string[];
    };
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    if (!response.ok) {
      failures.push(
        `${item.topicId}/${item.kind}/${item.skill}: HTTP ${response.status} ${data.error || ""} ${(data.issues || []).join(",")}`.trim(),
      );
      console.error(`FAIL ${item.topicId} | ${item.kind} | ${item.skill} (${seconds}s)`);
      return;
    }
    if (!data.cached && data.cacheable === false) {
      failures.push(
        `${item.topicId}/${item.kind}/${item.skill}: generated but not cached ${(data.qualityWarnings || []).join(",")}`.trim(),
      );
      console.error(`SKIP ${item.topicId} | ${item.kind} | ${item.skill} (${seconds}s)`);
      return;
    }
    if (data.cached) alreadyCached += 1;
    else warmed += 1;
    console.log(
      `${data.cached ? "HIT " : "WARM"} ${item.topicId} | ${item.kind} | ${item.skill} (${seconds}s)`,
    );
  } catch (error) {
    failures.push(
      `${item.topicId}/${item.kind}/${item.skill}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function worker(): Promise<void> {
  while (nextIndex < items.length) {
    const item = items[nextIndex++];
    await warm(item);
  }
}

async function main(): Promise<void> {
  if (items.length === 0) {
    throw new Error("No KS2 lessons matched the supplied filters.");
  }
  console.log(
    `Warming ${items.length} lesson variants via ${base} with concurrency ${concurrency}...`,
  );
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  console.log(
    `Warm complete: ${warmed} generated, ${alreadyCached} already cached, ${failures.length} failed.`,
  );
  if (failures.length) {
    for (const failure of failures) console.error(`  ${failure}`);
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
