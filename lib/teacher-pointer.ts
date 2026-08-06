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
    // Trailing sentence punctuation is kept by the character class above (a
    // decimal point is meaningful mid-token), so strip it at the token edges.
    // Without this the spoken word "5." never matched the cell label "5", and
    // the cursor stayed on an earlier digit while the tutor said "carry 5"
    // (DEF-004).
    .map((word) => word.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean);
}

/**
 * A label worth matching narration against — "gravity" or "numerator", not a
 * bare digit. Column-method anchors are labelled with single digits, which
 * repeat across cells, so matching on them picks a cell by coincidence. Those
 * anchors already carry an authored pen order in `sequence`, which is the real
 * teaching order and a far better signal than a digit collision (DEF-004).
 */
function isDistinctiveLabel(label: string): boolean {
  return normalizedWords(label).some(
    (word) => /[a-z]/.test(word) && word.length > 2 && !STOP_WORDS.has(word),
  );
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

  // When no anchor has a distinctive label — the column-method case, where
  // every anchor is a single digit — semantic matching is noise. Follow the
  // authored pen order instead, advancing with the narration. `targets` is
  // already sorted by `sequence` by the caller.
  const anyDistinctive = targets.some((t) => isDistinctiveLabel(t.label));
  if (!anyDistinctive) {
    const progress = (currentWord + 0.5) / narrationWords.length;
    return Math.min(targets.length - 1, Math.floor(progress * targets.length));
  }

  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;

  targets.forEach((target, targetIndex) => {
    // Only distinctive labels may win on a word match; a bare digit anchor can
    // still be reached through the sequence fallback below.
    if (!isDistinctiveLabel(target.label)) return;
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
