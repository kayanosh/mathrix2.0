/**
 * Hunt the "supplement instead of the reading" defect in angle lessons.
 *
 * Found by hand-checking the top of the review-triage queue: in protractor
 * lessons the practice ANSWERS are systematically 180 - (the reading stated in
 * the question). "Arm DF crosses the matching scale at 72 degrees. Measure
 * angle EDF." is answered "108°". One row even answers "-20°".
 *
 * No existing check catches this. deterministicMathsAnswer() has no builder for
 * protractor questions, so hardenKS2MathsPracticeAnswers() verifies nothing
 * here, and the validator only inspects structure — which is exactly why these
 * lessons scored as "unverifiable" and rose to the top of the triage queue.
 *
 * Two distinct faults are reported, because they need different fixes:
 *   SUPPLEMENTED  the answer equals 180 - reading (or 90 - reading) when the
 *                 question says the arm crosses the MATCHING/correct scale.
 *   UNCLASSIFIED  the question says "classify" but the answer is a bare number
 *                 with no acute/right/obtuse/straight/reflex word.
 *
 * Usage: npx tsx scripts/audit-ks2-angle-answers.ts [--csv]
 * Reads lesson content only — no pupil data, no writes.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { listAllKS2Topics } from "@/lib/ks2";
import type { CachedKS2Lesson } from "@/lib/ks2-lesson-cache";
import { checkAngleAnswer, type AngleAnswerFault } from "@/lib/ks2-angle-answers";
import { hardenKS2MathsPracticeAnswers } from "@/lib/ks2-maths-accuracy";
import { deepRepairStrings } from "@/lib/validate";

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

interface Finding {
  cacheKey: string;
  topic: string;
  skill: string;
  hits: number;
  location: string;
  fault: AngleAnswerFault;
  valueWrong: boolean;
  question: string;
  answer: string;
  expected: string;
}

function checkItem(
  question: string,
  answer: string,
): Omit<Finding, "cacheKey" | "topic" | "skill" | "hits" | "location"> | null {
  const issue = checkAngleAnswer(question, answer);
  return issue
    ? { fault: issue.fault, valueWrong: issue.valueWrong, question, answer, expected: issue.expected }
    : null;
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

  const findings: Finding[] = [];
  let angleLessons = 0;
  const affected = new Set<string>();

  for (const row of rows) {
    const stored = row.lesson_json as CachedKS2Lesson | null;
    if (!stored) continue;
    // Check the SERVED form, not the stored JSON. The deterministic layer
    // rewrites practice answers on every read, so auditing stored content
    // reports faults pupils never meet AND hides the ones that survive — the
    // distinction that DEF-039 and the review triage both exist because of.
    // Measured here: 11 of 14 stored faults are repaired at serve; the 3 that
    // remain are repaired to the SAME wrong answer, because the angle_diagram
    // builder itself computes them (DEF-041).
    let lesson: CachedKS2Lesson;
    try {
      lesson = hardenKS2MathsPracticeAnswers(
        deepRepairStrings(JSON.parse(JSON.stringify(stored))),
      ) as CachedKS2Lesson;
    } catch {
      lesson = stored;
    }
    if (subjectOf.get(String(row.topic_id)) !== "maths") continue;

    const skill = String(lesson.skill ?? "");
    const blob = JSON.stringify(lesson);
    const isAngle =
      /angle/i.test(skill) || /protractor/i.test(blob) || /"type":"angle_scale"/.test(blob);
    if (!isAngle) continue;
    angleLessons++;

    const items: { location: string; q: unknown; a: unknown }[] = [];
    (lesson.guidedPractice ?? []).forEach((it, i) =>
      items.push({ location: `guidedPractice[${i}]`, q: it?.question, a: it?.answer }),
    );
    (lesson.independentPractice ?? []).forEach((it, i) =>
      items.push({ location: `independentPractice[${i}]`, q: it?.question, a: it?.answer }),
    );
    if (lesson.quickCheck)
      items.push({ location: "quickCheck", q: lesson.quickCheck.question, a: lesson.quickCheck.answer });
    if (lesson.tryThis)
      items.push({ location: "tryThis", q: lesson.tryThis.question, a: lesson.tryThis.answer });

    for (const it of items) {
      if (typeof it.q !== "string" || typeof it.a !== "string") continue;
      const bad = checkItem(it.q, it.a);
      if (!bad) continue;
      affected.add(String(row.cache_key));
      findings.push({
        cacheKey: String(row.cache_key),
        topic: String(row.topic_name ?? ""),
        skill,
        hits: (row.hit_count as number) ?? 0,
        location: it.location,
        ...bad,
      });
    }
  }

  const hits = [...affected].reduce((sum, key) => {
    const row = rows.find((r) => r.cache_key === key);
    return sum + (((row?.hit_count as number) ?? 0) || 0);
  }, 0);

  console.log("=".repeat(70));
  console.log("KS2 ANGLE-ANSWER AUDIT");
  console.log("=".repeat(70));
  console.log(`angle/protractor lessons in cache : ${angleLessons}`);
  console.log(`lessons with at least one bad answer: ${affected.size}`);
  console.log(`historical hits on those lessons   : ${hits}`);
  console.log(`individual bad answers             : ${findings.length}`);
  const byFault: Record<string, number> = {};
  for (const f of findings) byFault[f.fault] = (byFault[f.fault] ?? 0) + 1;
  console.log(`by fault: ${JSON.stringify(byFault)}`);
  const wrongValue = findings.filter((f) => f.valueWrong).length;
  console.log(`  a WRONG NUMBER served to a pupil            : ${wrongValue}`);
  console.log(`  wording only (right angle, no acute/obtuse) : ${findings.length - wrongValue}\n`);

  const order = [...affected].sort((a, b) => {
    const ha = findings.find((f) => f.cacheKey === a)?.hits ?? 0;
    const hb = findings.find((f) => f.cacheKey === b)?.hits ?? 0;
    return hb - ha;
  });
  for (const key of order) {
    const mine = findings.filter((f) => f.cacheKey === key);
    console.log("-".repeat(70));
    console.log(`${mine[0].topic} · ${mine[0].skill}  (served ${mine[0].hits}x)`);
    console.log(key);
    for (const f of mine) {
      console.log(`  [${f.fault}${f.valueWrong ? " / WRONG NUMBER" : " / wording only"}] ${f.location}`);
      console.log(`     Q: ${f.question}`);
      console.log(`     A: ${f.answer}   <- expected ${f.expected}`);
    }
  }

  if (process.argv.includes("--csv")) {
    mkdirSync("audit/evidence", { recursive: true });
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    writeFileSync(
      "audit/evidence/ks2-angle-answers.csv",
      [
        "cache_key,topic,skill,hit_count,location,fault,value_wrong,question,answer,expected",
        ...findings.map((f) =>
          [f.cacheKey, f.topic, f.skill, f.hits, f.location, f.fault, f.valueWrong, f.question, f.answer, f.expected]
            .map(esc)
            .join(","),
        ),
      ].join("\n") + "\n",
    );
    console.log("\nWrote audit/evidence/ks2-angle-answers.csv");
  }

  // Non-zero exit makes this usable as a CI gate once the content is repaired.
  if (findings.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
