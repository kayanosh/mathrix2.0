/**
 * Build the offline validator's sample-question fixture from REAL cached
 * lesson content (DEF-009).
 *
 * scripts/validate-ks2-lessons.ts previously tested most maths skills against
 * their own SKILL NAME as the "question" — so it structurally could not catch a
 * wrong-answer defect, which is exactly how DEF-008 slipped through a run
 * reporting "377/378 passed". Every wrong-answer defect found in this audit
 * (DEF-008, 020, 023, 024, 025, 026, 027) came from a real generated question,
 * never from a skill name.
 *
 * The fixture is COMMITTED so the validator stays offline and deterministic for
 * CI; regenerate it deliberately when the cache changes:
 *
 *   npx tsx scripts/generate-sample-questions.ts
 *
 * Preference order per skill: a question the deterministic builders can
 * actually solve (so the validator exercises the arithmetic), then any
 * worked-example question, then any question at all.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { deterministicMathsAnswer } from "@/lib/ks2-maths-accuracy";

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

interface Candidate {
  question: string;
  solvable: boolean;
  fromWorkedExample: boolean;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data, error } = await supabase
    .from("ks2_lesson_cache")
    .select("topic_name, subject, lesson_json")
    .limit(5000);
  if (error || !data) {
    console.error("cache read failed:", error?.message);
    process.exit(1);
  }

  const best = new Map<string, Candidate>();

  for (const row of data) {
    if (!/math/i.test(String(row.subject ?? ""))) continue;
    const lesson = row.lesson_json as Record<string, unknown>;
    const skill = String(lesson.skill ?? "").trim();
    const topic = String(row.topic_name ?? "").trim();
    if (!skill || !topic) continue;
    const key = `${topic}|${skill}`;

    const we = lesson.workedExample as { question?: unknown } | undefined;
    const pool: [string, boolean][] = [];
    if (we?.question) pool.push([String(we.question), true]);
    for (const field of ["tryThis", "quickCheck"] as const) {
      const it = lesson[field] as { question?: unknown } | undefined;
      if (it?.question) pool.push([String(it.question), false]);
    }
    for (const field of ["guidedPractice", "independentPractice"] as const) {
      for (const it of (lesson[field] as { question?: unknown }[]) ?? []) {
        if (it?.question) pool.push([String(it.question), false]);
      }
    }

    for (const [question, fromWorkedExample] of pool) {
      const q = question.trim();
      if (!q || q.length > 240) continue;
      const solvable = Boolean(deterministicMathsAnswer(q));
      const cand: Candidate = { question: q, solvable, fromWorkedExample };
      const cur = best.get(key);
      const score = (c: Candidate) =>
        (c.solvable ? 2 : 0) + (c.fromWorkedExample ? 1 : 0);
      if (!cur || score(cand) > score(cur)) best.set(key, cand);
    }
  }

  const out: Record<string, string> = {};
  for (const [k, v] of [...best.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    out[k] = v.question;
  }
  const solvableCount = [...best.values()].filter((c) => c.solvable).length;

  mkdirSync("scripts/fixtures", { recursive: true });
  writeFileSync(
    "scripts/fixtures/ks2-sample-questions.json",
    JSON.stringify(out, null, 2) + "\n",
  );
  console.log(
    `wrote scripts/fixtures/ks2-sample-questions.json — ${best.size} skills, ` +
      `${solvableCount} with a deterministically solvable question`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
