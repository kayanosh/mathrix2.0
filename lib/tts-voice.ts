/**
 * How the tutor's voice is made. One place, because /api/tts and
 * /api/tts-timing must ask for exactly the same clip or the timing is for
 * different audio.
 */
import { LEGACY_TTS_MODEL } from "./tts-cache-key";

/** Deep and steady. Override with OPENAI_TTS_VOICE. */
export const TTS_VOICE = process.env.OPENAI_TTS_VOICE?.trim() || "onyx";

/**
 * The higher-quality model: clearer consonants and fewer slurred words than
 * tts-1, at twice the price per character. Each sentence is generated once and
 * then served from storage, so the cost is paid once per sentence, not per
 * listen. Override with OPENAI_TTS_MODEL (set it to "tts-1" to go back).
 */
export const TTS_MODEL = process.env.OPENAI_TTS_MODEL?.trim() || "tts-1-hd";

/** Used if the chosen model is refused, so narration never fails over a setting. */
export const TTS_FALLBACK_MODEL = LEGACY_TTS_MODEL;

/**
 * Clips are generated at the voice's natural speed and never faster. The
 * player slows them down or speeds them up (see NARRATION_PACE in
 * lib/hooks/useWhiteboardSpeech.ts), so one clip serves every speed setting.
 * They used to be generated 10% fast, and again for 1.5× and 2×.
 */
export const TTS_SPEED = 1;

/**
 * Speaking directions, for models that accept them (the gpt-4o TTS family).
 * tts-1 and tts-1-hd ignore directions, so they are only sent to models that
 * take them.
 */
export const TTS_INSTRUCTIONS =
  "You are a patient, friendly maths teacher talking to a child who finds maths hard. " +
  "Speak clearly and at a calm, unhurried pace. Say every number slowly and distinctly, " +
  "and leave a short pause after each number and before the word 'equals'.";

export function acceptsInstructions(model: string): boolean {
  return /^gpt-/.test(model);
}
