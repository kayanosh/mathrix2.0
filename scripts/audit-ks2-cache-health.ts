/**
 * Measure the health of the live KS2 lesson cache.
 *
 * Motivation. `scripts/validate-ks2-lessons.ts` validates SYNTHETIC lessons
 * built from the deterministic builders, so it reports 374/378 passing while
 * saying nothing about the 439 real lessons being served to children. This
 * script asks the complementary question — what is actually in the cache, and
 * what would the serving path do with it — which is how the cache-discard
 * defect below was found in the first place.
 *
 * THE HEADLINE MEASUREMENT: how many cached lessons the serve path DISCARDS.
 *
 * `validateKS2TeachingLesson` returns `ok: issues.length === 0`
 * (lib/ks2-lesson-validator.ts) — ANY issue, including cosmetic ones like
 * `sentence_too_long`. The cache-read gate in app/api/ks2-lesson/route.ts
 * requires that `.ok`. So one cosmetic flaw discards a stored lesson, triggers
 * up to three fresh LLM calls, and because a soft failure sets
 * `cacheable = false` the result is never written back. Those combinations are
 * PERMANENTLY COLD: every request pays full generation. In a classroom that is
 * a 30-90s stall in front of thirty children, repeatedly, plus unbounded spend.
 *
 * Two figures are reported because neither alone is honest:
 *   as-stored   what the validator says about the row as it sits in the table.
 *   post-harden after re-applying the deterministic maths repair the serve path
 *               runs before validating. This is the closer analogue of
 *               production, and it is what shows the maths layer working:
 *               `math_answer_mismatch` goes to zero.
 *
 * KNOWN LIMIT, stated so the number is not over-trusted: `enrichTeachingFields`
 * and `hardenWorkedExample` are route-local (not exported), so this script
 * cannot replicate the serve path exactly. `enrichTeachingFields` backfills
 * learningObjective / prerequisiteKnowledge / commonMistakes / recap, so
 * ENRICH_BACKFILLS below is discounted from the post-harden figure. The precise
 * production rate needs serve-path instrumentation; this is a bounded estimate,
 * and both bounds have landed on the same value.
 *
 * Usage: npx tsx scripts/audit-ks2-cache-health.ts [--csv] [--baseline] [--check]
 *   --csv       write audit/evidence/ks2-cache-health.csv (one row per lesson)
 *   --baseline  write scripts/output/ks2-cache-health-baseline.json
 *   --check     compare against that baseline and exit 1 if health regressed
 *
 * Reads lesson content only — no pupil data.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeToTeachingLesson,
  validateKS2TeachingLesson,
} from "@/lib/ks2-lesson-validator";
import { enrichTeachingFields } from "@/app/api/ks2-lesson/route";
import { hardenKS2MathsPracticeAnswers } from "@/lib/ks2-maths-accuracy";
import { normalizeEquationStepsDialect } from "@/lib/ks2-visual-fitness";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import { listAllKS2Topics, getKS2TopicById } from "@/lib/ks2";
import { resolveKS2Taxonomy } from "@/lib/ks2-taxonomy";
import {
  BLOCKING_LESSON_ISSUES,
  ENRICH_BACKFILLED_ISSUES,
  TEACHING_SUBJECTS,
} from "@/lib/ks2-lesson-issues";

const BASELINE_PATH = "scripts/output/ks2-cache-health-baseline.json";

/** Imported, never copied — a drifted copy makes a health report a confident lie. */
const ENRICH_BACKFILLS = ENRICH_BACKFILLED_ISSUES;

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
  tier: string | null;
  kind: string | null;
  target: string | null;
  hit_count: number | null;
  lesson_json: Record<string, unknown> | null;
}

interface Assessed {
  row: Row;
  subject: string;
  validated: boolean;
  storedIssues: string[];
  hardenedIssues: string[];
  /** Would the serve path discard this and regenerate? (post-harden estimate) */
  discarded: boolean;
  /** Would the pre-fix gate (any issue at all) have discarded it? */
  discardedUnderOldGate: boolean;
  blocking: string[];
  legacy: boolean;
  reviewStatus: string;
  teachingSteps: number;
  authoredSteps: number;
}

