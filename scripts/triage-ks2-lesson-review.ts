/**
 * Rank the KS2 lesson review backlog by risk (DEF-003).
 *
 * The review queue is ~440 lessons deep and a human reviews maybe a few dozen
 * in a sitting, so the ordering decides what actually gets looked at. This
 * produces the same ranking the admin queue serves (both call
 * lib/ks2-lesson-triage — one scorer, so the report and the UI cannot drift),
 * as a report a teacher or head can read without logging in.
 *
 * Complements scripts/audit-ks2-cache-health.ts rather than repeating it: that
 * script asks "what would the serve path DISCARD", this one asks "of what the
 * serve path KEEPS, where is human judgement the only check". The two barely
 * overlap — a row discarded on serve never reaches a pupil, so it scores low
 * here on purpose.
 *
 * Usage: npx tsx scripts/triage-ks2-lesson-review.ts [--csv] [--top N]
 *   --csv     write audit/evidence/ks2-review-triage.csv (one row per lesson)
 *   --top N   how many to print (default 25)
 *
 * Reads lesson content only — no pupil data. Makes no writes to the database.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
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

interface Row {
  cache_key: string;
  topic_id: string | null;
  topic_name: string | null;
  subject: string | null;
  tier: string | null;
  kind: string | null;
  hit_count: number | null;
  lesson_json: CachedKS2Lesson | null;
}

function pct(n: number, d: number): string {
  return d ? `${Math.round((n / d) * 100)}%` : "n/a";
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(2);
  }
  const db = createClient(url, key, { auth: { persistSession: false } });

  let rows: Row[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from("ks2_lesson_cache")
      .select("cache_key,topic_id,topic_name,subject,tier,kind,hit_count,lesson_json")
      .range(from, from + 499);
    if (error) {
      console.error("Cache read failed:", error.message);
      process.exit(2);
    }
    rows = rows.concat(data as Row[]);
    if (!data || data.length < 500) break;
  }

  const subjectOf = new Map(
    listAllKS2Topics().map((t) => [t.id, String(t.subjectId)]),
  );

  const assessed: { row: Row; subject: string; triage: LessonTriage }[] = [];
  for (const row of rows) {
    if (!row.lesson_json) continue;
    const topicId = String(row.topic_id ?? "");
    const ctx = getKS2TopicById(topicId);
    // The subject ID, deliberately NOT ks2_lesson_cache.subject — that column
    // holds a display name ("Mathematics"), and the triage keys its maths-only
    // harden and its validator call off the id, so the display name silently
    // skipped both.
    const subject = String(subjectOf.get(topicId) ?? "unknown");
    assessed.push({
      row,
      subject,
      triage: triageCachedLesson(row.lesson_json, {
        topicId,
        topicName: row.topic_name ?? ctx?.topic.name ?? "",
        subtopics: ctx?.topic.subtopics ?? [],
        subject,
        skill: row.lesson_json.skill,
        hitCount: row.hit_count ?? 0,
      }),
    });
  }

  // Only rows awaiting review are a backlog. Legacy rows carry no reviewStatus
  // at all; the queue treats that as "unreviewed", so this must too or the
  // report and the queue would disagree about how much work is left.
  const pending = assessed.filter(
    (a) => (a.row.lesson_json?.reviewStatus || "unreviewed") === "unreviewed",
  );
  pending.sort(
    (a, b) =>
      b.triage.score - a.triage.score ||
      (b.row.hit_count ?? 0) - (a.row.hit_count ?? 0),
  );

  const n = pending.length;
  const unverifiable = pending.filter((a) => a.triage.unverifiable);
  const unverifiableHits = unverifiable.reduce(
    (s, a) => s + (a.row.hit_count ?? 0),
    0,
  );
  const band = (b: string) => pending.filter((a) => a.triage.band === b).length;

  console.log("=".repeat(64));
  console.log("KS2 LESSON REVIEW TRIAGE");
  console.log("=".repeat(64));
  console.log(`cached lessons: ${assessed.length}`);
  console.log(`awaiting review: ${n}\n`);
  console.log(`  high risk  : ${band("high")} (${pct(band("high"), n)})`);
  console.log(`  medium risk: ${band("medium")} (${pct(band("medium"), n)})`);
  console.log(`  low risk   : ${band("low")} (${pct(band("low"), n)})`);

  console.log(
    `\nNO AUTOMATIC CORRECTNESS CHECK: ${unverifiable.length} (${pct(unverifiable.length, n)})`,
  );
  console.log(
    `  historical hits on that content: ${unverifiableHits}  <- read by pupils, verified by nobody`,
  );
  console.log("  per subject (pending / unverifiable):");
  const subjects = [...new Set(pending.map((a) => a.subject))].sort();
  for (const s of subjects) {
    const inSubject = pending.filter((a) => a.subject === s);
    const u = inSubject.filter((a) => a.triage.unverifiable).length;
    console.log(
      `    ${s.padEnd(11)} ${String(inSubject.length).padStart(4)} / ${String(u).padStart(4)}  ${pct(u, inSubject.length)}`,
    );
  }

  const wrongStored = pending.filter((a) => a.triage.storedAnswerWasWrong);
  console.log(
    `\nSTORED-vs-SERVED DISAGREEMENT: ${wrongStored.length} rows cached with a wrong worked answer`,
  );
  console.log(
    "  The serve path re-derives these from a deterministic builder, so pupils get correct",
  );
  console.log(
    "  maths. They rank up because the un-repairable prose came from the same generation.",
  );

  const topN = Number(
    process.argv[process.argv.indexOf("--top") + 1] || 25,
  );
  console.log(`\n${"=".repeat(64)}\nTOP ${topN} FOR REVIEW\n${"=".repeat(64)}`);
  for (const [i, a] of pending.slice(0, topN).entries()) {
    const skill = a.row.lesson_json?.skill ?? "(no skill)";
    console.log(
      `\n${String(i + 1).padStart(3)}. [${a.triage.band.toUpperCase()} ${a.triage.score}] ${a.subject} · ${a.row.topic_name ?? a.row.topic_id} · ${skill}`,
    );
    console.log(`     served ${a.row.hit_count ?? 0}x · ${a.row.cache_key}`);
    for (const r of a.triage.reasons.filter((r) => r.weight > 0)) {
      console.log(`     - ${r.detail}`);
    }
  }

  if (process.argv.includes("--csv")) {
    mkdirSync("audit/evidence", { recursive: true });
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const out = [
      "rank,cache_key,subject,topic_name,skill,tier,kind,hit_count,risk_score,risk_band,unverifiable,stored_answer_wrong,reason_codes,quality_issues",
      ...pending.map((a, i) =>
        [
          i + 1,
          a.row.cache_key,
          a.subject,
          a.row.topic_name,
          a.row.lesson_json?.skill ?? "",
          a.row.tier,
          a.row.kind,
          a.row.hit_count ?? 0,
          a.triage.score,
          a.triage.band,
          a.triage.unverifiable,
          a.triage.storedAnswerWasWrong
            ? `stored=${a.triage.storedAnswerWasWrong.stored} served=${a.triage.storedAnswerWasWrong.correct}`
            : "",
          a.triage.reasons.map((r) => r.code).join(" "),
          a.triage.qualityIssues.join(" "),
        ]
          .map(esc)
          .join(","),
      ),
    ].join("\n");
    writeFileSync("audit/evidence/ks2-review-triage.csv", out + "\n");
    console.log("\nWrote audit/evidence/ks2-review-triage.csv");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
