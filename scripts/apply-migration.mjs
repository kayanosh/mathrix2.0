/**
 * Apply a SQL migration to Supabase.
 *
 *   node scripts/apply-migration.mjs scripts/sql/anon-usage.sql
 *
 * Requires SUPABASE_DB_URL in .env.local. Supabase does not expose raw SQL over
 * the REST API — there is no exec_sql RPC in this project (verified: every
 * candidate name returns 404) — so the service-role key CANNOT run DDL. A real
 * Postgres connection string is the only route, and it contains the database
 * password, which is why this cannot be automated from the app's own credentials.
 *
 * Get it from: Supabase → Settings → Database → Connection string → URI,
 * replacing [YOUR-PASSWORD] with your database password.
 *
 * PREFER THE DIRECT CONNECTION (port 5432) OR SESSION POOLER for migrations. The
 * transaction pooler (6543) does not hold a session across statements, which can
 * break multi-statement DDL — and this script sends the file as one query.
 *
 * This script previously IGNORED its argument and always applied
 * scripts/sql/mathrix-missing-tables.sql, so asking for a different migration
 * silently ran the wrong one. It now requires the path explicitly and refuses to
 * guess.
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

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
  return { ...env, ...process.env };
}

function listMigrations() {
  const dir = join(__dirname, "sql");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".sql"));
}

async function main() {
  const env = loadEnv();
  const url = env.SUPABASE_DB_URL;
  const target = process.argv[2];

  if (!target) {
    console.log("\n❌ Which migration? Pass the path explicitly.\n");
    console.log("   node scripts/apply-migration.mjs scripts/sql/<file>.sql\n");
    console.log("   Available in scripts/sql/:");
    for (const f of listMigrations()) console.log(`     - ${f}`);
    console.log(
      "\n   (This used to default to mathrix-missing-tables.sql regardless of\n" +
        "    what you asked for, which is how the wrong migration got applied.)\n",
    );
    process.exit(1);
  }

  const path = resolve(target);
  if (!existsSync(path)) {
    console.log(`\n❌ No such file: ${path}\n`);
    process.exit(1);
  }

  if (!url) {
    console.log("\n❌ SUPABASE_DB_URL is not set in .env.local.\n");
    console.log("   Supabase → Settings → Database → Connection string → URI");
    console.log("   Replace [YOUR-PASSWORD] with your database password.\n");
    console.log("   Use the DIRECT connection (port 5432) or the SESSION pooler —");
    console.log("   the transaction pooler (6543) can break multi-statement DDL.\n");
    console.log("   Supabase has no exec_sql RPC, so the service-role key cannot");
    console.log("   run DDL — a Postgres connection string is the only route.\n");
    process.exit(1);
  }

  if (url.includes(":6543")) {
    console.log(
      "\n⚠️  That looks like the TRANSACTION pooler (:6543). Multi-statement DDL\n" +
        "    can fail on it. If this errors, retry with the direct connection\n" +
        "    (:5432) or the session pooler.\n",
    );
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

  const sql = readFileSync(path, "utf-8");
  console.log(`\nApplying ${target} (${sql.split("\n").length} lines)...\n`);

  const client = new pg.default.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
  console.log("✅ Applied.\n");
  console.log("   Verify with: node scripts/check-supabase.mjs\n");
}

main().catch((e) => {
  console.error("\n❌ Migration failed:\n", e.message, "\n");
  process.exit(1);
});