function codesOf(issues: unknown[]): string[] {
  return issues.map((i) => (i as { code?: string }).code ?? String(i));
}

function assess(
  row: Row,
  subject: string,
  subtopics: string[],
): Assessed {
  const json = (row.lesson_json ?? {}) as Record<string, any>;
  const requestedSkill: string = typeof json.skill === "string" ? json.skill : "";
  // vr/nvr are now structurally validated on serve too (they used to be
  // returned completely unchecked), just without the teaching-engine visual
  // requirements.
  const validated = TEACHING_SUBJECTS.has(subject) || subject === "vr" || subject === "nvr";
  const requireVisual = subject === "maths";

  let storedIssues: string[] = [];
  let hardenedIssues: string[] = [];
  if (validated) {
    storedIssues = codesOf(
      validateKS2TeachingLesson(json as never, { subject, requireVisual }).issues,
    );
    let hardened = JSON.parse(JSON.stringify(json));
    // The route's harden also normalises block dialects before validating. Run
    // the same coercion here or the report keeps counting failures the serve
    // path no longer has.
    if (Array.isArray(hardened.workedExample?.whiteboard?.blocks)) {
      hardened.workedExample.whiteboard.blocks = normalizeEquationStepsDialect(
        hardened.workedExample.whiteboard.blocks,
      );
    }
    if (subject === "maths") {
      try {
        if (hardened.workedExample) {
          // Signature is (example, topic?: string, subtopics?: string[]) —
          // passing an object here silently resolves the wrong builder.
          hardened.workedExample =
            applyMethodBuilderToWorkedExample(
              hardened.workedExample,
              typeof hardened.strand === "string" ? hardened.strand : undefined,
              typeof hardened.skill === "string" ? [hardened.skill] : undefined,
            ) ?? hardened.workedExample;
        }
      } catch {
        /* a builder that cannot parse leaves the example untouched */
      }
      try {
        hardened = hardenKS2MathsPracticeAnswers(hardened);
      } catch {
        /* ditto */
      }
    }
    // Run the route's OWN enrich, not an approximation of it. It backfills the
    // taxonomy fields and pads a thin worked example to three steps, so skipping
    // it made few_steps and answer_before_reasoning look far more common than
    // production ever sees.
    // Mirror the route's call EXACTLY: the topic NAME and the topic's real
    // subtopic list, not the lesson's own strand/skill. Substituting those
    // changes which taxonomy resolves, which changes the detected visual family
    // — and so invents visual_mismatch / mixed_skill failures production never
    // sees.
    const topicName = row.topic_name ?? "";
    try {
      hardened = enrichTeachingFields(
        hardened,
        topicName,
        subtopics,
        String(row.topic_id ?? ""),
        subject,
      ) as typeof hardened;
    } catch {
      /* an un-enrichable row is reported as-is rather than skipped */
    }
    const taxonomy = row.topic_id
      ? resolveKS2Taxonomy(String(row.topic_id), requestedSkill || undefined)
      : null;
    hardenedIssues = codesOf(
      validateKS2TeachingLesson(
        normalizeToTeachingLesson(hardened as Record<string, unknown>, {
          topic: topicName,
          skill: requestedSkill || taxonomy?.skill,
          yearGroup: taxonomy?.yearGroup,
          strand: taxonomy?.strand,
          method: taxonomy?.method,
        }) as never,
        { subject, requireVisual },
      ).issues,
    );
  }

  // enrich now runs for real, so nothing needs discounting — any backfilled code
  // that still appears is one enrich genuinely could not fill.
  const effective = hardenedIssues;
  const steps: any[] = Array.isArray(json.workedExample?.teachingSteps)
    ? json.workedExample.teachingSteps
    : [];

  const blocking = effective.filter((c) => BLOCKING_LESSON_ISSUES.has(c));
  return {
    row,
    subject,
    validated,
    storedIssues,
    hardenedIssues,
    // Current gate: blocking issues only.
    discarded: validated && blocking.length > 0,
    // What the OLD gate discarded (`validation.ok`, i.e. ANY issue), kept so the
    // report can show what the fix reclaimed rather than just asserting it.
    discardedUnderOldGate: validated && effective.length > 0,
    blocking,
    legacy: !json.schemaVersion,
    reviewStatus: String(json.reviewStatus ?? "none"),
    teachingSteps: steps.length,
    authoredSteps: steps.filter(
      (s) =>
        (s?.cellKeys?.length ?? 0) +
          (s?.carryKeys?.length ?? 0) +
          (s?.noteKeys?.length ?? 0) >
        0,
    ).length,
  };
}

