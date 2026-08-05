/**
 * Audit every answer-bearing item in the live KS2 lesson cache against the
 * deterministic method builders.
 *
 * Motivation: the same defect class has now been found three times — a worked
 * example whose stated answer does not solve its own stated question (DEF-008
 * comma-thousands, DEF-020 block-order, DEF-023 "N cubes long"). Each was found
 * by accident. This measures the whole cache at once, with no API cost, and —
 * more importantly — quantifies how much served maths content has NO
 * deterministic safety net at all, which is where a future instance of this
 * class would go unnoticed.
 *
 * Each item lands in exactly one bucket:
 *   AGREE        builder solved it and confirms the stored answer.
 *   DISAGREE     builder solved it and contradicts the stored answer. The
 *                harden path re-runs on serve, so the pupil sees the builder's
 *                answer — but the stored content was generated wrong, and if
 *                the builder is ever the wrong one this is a live wrong answer.
 *   UNVERIFIABLE no builder matched, so nothing can check this answer. An LLM
 *                error here is invisible. This is the real risk surface.
 *
 * Usage: npx tsx scripts/audit-cached-answers.ts [--csv]
 * Reads lesson content only — no pupil data.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { deterministicMathsAnswer, mathsAnswersEquivalent } from "@/lib/ks2-maths-accuracy";

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

type Bucket = "AGREE" | "DISAGREE" | "UNVERIFIABLE";

/**
 * Stored answers routinely include their working and units — "$10 + (4 \div 2)
 * = 12$, so the estimated area is $12\text{ cm}^2$" — while a builder returns
 * just "12 cm²". A raw string compare calls those a disagreement, which
 * massively over-reports: an early run of this script reported 6.9% DISAGREE
 * when almost all of it was formatting. Compare the FINAL numeric value on each
 * side (answers state their working first, then the result), which is the same
 * convention expectedNumericAnswer() uses in lib/methods/apply-builder.ts.
 */
function finalNumber(raw: string): number | null {
  const cleaned = raw
    .replace(/\\text\s*\{[^}]*\}/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[$\\{}]/g, " ")
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .replace(/\^\s*\d+/g, " ");
  const nums = cleaned.match(/-?\d+(?:\.\d+)?/g);
  if (!nums?.length) return null;
  return Number(nums[nums.length - 1]);
}

function answersAgree(stored: string, builder: string): boolean {
  if (mathsAnswersEquivalent(stored, builder)) return true;
  const a = finalNumber(stored);
  const b = finalNumber(builder);
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 1e-9;
}

interface Finding {
  bucket: Bucket;
  cacheKey: string;
  topicId: string;
  skill: string;
  location: string;
  hitCount: number;
  question: string;
  stored: string;
  builderAnswer: string;
  builderId: string;
}

interface ItemLike {
  question?: unknown;
  answer?: unknown;
}

