import type { TutorStepModel } from "@/lib/tutor-steps";
import { sanitizeForTTS } from "@/lib/narration";
import type { KS2Tier } from "@/lib/ks2-pathway";

/**
 * The teacher-like sequence used for every whiteboard cue.
 *
 * `perform` replaces what used to be two phases, `write` then `explain`. That
 * split was the single biggest reason the player did not feel like teaching:
 * `write` was a wall-clock setTimeout sized from character-count estimates and
 * audio only began at `explain`, so the teacher wrote the whole step in
 * silence and then described work that had already appeared. A real teacher
 * writes *while* talking, so the ink and the narration now share one phase and
 * one clock — the spoken word index drives both.
 */
export type PlaybackPhase =
  | "focus"
  | "point"
  | "perform"
  | "check"
  | "pupil_pause"
  | "complete";

export interface TeacherSpeechParts {
  explanation: string;
  check?: string;
}

export const FOCUS_SETTLE_MS = 260;
export const POINTER_SETTLE_MS = 480;
export const PUPIL_PAUSE_MS = 2200;
/** Thinking time never collapses below this, however fast playback is set. */
export const PUPIL_PAUSE_FLOOR_MS = 1400;

const phaseOrder: PlaybackPhase[] = [
  "focus",
  "point",
  "perform",
  "check",
  "pupil_pause",
  "complete",
];

/**
 * How fast the teacher works, by attainment tier.
 *
 * Pace is a teaching decision, not a constant: a pupil on the developing tier
 * needs the pen to move slowly and needs silence to think in, while one working
 * at greater depth is held up by the same pauses. The tier already exists on
 * every lesson (it is part of the cache key) and is the signal we have, so it
 * drives the profile. `secure` reproduces the original constants exactly, which
 * is what makes this change safe to land on its own.
 */
export interface PacingProfile {
  focusSettleMs: number;
  pointerSettleMs: number;
  pupilPauseMs: number;
  pupilPauseFloorMs: number;
  /** Per-character pace for handwritten prose. */
  handCharMs: number;
  /** Per-symbol pace for KaTeX ink. */
  mathCharMs: number;
  /** Per-cell pace when writing digits into a column grid. */
  cellWriteMs: number;
  /** Extra beat after each micro-step, so steps do not run together. */
  microBeatGapMs: number;
}

const SECURE_PACING: PacingProfile = {
  focusSettleMs: FOCUS_SETTLE_MS,
  pointerSettleMs: POINTER_SETTLE_MS,
  pupilPauseMs: PUPIL_PAUSE_MS,
  pupilPauseFloorMs: PUPIL_PAUSE_FLOOR_MS,
  handCharMs: 32,
  mathCharMs: 45,
  cellWriteMs: 160,
  microBeatGapMs: 0,
};

export function pacingForTier(tier?: KS2Tier | null): PacingProfile {
  switch (tier) {
    case "developing":
      return {
        focusSettleMs: 380,
        pointerSettleMs: 700,
        pupilPauseMs: 3100,
        pupilPauseFloorMs: 2000,
        handCharMs: 44,
        mathCharMs: 62,
        cellWriteMs: 220,
        // A beat between micro-steps, so "write the 5" and "carry the 1" do not
        // blur into one event for a pupil still building the method.
        microBeatGapMs: 420,
      };
    case "greater_depth":
      return {
        focusSettleMs: 180,
        pointerSettleMs: 320,
        pupilPauseMs: 1600,
        pupilPauseFloorMs: 1000,
        handCharMs: 24,
        mathCharMs: 34,
        cellWriteMs: 120,
        microBeatGapMs: 0,
      };
    default:
      return SECURE_PACING;
  }
}

function fingerprint(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function includesMeaningfully(text: string, detail: string): boolean {
  const haystack = fingerprint(text);
  const needle = fingerprint(detail).slice(0, 40);
  return needle.length > 8 && haystack.includes(needle);
}

/**
 * Split one display step into what the teacher explains and the separate
 * question the pupil should answer. Keeping the check separate is what lets
 * the player visibly pause instead of racing straight into the next step.
 */
export function buildTeacherSpeechParts(
  step: TutorStepModel | undefined,
): TeacherSpeechParts {
  if (!step) return { explanation: "" };

  let explanation = step.explanation?.trim() || step.narration.trim();

  if (step.rule && !includesMeaningfully(explanation, step.rule)) {
    explanation = `${explanation} We are using the ${step.rule} rule.`;
  }

  if (step.why && !includesMeaningfully(explanation, step.why)) {
    explanation = `${explanation} Here is why. ${step.why}`;
  }

  const check = step.check?.trim();
  return {
    explanation: sanitizeForTTS(explanation),
    check: check ? sanitizeForTTS(`Your turn. ${check}`) : undefined,
  };
}

export function nextPlaybackPhase(
  phase: PlaybackPhase,
  hasCheck: boolean,
): PlaybackPhase {
  switch (phase) {
    case "focus":
      return "point";
    case "point":
      return "perform";
    case "perform":
      return hasCheck ? "check" : "pupil_pause";
    case "check":
      return "pupil_pause";
    case "pupil_pause":
    case "complete":
      return "complete";
  }
}

export function phaseHasReached(
  current: PlaybackPhase,
  target: PlaybackPhase,
): boolean {
  return phaseOrder.indexOf(current) >= phaseOrder.indexOf(target);
}

export function playbackPhaseLabel(phase: PlaybackPhase): string {
  switch (phase) {
    case "focus":
      return "Finding the step";
    case "point":
      return "Look here";
    case "perform":
      return "Writing and explaining";
    case "check":
      return "Quick check";
    case "pupil_pause":
      return "Your thinking time";
    case "complete":
      return "Step complete";
  }
}

/**
 * Thinking time, never collapsing below the profile's floor however fast
 * playback is set. The profile defaults to `secure`, which reproduces the
 * original 2200 ms / 1400 ms behaviour exactly.
 */
export function pupilPauseDurationMs(
  speed: number,
  profile: PacingProfile = SECURE_PACING,
): number {
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
  return Math.max(profile.pupilPauseFloorMs, profile.pupilPauseMs / safeSpeed);
}