function tally<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) out[key(i)] = (out[key(i)] ?? 0) + 1;
  return out;
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

  // listAllKS2Topics() returns KS2TopicSummary, which carries no subtopics —
  // resolve each id to its full context to count skills.
  const topics = listAllKS2Topics();
  const subjectOf = new Map(topics.map((t) => [t.id, String(t.subjectId)]));
  const curriculumSkills = topics.reduce(
    (n, t) => n + (getKS2TopicById(t.id)?.topic.subtopics.length ?? 0),
    0,
  );

  let rows: Row[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from("ks2_lesson_cache")
      .select("cache_key,topic_id,topic_name,tier,kind,target,hit_count,lesson_json")
      .range(from, from + 499);
    if (error) {
      console.error("Cache read failed:", error.message);
      process.exit(2);
    }
    rows = rows.concat(data as Row[]);
    if (!data || data.length < 500) break;
  }

  const assessed = rows.map((r) =>
    assess(
      r,
      String(subjectOf.get(String(r.topic_id)) ?? "unknown"),
      getKS2TopicById(String(r.topic_id))?.topic.subtopics ?? [],
    ),
  );
  const n = assessed.length;
  const discarded = assessed.filter((a) => a.discarded);
  const discardedHits = discarded.reduce((s, a) => s + (a.row.hit_count ?? 0), 0);
  const legacy = assessed.filter((a) => a.legacy);
  const neverServed = assessed.filter((a) => (a.row.hit_count ?? 0) === 0);

  const storedMismatch = assessed.filter((a) =>
    a.storedIssues.includes("math_answer_mismatch"),
  ).length;
  const hardenedMismatch = assessed.filter((a) =>
    a.hardenedIssues.includes("math_answer_mismatch"),
  ).length;

  const combos = new Set(
    assessed.map(
      (a) =>
        `${a.row.topic_id}|${(a.row.lesson_json as any)?.skill}|${a.row.tier}|${a.row.kind}`,
    ),
  );
  const skills = new Set(
    assessed.map((a) => (a.row.lesson_json as any)?.skill).filter(Boolean),
  );
  const possible = curriculumSkills * 3 * 2; // tiers x kinds

  const totalSteps = assessed.reduce((s, a) => s + a.teachingSteps, 0);
  const authoredSteps = assessed.reduce((s, a) => s + a.authoredSteps, 0);

  console.log("=".repeat(64));
  console.log("KS2 CACHE HEALTH");
  console.log("=".repeat(64));
  console.log(`cached lessons: ${n}`);
  const oldGate = assessed.filter((a) => a.discardedUnderOldGate);
  console.log(
    `\nDISCARDED ON READ -> full regeneration every request: ${discarded.length} (${pct(discarded.length, n)})`,
  );
  console.log(`  historical hits on those rows: ${discardedHits}`);
  console.log(
    `  under the pre-fix gate (any issue at all): ${oldGate.length} (${pct(oldGate.length, n)})  -> reclaimed ${oldGate.length - discarded.length}`,
  );
  console.log("  per subject (rows / discarded):");
  for (const [subject, count] of Object.entries(
    tally(assessed, (a) => a.subject),
  ).sort((a, b) => b[1] - a[1])) {
    const d = discarded.filter((a) => a.subject === subject).length;
    console.log(
      `    ${subject.padEnd(11)} ${String(count).padStart(4)} / ${String(d).padStart(4)}  ${pct(d, count)}`,
    );
  }

  const codeTally: Record<string, number> = {};
  for (const a of discarded) {
    for (const c of a.hardenedIssues.filter((x) => !ENRICH_BACKFILLS.has(x))) {
      codeTally[c] = (codeTally[c] ?? 0) + 1;
    }
  }
  console.log("\n  causes (post-harden, excluding what enrich backfills):");
  for (const [c, v] of Object.entries(codeTally).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${c}: ${v}${BLOCKING_LESSON_ISSUES.has(c) ? "  [blocking]" : ""}`);
  }

  console.log("\nDETERMINISTIC MATHS LAYER");
  console.log(`  math_answer_mismatch as-stored : ${storedMismatch}`);
  console.log(
    `  math_answer_mismatch post-harden: ${hardenedMismatch}   <- the builders working`,
  );

  console.log("\nSCHEMA & REVIEW");
  console.log(
    `  legacy rows (no schemaVersion): ${legacy.length} (${pct(legacy.length, n)}), of which served: ${legacy.filter((a) => (a.row.hit_count ?? 0) > 0).length}`,
  );
  console.log(
    `  reviewStatus: ${JSON.stringify(tally(assessed, (a) => a.reviewStatus))}`,
  );

  console.log("\nCOVERAGE");
  console.log(
    `  distinct (topic,skill,tier,kind): ${combos.size} of ${possible} possible = ${pct(combos.size, possible)}`,
  );
  console.log(
    `  skills with any lesson: ${skills.size} of ${curriculumSkills} = ${pct(skills.size, curriculumSkills)}`,
  );
  console.log(`  by tier: ${JSON.stringify(tally(assessed, (a) => String(a.row.tier)))}`);
  console.log(`  never served: ${neverServed.length} (${pct(neverServed.length, n)})`);

  console.log("\nTEACHER CURSOR");
  console.log(
    `  teaching steps with an authored anchor path: ${authoredSteps} of ${totalSteps} = ${pct(authoredSteps, totalSteps)}`,
  );
  console.log(
    "  (only the column builders populate cellKeys/carryKeys/noteKeys; the rest infer from the DOM)",
  );

  const summary = {
    rows: n,
    discarded: discarded.length,
    discardedHits,
    blockingRows: assessed.filter((a) => a.blocking.length > 0).length,
    legacy: legacy.length,
    combos: combos.size,
    skills: skills.size,
    authoredSteps,
    totalSteps,
  };

  if (process.argv.includes("--csv")) {
    mkdirSync("audit/evidence", { recursive: true });
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const out = [
      "cache_key,topic_id,subject,tier,kind,hit_count,discarded,legacy,review_status,blocking_codes,all_codes",
      ...assessed.map((a) =>
        [
          a.row.cache_key,
          a.row.topic_id,
          a.subject,
          a.row.tier,
          a.row.kind,
          a.row.hit_count ?? 0,
          a.discarded,
          a.legacy,
          a.reviewStatus,
          a.blocking.join(" "),
          a.hardenedIssues.join(" "),
        ]
          .map(esc)
          .join(","),
      ),
    ].join("\n");
    writeFileSync("audit/evidence/ks2-cache-health.csv", out + "\n");
    console.log("\nWrote audit/evidence/ks2-cache-health.csv");
  }

  if (process.argv.includes("--baseline")) {
    mkdirSync("scripts/output", { recursive: true });
    writeFileSync(BASELINE_PATH, JSON.stringify(summary, null, 2) + "\n");
    console.log(`Wrote ${BASELINE_PATH}`);
  }

  if (process.argv.includes("--check")) {
    if (!existsSync(BASELINE_PATH)) {
      console.error(`\nNo baseline at ${BASELINE_PATH} — run with --baseline first.`);
      process.exit(2);
    }
    const base = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
    // A ratchet, not an equality check: health may improve freely, and the row
    // count grows as lessons are generated. Compare the RATE, not the count.
    const baseRate = base.discarded / base.rows;
    const nowRate = summary.discarded / summary.rows;
    const worse = nowRate > baseRate + 0.01; // 1pp tolerance for cache churn
    console.log(
      `\nratchet: discard rate ${(nowRate * 100).toFixed(1)}% vs baseline ${(baseRate * 100).toFixed(1)}%`,
    );
    if (worse) {
      console.error("FAIL: cache health regressed.");
      process.exit(1);
    }
    console.log("OK: cache health has not regressed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
