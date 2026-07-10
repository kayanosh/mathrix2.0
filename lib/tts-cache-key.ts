import { createHash } from "crypto";

/**
 * Pure helpers for the TTS audio cache key — no Supabase dependency so they
 * can be unit-tested in isolation (mirrors lesson-cache-key.ts).
 *
 * The same narration text, spoken by the same voice at the same speed, always
 * produces identical audio, so we key the cache on a hash of those three
 * inputs. Whitespace is normalised so trivial formatting differences reuse the
 * same clip; case and punctuation are preserved because they affect prosody.
 */

export function normalizeTtsText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Round speed to 2 dp so 1.1 and 1.1000001 share a cache entry. */
export function normalizeSpeed(speed: number): number {
  const clamped = Math.min(4, Math.max(0.25, Number.isFinite(speed) ? speed : 1));
  return Math.round(clamped * 100) / 100;
}

export function hashTtsKey(
  text: string,
  voice: string,
  speed: number,
): string {
  const input = [normalizeTtsText(text), voice, normalizeSpeed(speed).toFixed(2)].join("|");
  return createHash("sha256").update(input).digest("hex");
}
