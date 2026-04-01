/**
 * Run SQL migration against Supabase.
 * Checks if tables exist, tries SQL endpoints, and provides manual instructions if needed.
 * Usage: node scripts/run-migration.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// Load .env.local manually
const envContent = readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey);

async function checkTables() {
  const tables = ["question_cache", "exam_papers", "content_chunks"];
  const missing = [];

  for (const table of tables) {
    const { error } = await sb.from(table).select("id").limit(1);
    if (error) {
      missing.push(table);
      console.log("  MISSING: " + table + " (" + error.message + ")");
    } else {
      console.log("  EXISTS:  " + table);
    }
  }

  return missing;
}

async function checkFunction(name) {
  try {
    const { error } = await sb.rpc(name, name === "increment_cache_hit" ? { p_hash: "test" } : {});
    if (error && error.message.includes("does not exist")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("Checking table status...\n");
  const missing = await checkTables();

  if (missing.length === 0) {
    console.log("\nAll tables exist!");

    // Check functions
    const hasIncrementHit = await checkFunction("increment_cache_hit");
    const hasMatchChunks = await checkFunction("match_content_chunks");
    console.log("  increment_cache_hit: " + (hasIncrementHit ? "EXISTS" : "MISSING"));
    console.log("  match_content_chunks: " + (hasMatchChunks ? "EXISTS" : "MISSING"));

    if (hasIncrementHit && hasMatchChunks) {
      console.log("\nMigration is complete!");
      return;
    }
  }

  console.log("\n====================================================");
  console.log("  Some database objects are missing.");
  console.log("  Please run the SQL migration manually:");
  console.log("====================================================\n");
  console.log("1. Open your Supabase Dashboard SQL Editor:");

  const ref = supabaseUrl.replace("https://", "").replace(".supabase.co", "");
  console.log("   https://supabase.com/dashboard/project/" + ref + "/sql/new\n");

  console.log("2. Copy-paste the SQL from supabase-schema.sql");
  console.log("   (Lines 67-212: everything from the QUESTION CACHE section onwards)\n");
  console.log("3. Click 'Run'\n");
  console.log("4. After running, re-run this script to verify:");
  console.log("   node scripts/run-migration.mjs\n");
}

main().catch(console.error);
