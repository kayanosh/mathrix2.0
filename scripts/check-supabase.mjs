/**
 * Check which Mathrix Supabase tables/features are set up.
 * Usage: node scripts/check-supabase.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i > 0) env[t.slice(0, i)] = t.slice(i + 1);
    }
  } catch {
    /* ignore */
  }
  return env;
}

const REQUIRED_TABLES = [
  "profiles",
  "daily_usage",
  "question_cache",
  "ks2_lesson_cache",
  "skill_progress",
  "classes",
  "assignments",
  "centres",
  "students",
  "student_topics",
  "tutor_lesson_cache",
];

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.log("\n❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local\n");
    process.exit(1);
  }

  const ref = url.replace("https://", "").replace(".supabase.co", "");
  const sqlUrl = `https://supabase.com/dashboard/project/${ref}/sql/new`;

  console.log("\nMathrix Supabase health check\n");
  console.log("Project:", ref);
  console.log("SQL Editor:", sqlUrl, "\n");

  const sb = createClient(url, key);
  const missing = [];

  for (const table of REQUIRED_TABLES) {
    const { error } = await sb.from(table).select("*").limit(1);
    if (error) {
      missing.push(table);
      console.log("  ❌", table);
    } else {
      console.log("  ✅", table);
    }
  }

  const { error: fnErr } = await sb.rpc("record_skill_attempt", {
    p_user_id: "00000000-0000-0000-0000-000000000000",
    p_skill_key: "__healthcheck__",
    p_correct_delta: 0,
  });
  const hasFn =
    !fnErr ||
    fnErr.code === "23503" ||
    !fnErr.message?.includes("Could not find the function");
  console.log(hasFn ? "  ✅ record_skill_attempt()" : "  ❌ record_skill_attempt()");

  if (missing.length === 0 && hasFn) {
    console.log("\n✅ Everything looks good! No SQL migration needed.\n");
    return;
  }

  console.log("\n────────────────────────────────────────────────────");
  console.log("  Some things are missing. One-time fix (about 2 minutes):");
  console.log("────────────────────────────────────────────────────\n");
  console.log("1. Open the SQL Editor link above");
  console.log("2. Open this file in the project:");
  console.log("     scripts/sql/tuition-centre-migration.sql");
  console.log("   (or scripts/sql/mathrix-missing-tables.sql if KS2/school tables are missing)");
  console.log("3. Copy ALL of it → paste into SQL Editor → click RUN");
  console.log("4. Run again:  node scripts/check-supabase.mjs\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
