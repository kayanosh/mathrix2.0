/**
 * Mark specific cached KS2 lessons as rejected so the serve path regenerates them.
 *
 * This is the only script in the repo that WRITES to ks2_lesson_cache, so it is
 * deliberately awkward: it prints what it would do and changes nothing unless
 * --commit is passed, and it refuses to run without an explicit list of cache
 * keys. There is no "reject everything matching X" mode on purpose — a bulk
 * reject is a bulk regeneration bill and a bulk cold start in front of classes.
 *
 * What rejecting actually does (app/api/ks2-lesson/route.ts): a cached lesson
 * with reviewStatus "rejected" is treated as a cache MISS, so the next request
 * pays a full generation (30-90s) and writes fresh content back, which re-enters
 * the review queue as unreviewed. It does NOT delete anything.
 *
 * Use it only for content that is wrong AS SERVED and that regeneration can
 * actually fix. If a wrong answer is recomputed by a deterministic builder on
 * every request, rejecting is futile — fix the builder instead (see DEF-041).
 *
 * Usage:
 *   npx tsx scripts/reject-ks2-lessons.ts --key "<cache_key>" [--key ...] [--commit]
 *   npx tsx scripts/reject-ks2-lessons.ts --reason "DEF-040" --key ... --commit
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
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

function argAll(name: string): string[] {
  const out: string[] = [];
  process.argv.forEach((a, i) => {
    if (a === name && process.argv[i + 1]) out.push(process.argv[i + 1]);
  });
  return out;
}

function argOne(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1] ?? null;
}

async function main() {
  const keys = argAll("--key");
  const commit = process.argv.includes("--commit");
  const reason = argOne("--reason") ?? "manual";

  if (keys.length === 0) {
    console.error("Refusing to run with no --key. Pass each cache key explicitly.");
    process.exit(2);
  }

  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(2);
  }
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Attribute the change honestly. teacherReviewer normally holds a real admin
  // user id; writing a human's id here would claim a human judged this content.
  const reviewer = `automated:${reason}`;

  console.log(commit ? "COMMITTING" : "DRY RUN — nothing will be written");
  console.log(`reviewer attribution: ${reviewer}\n`);

  let changed = 0;
  for (const key of keys) {
    const { data, error } = await db
      .from("ks2_lesson_cache")
      .select("cache_key, topic_name, hit_count, lesson_json")
      .eq("cache_key", key)
      .maybeSingle();

    if (error || !data) {
      console.error(`  MISSING  ${key}  (${error?.message ?? "no such row"})`);
      continue;
    }

    const lesson = data.lesson_json as CachedKS2Lesson;
    const current = lesson.reviewStatus ?? "unreviewed";
    console.log(
      `  ${data.topic_name} — ${lesson.skill ?? "(no skill)"}  served ${data.hit_count ?? 0}x`,
    );
    console.log(`     ${key}`);
    console.log(`     reviewStatus: ${current} -> rejected`);

    if (current === "rejected") {
      console.log("     already rejected, skipping");
      continue;
    }
    if (!commit) continue;

    lesson.reviewStatus = "rejected";
    lesson.teacherReviewer = reviewer;
    const { error: writeError } = await db
      .from("ks2_lesson_cache")
      .update({ lesson_json: lesson })
      .eq("cache_key", key);

    if (writeError) {
      console.error(`     WRITE FAILED: ${writeError.message}`);
      continue;
    }
    changed++;
    console.log("     written");
  }

  console.log(
    commit
      ? `\n${changed} row(s) rejected. The next request for each pays a full generation; ` +
          `run npm run warm:ks2-lessons to absorb the cold starts before a class hits them.`
      : "\nDry run complete. Re-run with --commit to apply.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
