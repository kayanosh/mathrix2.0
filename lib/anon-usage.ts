import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { allowRequest, requestClientKey } from "@/lib/rate-limit";

/**
 * Durable daily allowance for anonymous (not signed-in) visitors.
 *
 * The anonymous limit was enforced **only in localStorage**: the chat route
 * documented that it "allows the request through (no user row to check)". So
 * clearing site data reset the quota, which meant unlimited free Claude, GPT-4o
 * and text-to-speech for anyone who knew how to press Cmd+Shift+Delete. The free
 * tier is both the acquisition funnel and the largest variable cost, so it needs
 * a counter the client cannot reach.
 *
 * PRIVACY. The visitors here are children, and an IP address is personal data
 * under UK GDPR. We therefore store a salted SHA-256 of the IP and never the
 * address itself: enough to count, useless for identifying anyone, and it cannot
 * be reversed without the salt. Rows are disposable — a retention job can delete
 * anything older than a couple of days without losing anything we need.
 *
 * A shared school or family connection sits behind one NAT address, so an
 * IP-keyed limit is deliberately generous and the copy points at the free
 * account rather than at a paywall.
 */

/** Anonymous visitors per day, per IP. Signing in (free) raises this to 5. */
export const ANON_DAILY_LIMIT = 3;

function hashIp(ip: string): string {
  // Falls back to a build-time constant if unset. Logged loudly rather than
  // silently: an unsalted hash of an IPv4 address is trivially brute-forced.
  const salt = process.env.ANON_USAGE_SALT;
  if (!salt) {
    console.warn(
      "[anon-usage] ANON_USAGE_SALT is not set — anonymous usage hashes are weakly salted.",
    );
  }
  return createHash("sha256")
    .update(`${ip}|${salt ?? "mathrix-anon-usage"}`)
    .digest("hex")
    .slice(0, 32);
}

export interface AnonAllowance {
  allowed: boolean;
  used: number;
  limit: number;
}

/**
 * How many anonymous prompts this client has used today.
 *
 * On any database error this falls back to the in-memory burst limiter rather
 * than failing open OR closed: failing open restores the unlimited-spend bug,
 * and failing closed would block every anonymous visitor — killing the funnel —
 * because of an unrelated outage. The fallback is per-instance, so it is partial
 * protection, and it is logged.
 */
export async function checkAnonAllowance(headers: Headers): Promise<AnonAllowance> {
  const ip = requestClientKey(headers);
  const today = new Date().toISOString().split("T")[0];

  try {
    const { data, error } = await supabaseAdmin
      .from("anon_usage")
      .select("prompt_count")
      .eq("ip_hash", hashIp(ip))
      .eq("usage_date", today)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const used = data?.prompt_count ?? 0;
    return { allowed: used < ANON_DAILY_LIMIT, used, limit: ANON_DAILY_LIMIT };
  } catch (err) {
    console.warn(
      `[anon-usage] durable check unavailable (${(err as Error).message}); ` +
        "falling back to the in-memory burst limiter.",
    );
    const ok = allowRequest(`anon-chat:${ip}`, ANON_DAILY_LIMIT, 24 * 60 * 60 * 1000);
    return { allowed: ok, used: ok ? 0 : ANON_DAILY_LIMIT, limit: ANON_DAILY_LIMIT };
  }
}

/** Count one anonymous prompt. Never throws — metering must not break a reply. */
export async function recordAnonUse(headers: Headers): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  try {
    const { error } = await supabaseAdmin.rpc("increment_anon_usage", {
      p_ip_hash: hashIp(requestClientKey(headers)),
      p_date: today,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.warn(`[anon-usage] increment failed: ${(err as Error).message}`);
  }
}
