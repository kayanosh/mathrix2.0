/**
 * Apply scripts/sql/mathrix-missing-tables.sql directly to Supabase.
 *
 * Add to .env.local (from Supabase → Settings → Database → Connection string → URI):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres
 *
 * Then run: node scripts/apply-migration.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

async function main() {
  const env = loadEnv();
  const url = env.SUPABASE_DB_URL;

  if (!url) {
    console.log("\n❌ Add SUPABASE_DB_URL to .env.local first.");
    console.log("   Supabase → Settings → Database → Connection string → URI");
    console.log("   Replace [YOUR-PASSWORD] with your database password.\n");
    process.exit(1);
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.log("\nInstalling pg package...");
    const { execSync } = await import("child_process");
    execSync("npm install pg --no-save", { stdio: "inherit" });
    pg = await import("pg");
  }

  const sql = readFileSync(
    join(__dirname, "sql", "mathrix-missing-tables.sql"),
    "utf-8"
  );

  const client = new pg.default.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("\nApplying migration...\n");
  await client.query(sql);
  await client.end();
  console.log("✅ Migration applied. Run: node scripts/check-supabase.mjs\n");
}

main().catch((e) => {
  console.error("\n❌ Migration failed:\n", e.message);
  process.exit(1);
});
