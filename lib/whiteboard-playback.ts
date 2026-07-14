import type { TutorStepModel } from "@/lib/tutor-steps";
import { sanitizeForTTS } from "@/lib/narration";

/** The teacher-like sequence used for every whiteboard cue. */
export type PlaybackPhase =
  | "focus"
  | "point"
  | "write"
  | "explain"
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

const phaseOrder: PlaybackPhase[] = [
  "focus",
  "point",
  "write",
  "explain",
  "check",
  "pupil_pause",
  "complete",
];

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
      return "write";
    case "write":
      return "explain";
    case "explain":
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
    case "write":
      return "Writing it out";
    case "explain":
      return "Teacher explanation";
    case "check":
      return "Quick check";
    case "pupil_pause":
      return "Your thinking time";
    case "complete":
      return "Step complete";
  }
}

/** Thinking time never collapses below 1.4 seconds at faster playback speeds. */
export function pupilPauseDurationMs(speed: number): number {
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
  return Math.max(1400, PUPIL_PAUSE_MS / safeSpeed);
}
