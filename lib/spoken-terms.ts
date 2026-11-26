/**
 * Which term on the board the teacher is talking about right now.
 *
 * A teacher explaining "that 7 is in the way, so subtract 7 from both sides"
 * touches the 7 as they say it — first the one in the line above, then the one
 * they have just written. That is what this decides: given the terms visible on
 * the board (in reading order) and the word being spoken, which term the pen
 * should be on.
 *
 * It differs from teacherTargetIndex in lib/teacher-pointer.ts on purpose. That
 * one walks a fixed, authored list of anchors in order and must visit all of
 * them, which suits a column method where every cell is written in turn. A line
 * of algebra has no such order: most of its terms are never mentioned, and
 * sweeping the pen across the ones that are not would point at things the
 * teacher is not talking about. So here a term is only ever chosen because its
 * own value was spoken.
 */
import { normalizedWords } from "@/lib/teacher-pointer";

/** Words that are also single letters, and so cannot be taken as an unknown. */
const NOT_A_VARIABLE = new Set(["a", "i"]);

/** How far ahead the pen may move to a term that is about to be mentioned. */
const ANTICIPATION_WORDS = 5;

/**
 * "−7", "+ 7" and "7" are the same term. Lower-cased because the narration's
 * words are, so a board that writes X is still found when the teacher says "x".
 */
export function normaliseTermLabel(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^[+\-−–]+/, "")
    .replace(/[.,;:]+$/, "");
}

/** A label the pen can meaningfully point at: a number or a single unknown. */
export function isPointableTerm(label: string): boolean {
  return /^\d+(?:\.\d+)?$/.test(label) || /^[a-zA-Z]$/.test(label);
}

interface Mention {
  /** Index into the narration's whitespace-separated words. */
  word: number;
  /** Index into the term list. */
  term: number;
}

/**
 * Every place the narration names a term, in spoken order. When a value occurs
 * more than once on the board, its first mention goes to the first occurrence,
 * its second to the second, and any further mentions stay on the last — so
 * "that 7 … subtract 7" touches the 7 above and then the 7 just written.
 */
export function termMentions(labels: string[], narration: string): Mention[] {
  const byLabel = new Map<string, number[]>();
  labels.forEach((raw, index) => {
    const label = normaliseTermLabel(raw);
    if (!isPointableTerm(label)) return;
    byLabel.set(label, [...(byLabel.get(label) || []), index]);
  });

  const seen = new Map<string, number>();
  const mentions: Mention[] = [];
  // Words are counted the way the speech clock counts them — split on
  // whitespace — so `word` lines up with the index it reports. Counting cleaned
  // words instead drifts by one after every dash or stray symbol.
  const tokens = narration.split(/\s+/).filter(Boolean);
  const pairsSeen = new Map<string, number>();
  tokens
    .forEach((token, word) => {
      for (const raw of normalizedWords(token)) {
        const spoken = normaliseTermLabel(raw);
        if (NOT_A_VARIABLE.has(spoken)) continue;
        const candidates = byLabel.get(spoken);
        if (!candidates) continue;

        // "3 x" is the 3 that has an x written after it. With "5x − 2x − 3 = 9"
        // above and "3x − 3 = 9" being written, "simplifies to 3 x" went to the
        // lone 3 on the line above, because it comes first on the board.
        const nextLetter = normaliseTermLabel(normalizedWords(tokens[word + 1] ?? "")[0] ?? "");
        if (/^\d/.test(spoken) && /^[a-z]$/.test(nextLetter) && !NOT_A_VARIABLE.has(nextLetter)) {
          const withLetter = candidates.filter((c) => normaliseTermLabel(labels[c + 1] ?? "") === nextLetter);
          if (withLetter.length > 0) {
            const key = `${spoken}${nextLetter}`;
            const nth = pairsSeen.get(key) ?? 0;
            pairsSeen.set(key, nth + 1);
            mentions.push({ word, term: withLetter[Math.min(nth, withLetter.length - 1)] });
            break;
          }
        }

        // "2 x" said together is one term, 2x. The x meant is the one written
        // straight after that 2, not the first x on the board: with 5x − 3 =
        // 2x + 9 above, "move 2 x to the left" sent the pen to the x of 5x.
        const previous = mentions[mentions.length - 1];
        if (
          /^[a-z]$/.test(spoken) &&
          previous &&
          previous.word === word - 1 &&
          /^\d/.test(normaliseTermLabel(labels[previous.term])) &&
          normaliseTermLabel(labels[previous.term + 1] ?? "") === spoken
        ) {
          mentions.push({ word, term: previous.term + 1 });
          break;
        }
        const occurrence = seen.get(spoken) ?? 0;
        seen.set(spoken, occurrence + 1);
        mentions.push({ word, term: candidates[Math.min(occurrence, candidates.length - 1)] });
        break;
      }
    });
  return mentions;
}

/**
 * The term the pen should be on while word `activeWord` is spoken, or -1 when
 * the narration is not (and is not about to be) talking about any term — in
 * which case the caller falls back to pointing at the line as a whole.
 */
export function spokenTermIndex(
  labels: string[],
  narration: string,
  activeWord: number,
): number {
  const mentions = termMentions(labels, narration);
  if (mentions.length === 0) return -1;
  const current = Math.max(0, activeWord);

  let chosen = -1;
  for (const mention of mentions) {
    if (mention.word <= current) chosen = mention.term;
  }
  if (chosen !== -1) return chosen;

  // Nothing mentioned yet. Move early to the first term if it is coming up, as
  // a teacher's hand arrives just before the word does.
  const first = mentions[0];
  return first.word - current <= ANTICIPATION_WORDS ? first.term : -1;
}
