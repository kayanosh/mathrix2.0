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

/**
 * The one speed narration is ever GENERATED at.
 *
 * Playback speed is applied with audio.playbackRate instead of asking the API
 * for a different clip, because segment timestamps and audio.currentTime are
 * both media-time and so need no scaling — and because speed is part of this
 * cache key, so three speeds meant 3x the TTS generations AND 3x the Whisper
 * transcriptions per line.
 *
 * It lives here rather than in the player hook so server code and scripts can
 * warm the exact same key without importing a React module. 1.1 because the
 * client has always sent rate * 1.1, so every clip already cached stays a hit.
 */
export const NARRATION_TTS_SPEED = 1.1;

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
