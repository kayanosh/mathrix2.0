import type { PlaybackPhase } from "@/lib/whiteboard-playback";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "then",
  "this",
  "to",
  "we",
  "with",
]);

function normalizedWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.+\-÷×=/%]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export interface PointerTargetDescriptor {
  label: string;
  sequence: number;
}

/**
 * Select the visual anchor that best matches the currently narrated word.
 * A nearby label match wins (for example "gravity" or "8"); otherwise the
 * cursor advances through the anchors in their teaching order.
 */
export function teacherTargetIndex(
  targets: PointerTargetDescriptor[],
  narration: string,
  activeWord: number,
  phase: PlaybackPhase,
): number {
  if (targets.length <= 1) return 0;

  if (phase === "focus" || phase === "point" || phase === "write") return 0;
  if (phase === "pupil_pause" || phase === "complete") return targets.length - 1;

  const narrationWords = normalizedWords(narration);
  if (narrationWords.length === 0) return 0;
  const currentWord = Math.min(
    narrationWords.length - 1,
    Math.max(0, activeWord),
  );

  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;

  targets.forEach((target, targetIndex) => {
    const labelWords = normalizedWords(target.label).filter(
      (word) => !STOP_WORDS.has(word) && (word.length > 1 || /^\d/.test(word)),
    );
    if (labelWords.length === 0) return;

    let nearestDistance = Number.POSITIVE_INFINITY;
    let matchedLength = 0;
    labelWords.forEach((labelWord) => {
      narrationWords.forEach((word, wordIndex) => {
        if (word === labelWord) {
          const distance = Math.abs(wordIndex - currentWord);
          if (distance < nearestDistance) nearestDistance = distance;
          matchedLength = Math.max(matchedLength, labelWord.length);
        }
      });
    });

    // Only use a semantic match while the tutor is actually speaking near it.
    if (nearestDistance <= 4) {
      const score = 100 - nearestDistance * 15 + matchedLength - targetIndex * 0.001;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = targetIndex;
      }
    }
  });

  if (bestIndex >= 0) return bestIndex;

  const progress = (currentWord + 0.5) / narrationWords.length;
  return Math.min(targets.length - 1, Math.floor(progress * targets.length));
}

/** Normalised narration progress used to trace a single large visual. */
export function teacherSpeechProgress(
  narration: string,
  activeWord: number,
  phase: PlaybackPhase,
): number {
  if (phase === "focus" || phase === "point" || phase === "write") return 0;
  if (phase === "pupil_pause" || phase === "complete") return 1;
  const words = normalizedWords(narration);
  if (words.length === 0 || activeWord < 0) return 0;
  return Math.min(1, Math.max(0, (activeWord + 0.5) / words.length));
}

export interface PointerRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Place the pointer at an exact compact anchor, or sweep naturally through a
 * larger line/panel as speech progresses so it never remains frozen.
 */
export function teacherPointerPoint(rect: PointerRect, progress: number) {
  if (rect.width <= 90 && rect.height <= 90) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  const rows = Math.max(1, Math.min(4, Math.round(rect.height / 54)));
  const scaled = Math.min(0.9999, Math.max(0, progress)) * rows;
  const row = Math.min(rows - 1, Math.floor(scaled));
  const alongRow = scaled - row;
  const leftToRight = row % 2 === 0 ? alongRow : 1 - alongRow;
  return {
    x: rect.left + rect.width * (0.16 + leftToRight * 0.68),
    y: rect.top + rect.height * ((row + 0.5) / rows),
  };
}
