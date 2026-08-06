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
 * Align anchors to the narration IN ORDER: walk the words once and give each
 * anchor the next occurrence of its own label at or after the previous
 * anchor's word. Returns one start-word per anchor, or null when the anchors
 * cannot all be placed in order.
 *
 * This is what makes the cursor move at the right MOMENT rather than at a
 * proportional guess. For "8 times 7 is 56. Write 6 and carry 5." with anchors
 * [6, 5] it yields starts [6, 9] — the cursor sits on the 6 cell until the
 * tutor actually says "carry", then moves. Order is enforced, so a repeated
 * digit earlier in the sentence (the 6 inside "56") cannot pull a later anchor
 * backwards, which is exactly how the free-for-all matcher went wrong.
 */
export function alignAnchorsToNarration(
  targets: PointerTargetDescriptor[],
  narrationWords: string[],
): number[] | null {
  if (targets.length === 0 || narrationWords.length === 0) return null;
  const starts: number[] = [];
  let cursor = 0;
  for (const target of targets) {
    const labelWords = normalizedWords(target.label).filter(
      (word) => !STOP_WORDS.has(word),
    );
    if (labelWords.length === 0) return null;
    let found = -1;
    for (let i = cursor; i < narrationWords.length; i++) {
      if (labelWords.some((lw) => narrationWords[i] === lw)) {
        found = i;
        break;
      }
    }
    if (found === -1) return null;
    starts.push(found);
    cursor = found + 1;
  }
  // First anchor owns everything spoken before it.
  starts[0] = 0;
  return starts;
}

/**
 * Pin the anchors that CAN be found in the narration, and interpolate the rest
 * between those pins.
 *
 * Exact alignment above is all-or-nothing, which turned out to be too brittle
 * on real lessons: a step's anchors are individual digits, but narration says
 * the numbers whole. "Write 36 on top and 15 underneath... Write 0 and carry 3."
 * has anchors [3,1,6,5,0,3] and never speaks "3","1","6" or "5" as bare words,
 * so one unmatchable anchor discarded the perfectly good pins for "0" and "3"
 * and fell back to spreading the cursor proportionally — which put it on the
 * wrong cell while the tutor said "0". Measured live, not hypothesised.
 *
 * The pins are chosen to maximise how many anchors get a real word, subject to
 * staying in order. Maximising matters: a greedy left-to-right walk lets anchor
 * 0 claim the only "3" in the sentence (at "carry 3", near the END), after
 * which nothing else can be placed and every pin is lost. Unpinned anchors are
 * then spread evenly between their neighbouring pins, so they still advance
 * with the narration but can never overrun a word that is known.
 *
 * Returns null when nothing at all could be pinned, leaving the caller's
 * proportional fallback to handle it.
 */
export function pinAnchorsToNarration(
  targets: PointerTargetDescriptor[],
  narrationWords: string[],
): number[] | null {
  const n = targets.length;
  const total = narrationWords.length;
  if (n === 0 || total === 0) return null;

  const candidates = targets.map((target) => {
    const labelWords = normalizedWords(target.label).filter(
      (word) => !STOP_WORDS.has(word),
    );
    if (labelWords.length === 0) return [] as number[];
    const found: number[] = [];
    narrationWords.forEach((word, index) => {
      if (labelWords.some((lw) => word === lw)) found.push(index);
    });
    return found;
  });

  // best[i][w] = most anchors pinnable among anchors i.. given the previous pin
  // was at word w. Small inputs (a handful of anchors, one sentence), so the
  // straightforward table is cheaper than being clever.
  type Choice = { count: number; pin: number | null };
  const memo = new Map<string, Choice>();
  const solve = (i: number, after: number): Choice => {
    if (i >= n) return { count: 0, pin: null };
    const key = `${i}:${after}`;
    const cached = memo.get(key);
    if (cached) return cached;
    // Option A: leave anchor i unpinned.
    let best: Choice = { count: solve(i + 1, after).count, pin: null };
    // Option B: pin it at its earliest valid word — earliest leaves the most
    // room for the anchors that follow.
    const word = candidates[i].find((w) => w > after);
    if (word !== undefined) {
      const withPin = 1 + solve(i + 1, word).count;
      // `>=`, not `>`: on a tie prefer PINNING. A real spoken word is better
      // evidence than an interpolation, and both options place the same number
      // of anchors. "5 × 6 = 30" with anchors [.., 6, 5, ..] is a genuine tie —
      // the narration recites the operands in the opposite order to the pen —
      // and leaving the 6 unpinned drifted the cursor onto the 5 cell while the
      // tutor said "6". Ties only; a pin that would COST a later pin still
      // loses, so anchor 0 cannot claim a word near the end of the sentence.
      if (withPin >= best.count) best = { count: withPin, pin: word };
    }
    memo.set(key, best);
    return best;
  };

  const pins: (number | null)[] = [];
  let after = -1;
  for (let i = 0; i < n; i++) {
    const choice = solve(i, after);
    pins.push(choice.pin);
    if (choice.pin !== null) after = choice.pin;
  }
  if (pins.every((pin) => pin === null)) return null;

  // Fill the gaps: spread unpinned anchors evenly between the surrounding pins.
  const starts = new Array<number>(n).fill(0);
  let cursor = 0;
  while (cursor < n) {
    if (pins[cursor] !== null) {
      starts[cursor] = pins[cursor]!;
      cursor++;
      continue;
    }
    let end = cursor;
    while (end < n && pins[end] === null) end++;
    const lowerWord = cursor === 0 ? 0 : starts[cursor - 1];
    const upperWord = end < n ? pins[end]! : total;
    const gapCount = end - cursor + 1;
    for (let k = cursor; k < end; k++) {
      const fraction = (k - cursor + 1) / gapCount;
      starts[k] = Math.min(
        Math.max(lowerWord, Math.round(lowerWord + (upperWord - lowerWord) * fraction)),
        Math.max(lowerWord, upperWord - 1),
      );
    }
    cursor = end;
  }
  // The first anchor owns the lead-in words, exactly as in exact alignment.
  starts[0] = 0;
  return starts;
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

  // Best case: every anchor's label can be found in the narration IN ORDER, so
  // the exact word at which the cursor should move is known. `targets` arrives
  // sorted by authored `sequence` (pen order), so this respects the authored
  // path and only decides the timing.
  const aligned = alignAnchorsToNarration(targets, narrationWords);
  if (aligned) {
    let index = 0;
    for (let i = 0; i < aligned.length; i++) {
      if (currentWord >= aligned[i]) index = i;
    }
    return index;
  }

  // When no anchor has a distinctive label — the column-method case, where
  // every anchor is a single digit — semantic matching is noise. Follow the
  // authored pen order instead, advancing with the narration. `targets` is
  // already sorted by `sequence` by the caller.
  // Next best: pin the anchors that ARE spoken and interpolate the rest. Real
  // narration says "36" and "15", not the individual digits those cells hold,
  // so exact alignment usually cannot place every anchor — but the anchors it
  // CAN place are still the truth about timing.
  const pinned = pinAnchorsToNarration(targets, narrationWords);
  if (pinned) {
    let index = 0;
    for (let i = 0; i < pinned.length; i++) {
      if (currentWord >= pinned[i]) index = i;
    }
    return index;
  }

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
