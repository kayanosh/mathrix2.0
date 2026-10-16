/**
 * Dump the SERVED form of the highest-risk unreviewed lessons, in full, so a
 * human (or an assistant acting before one) can actually check the maths.
 *
 * This is the companion to scripts/triage-ks2-lesson-review.ts: that ranks,
 * this prints. It deliberately shows the served form — the triage exists
 * because stored content and served content differ, and checking the wrong one
 * produces confident nonsense (see DEF-039).
 *
 * Usage: npx tsx scripts/dump-triage-top.ts [--top N] [--subject maths]
 *                                           [--skip N] [--topic <substring>]
 *
 * Reads lesson content only — no pupil data, no writes.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { triageCachedLesson, type LessonTriage } from "@/lib/ks2-lesson-triage";
import { getKS2TopicById, listAllKS2Topics } from "@/lib/ks2";
import type { CachedKS2Lesson } from "@/lib/ks2-lesson-cache";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      env[t.slice(0, eq)] = t.slice(eq + 1);
    }
  } catch {
    /* fall back to process.env */
  }
  return { ...env, ...process.env } as Record<string, string>;
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1] ?? null;
}

function show(label: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  console.log(`  ${label}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
}

async function main() {
  const env = loadEnv();
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  let rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from("ks2_lesson_cache")
      .select("cache_key,topic_id,topic_name,hit_count,lesson_json")
      .range(from, from + 499);
    if (error) {
      console.error("Cache read failed:", error.message);
      process.exit(2);
    }
    rows = rows.concat(data as Record<string, unknown>[]);
    if (!data || data.length < 500) break;
  }

  const subjectOf = new Map(
    listAllKS2Topics().map((t) => [t.id, String(t.subjectId)]),
  );

  const assessed: {
    row: Record<string, unknown>;
    subject: string;
    served: CachedKS2Lesson;
    triage: LessonTriage;
  }[] = [];
  for (const row of rows) {
    const lesson = row.lesson_json as CachedKS2Lesson | null;
    if (!lesson) continue;
    if ((lesson.reviewStatus || "unreviewed") !== "unreviewed") continue;
    const topicId = String(row.topic_id ?? "");
    const ctx = getKS2TopicById(topicId);
    const subject = String(subjectOf.get(topicId) ?? "unknown");
    const triage = triageCachedLesson(lesson, {
      topicId,
      topicName: (row.topic_name as string) ?? "",
      subtopics: ctx?.topic.subtopics ?? [],
      subject,
      skill: lesson.skill,
      hitCount: (row.hit_count as number) ?? 0,
    });
    assessed.push({
      row,
      subject,
      served: triage.servedWorkedExample
        ? ({ ...lesson, workedExample: triage.servedWorkedExample } as CachedKS2Lesson)
        : lesson,
      triage,
    });
  }

  const subjectFilter = arg("--subject");
  const topicFilter = arg("--topic");
  let filtered = assessed;
  if (subjectFilter) filtered = filtered.filter((a) => a.subject === subjectFilter);
  if (topicFilter) {
    const needle = topicFilter.toLowerCase();
    filtered = filtered.filter((a) =>
      String(a.row.topic_name ?? "").toLowerCase().includes(needle) ||
      String(a.served.skill ?? "").toLowerCase().includes(needle),
    );
  }

  filtered.sort(
    (a, b) =>
      b.triage.score - a.triage.score ||
      ((b.row.hit_count as number) ?? 0) - ((a.row.hit_count as number) ?? 0),
  );

  const skip = Number(arg("--skip") ?? 0);
  const top = Number(arg("--top") ?? 10);
  const slice = filtered.slice(skip, skip + top);

  console.log(`Matched ${filtered.length} unreviewed lessons; showing ${slice.length} from rank ${skip + 1}.\n`);

  for (const [i, a] of slice.entries()) {
    const l = a.served;
    console.log("=".repeat(78));
    console.log(
      `#${skip + i + 1}  [${a.triage.band.toUpperCase()} ${a.triage.score}]  ${a.subject} · ${a.row.topic_name} · ${l.skill ?? "(no skill)"}`,
    );
    console.log(`served ${a.row.hit_count}x · ${a.row.cache_key}`);
    console.log("=".repeat(78));

    show("year", l.yearGroup);
    show("objective", l.learningObjective);
    if (l.workedExample) {
      console.log("\n  WORKED EXAMPLE (as served)");
      show("Q", l.workedExample.question);
      (l.workedExample.steps ?? []).forEach((s, n) =>
        console.log(`    ${n + 1}. ${s}`),
      );
      show("ANSWER", l.workedExample.answer);
      const blocks = l.workedExample.whiteboard?.blocks;
      if (Array.isArray(blocks)) {
        console.log(`    visual blocks: ${blocks.map((b) => (b as { type?: string }).type).join(", ")}`);
        for (const b of blocks) {
          console.log(`      ${JSON.stringify(b).slice(0, 600)}`);
        }
      }
    }
    if (l.keyPoints?.length) {
      console.log("\n  KEY POINTS");
      l.keyPoints.forEach((k) => console.log(`    • ${k}`));
    }
    if (l.commonMistakes?.length) {
      console.log("\n  COMMON MISTAKES");
      for (const m of l.commonMistakes) console.log(`    • ${JSON.stringify(m).slice(0, 300)}`);
    }
    for (const [name, items] of [
      ["GUIDED PRACTICE", l.guidedPractice],
      ["INDEPENDENT PRACTICE", l.independentPractice],
    ] as const) {
      if (Array.isArray(items) && items.length) {
        console.log(`\n  ${name}`);
        for (const it of items) {
          console.log(`    Q: ${JSON.stringify((it as { question?: string }).question)}`);
          console.log(`    A: ${JSON.stringify((it as { answer?: string }).answer)}`);
        }
      }
    }
    if (l.quickCheck) {
      console.log("\n  QUICK CHECK");
      console.log(`    Q: ${JSON.stringify(l.quickCheck.question)}`);
      console.log(`    A: ${JSON.stringify(l.quickCheck.answer)}`);
    }
    if (l.tryThis) {
      console.log("\n  TRY THIS");
      console.log(`    Q: ${JSON.stringify(l.tryThis.question)}`);
      console.log(`    A: ${JSON.stringify(l.tryThis.answer)}`);
    }
    console.log();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