function classify(
  location: string,
  item: ItemLike | undefined,
  meta: { cacheKey: string; topicId: string; skill: string; hitCount: number },
): Finding | null {
  const question = String(item?.question ?? "").trim();
  const stored = String(item?.answer ?? "").trim();
  if (!question || !stored) return null;

  const solved = deterministicMathsAnswer(question);
  if (!solved) {
    return {
      bucket: "UNVERIFIABLE",
      ...meta,
      location,
      question,
      stored,
      builderAnswer: "",
      builderId: "",
    };
  }
  const agree = answersAgree(stored, solved.answer);
  return {
    bucket: agree ? "AGREE" : "DISAGREE",
    ...meta,
    location,
    question,
    stored,
    builderAnswer: solved.answer,
    builderId: solved.builderId,
  };
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from("ks2_lesson_cache")
    .select("cache_key, topic_id, subject, lesson_json, hit_count")
    .limit(5000);

  if (error || !data) {
    console.error("Cache read failed:", error?.message);
    process.exit(1);
  }

  const findings: Finding[] = [];
  let mathsLessons = 0;
  let skippedNonMaths = 0;

  for (const row of data) {
    const lesson = row.lesson_json as Record<string, unknown>;
    const subject = String(row.subject ?? "");
    // Only maths has deterministic builders at all; other subjects would all
    // land in UNVERIFIABLE and drown the signal.
    if (!/math/i.test(subject)) {
      skippedNonMaths++;
      continue;
    }
    mathsLessons++;

    const meta = {
      cacheKey: String(row.cache_key),
      topicId: String(row.topic_id),
      skill: String(lesson.skill ?? ""),
      hitCount: Number(row.hit_count ?? 0),
    };

    const push = (loc: string, item: ItemLike | undefined) => {
      const f = classify(loc, item, meta);
      if (f) findings.push(f);
    };

    push("workedExample", lesson.workedExample as ItemLike | undefined);
    push("tryThis", lesson.tryThis as ItemLike | undefined);
    push("quickCheck", lesson.quickCheck as ItemLike | undefined);
    for (const [i, item] of ((lesson.guidedPractice as ItemLike[]) ?? []).entries()) {
      push(`guidedPractice[${i}]`, item);
    }
    for (const [i, item] of ((lesson.independentPractice as ItemLike[]) ?? []).entries()) {
      push(`independentPractice[${i}]`, item);
    }
  }

  const count = (b: Bucket) => findings.filter((f) => f.bucket === b).length;
  const pct = (n: number) => ((n / findings.length) * 100).toFixed(1) + "%";

  console.log("");
  console.log("KS2 cached-answer audit");
  console.log("=======================");
  console.log(`Cache rows read              : ${data.length}`);
  console.log(`  maths lessons audited      : ${mathsLessons}`);
  console.log(`  non-maths skipped          : ${skippedNonMaths}`);
  console.log(`Answer-bearing items checked : ${findings.length}`);
  console.log("");
  console.log(`  AGREE        ${String(count("AGREE")).padStart(5)}  ${pct(count("AGREE"))}  builder confirms the stored answer`);
  console.log(`  DISAGREE     ${String(count("DISAGREE")).padStart(5)}  ${pct(count("DISAGREE"))}  stored answer contradicted (self-heals on serve)`);
  console.log(`  UNVERIFIABLE ${String(count("UNVERIFIABLE")).padStart(5)}  ${pct(count("UNVERIFIABLE"))}  no builder — an error here is invisible`);
  console.log("");

  const disagreements = findings.filter((f) => f.bucket === "DISAGREE");
  if (disagreements.length) {
    console.log(`--- DISAGREE detail (top 25 by pupil reach) ---`);
    for (const f of disagreements.sort((a, b) => b.hitCount - a.hitCount).slice(0, 25)) {
      console.log(`[served ${f.hitCount}x] ${f.topicId} / ${f.skill} / ${f.location}`);
      console.log(`   Q       : ${f.question.slice(0, 100)}`);
      console.log(`   stored  : ${f.stored.slice(0, 60)}`);
      console.log(`   builder : ${f.builderAnswer.slice(0, 60)}  (${f.builderId})`);
    }
    console.log("");
  }

  // Which skills have the least deterministic coverage? That is where the next
  // DEF-008/020/023 would hide.
  const bySkill = new Map<string, { total: number; unver: number; reach: number }>();
  for (const f of findings) {
    const k = `${f.topicId} / ${f.skill || "(no skill)"}`;
    const e = bySkill.get(k) ?? { total: 0, unver: 0, reach: 0 };
    e.total++;
    if (f.bucket === "UNVERIFIABLE") e.unver++;
    e.reach = Math.max(e.reach, f.hitCount);
    bySkill.set(k, e);
  }
  const worst = [...bySkill.entries()]
    .filter(([, e]) => e.unver > 0)
    .sort((a, b) => b[1].unver / b[1].total - a[1].unver / a[1].total || b[1].reach - a[1].reach)
    .slice(0, 20);
  if (worst.length) {
    console.log("--- Least deterministic coverage (highest UNVERIFIABLE share) ---");
    for (const [skill, e] of worst) {
      const share = ((e.unver / e.total) * 100).toFixed(0).padStart(3);
      console.log(`  ${share}% unverifiable (${e.unver}/${e.total}), max reach ${e.reach}x  ${skill}`);
    }
    console.log("");
  }

  if (process.argv.includes("--csv")) {
    mkdirSync("audit/evidence", { recursive: true });
    const esc = (v: string) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
    const out = [
      "bucket,cache_key,topic_id,skill,location,hit_count,question,stored_answer,builder_answer,builder_id",
      ...findings.map((f) =>
        [
          f.bucket,
          f.cacheKey,
          f.topicId,
          f.skill,
          f.location,
          String(f.hitCount),
          f.question,
          f.stored,
          f.builderAnswer,
          f.builderId,
        ]
          .map(esc)
          .join(","),
      ),
    ].join("\n");
    writeFileSync("audit/evidence/cached-answer-audit.csv", out + "\n");
    console.log("Wrote audit/evidence/cached-answer-audit.csv");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
