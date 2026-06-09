/**
 * Bulk student account provisioning.
 *
 * Reads a CSV of students and creates a Supabase Auth user for each, then sets
 * their profile role to 'student' (plus optional school / year group). A
 * credentials sheet is written out so the school can hand login details to
 * each student. Parents view a child's progress by logging in with these
 * same student credentials.
 *
 * CSV format (header row required), columns in any order:
 *   name,email,year_group,school,password
 * Only `name` and `email` are required. If `password` is omitted, a secure
 * random one is generated.
 *
 * Usage:
 *   npx tsx scripts/create-students.ts path/to/students.csv
 *   # or
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/create-students.ts path/to/students.csv
 *
 * Environment (read from .env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

// ── Load .env.local manually (mirrors scripts/run-migration.mjs) ──────────────
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const content = readFileSync(".env.local", "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
  } catch {
    // fall back to process.env
  }
  return { ...env, ...process.env } as Record<string, string>;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: npx tsx scripts/create-students.ts path/to/students.csv");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// ── Minimal CSV parser (handles simple quoted fields) ─────────────────────────
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

function generatePassword(): string {
  // 9 url-safe chars, easy to read out and type.
  return "Mx" + randomBytes(6).toString("base64url").replace(/[-_]/g, "").slice(0, 8);
}

interface ResultRow {
  name: string;
  email: string;
  password: string;
  year_group: string;
  school: string;
  status: string;
}

async function main() {
  const rows = parseCsv(readFileSync(csvPath, "utf-8"));
  if (rows.length === 0) {
    console.error("No data rows found in CSV.");
    process.exit(1);
  }

  console.log(`Creating ${rows.length} student account(s)...\n`);
  const results: ResultRow[] = [];

  for (const row of rows) {
    const name = row.name || row.full_name || "";
    const email = (row.email || "").toLowerCase();
    const year_group = row.year_group || row.year || "";
    const school = row.school || "";
    const password = row.password || generatePassword();

    if (!email) {
      results.push({ name, email, password: "", year_group, school, status: "SKIPPED (no email)" });
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (error || !data.user) {
      results.push({ name, email, password: "", year_group, school, status: `ERROR: ${error?.message ?? "unknown"}` });
      console.log(`  ✗ ${email} — ${error?.message ?? "unknown error"}`);
      continue;
    }

    // The handle_new_user trigger creates the profile; update role + school + year.
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "student", school: school || null, year_group: year_group || null })
      .eq("id", data.user.id);

    const status = profileError ? `CREATED (profile update failed: ${profileError.message})` : "CREATED";
    results.push({ name, email, password, year_group, school, status });
    console.log(`  ✓ ${email} — ${status}`);
  }

  // Write a credentials sheet for handout.
  const outPath = csvPath.replace(/\.csv$/i, "") + "-credentials.csv";
  const header = "name,email,password,year_group,school,status\n";
  const body = results
    .map((r) =>
      [r.name, r.email, r.password, r.year_group, r.school, r.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  writeFileSync(outPath, header + body + "\n", "utf-8");

  const created = results.filter((r) => r.status.startsWith("CREATED")).length;
  console.log(`\nDone. ${created}/${rows.length} created.`);
  console.log(`Credentials written to: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
