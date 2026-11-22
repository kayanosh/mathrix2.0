import { createHash } from "crypto";

/**
 * Pure helpers for the TTS audio cache key — no Supabase dependency so they
 * can be unit-tested in isolation (mirrors lesson-cache-key.ts).
 *
 * The same narration text, spoken by the same voice at the same speed by the
 * same model, always produces the same audio, so we key the cache on a hash of
 * those inputs. Whitespace is normalised so trivial formatting differences
 * reuse the same clip; case and punctuation are preserved because they affect
 * prosody.
 */

/** The model every clip was made with before the model became a setting. */
export const LEGACY_TTS_MODEL = "tts-1";

export function normalizeTtsText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Round speed to 2 dp so 1.1 and 1.1000001 share a cache entry. */
export function normalizeSpeed(speed: number): number {
  const clamped = Math.min(4, Math.max(0.25, Number.isFinite(speed) ? speed : 1));
  return Math.round(clamped * 100) / 100;
}

/**
 * `model` is part of the key so a clip made by one model is never served as
 * another's. The original model is left out of the key, which keeps every clip
 * already saved under it findable.
 */
export function hashTtsKey(
  text: string,
  voice: string,
  speed: number,
  model: string = LEGACY_TTS_MODEL,
): string {
  const parts = [normalizeTtsText(text), voice, normalizeSpeed(speed).toFixed(2)];
  if (model !== LEGACY_TTS_MODEL) parts.push(model);
  return createHash("sha256").update(parts.join("|")).digest("hex");
}
