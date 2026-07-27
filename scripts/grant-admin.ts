/**
 * Grant (or revoke) the admin role on an existing profile.
 *
 * There is no admin signup flow — this is the only way to create an admin,
 * and it requires the service-role key, so running it is itself an audited,
 * privileged action (whoever holds .env.local's SUPABASE_SERVICE_ROLE_KEY).
 *
 * Usage:
 *   npx tsx scripts/grant-admin.ts user@example.com
 *   npx tsx scripts/grant-admin.ts user@example.com --revoke
 *
 * Environment (read from .env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

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
    /* ignore */
  }
  return env;
}

async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");
  if (!email) {
    console.error("Usage: npx tsx scripts/grant-admin.ts <email> [--revoke]");
    process.exit(1);
  }

  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const sb = createClient(url, key);

  const { data: users, error: listError } = await sb.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }
  const user = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`No auth user found with email ${email}`);
    process.exit(1);
  }

  const nextRole = revoke ? "student" : "admin";
  const { data, error } = await sb
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", user.id)
    .select("id, email, role")
    .single();

  if (error) {
    console.error("Failed to update role:", error.message);
    process.exit(1);
  }

  console.log(`${revoke ? "Revoked" : "Granted"} admin for ${email}:`, data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
