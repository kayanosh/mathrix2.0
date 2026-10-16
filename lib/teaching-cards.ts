/**
 * Grouping teaching atoms into navigable cards.
 *
 * The 3-6 step cap that used to live in `compactTeachingSteps` conflated two
 * different things: the teaching ATOMS a lesson is made of, and the navigable
 * STOPS a pupil steps between. Capping the atoms to keep navigation manageable
 * destroyed the granularity the pen and the narration need — a nine-step long
 * division became six cards whose first card said three sentences at once.
 *
 * Those concerns are now separate. The data keeps every micro-action; this
 * groups them for display. Autoplay walks the atoms (so the pen writes one mark
 * per spoken phrase); prev/next and the timeline move between cards (so a pupil
 * is not clicking through twelve stops to re-read a method).
 *
 * Nothing here mutates steps, so a lesson's atoms and its cards can never
 * disagree — a card is only ever a window onto a range of them.
 */
/**
 * Only the title is read, so this works for builder `TeachingStep`s and for the
 * player's per-cue `TutorStepModel`s alike. The player navigates CUES (a
 * narration plan entry per teaching atom), which is the list that actually
 * grew when the step cap was lifted.
 */
export interface TitledStep {
  title: string;
}

export interface TeachingCard {
  /** Shown on the card and in the timeline. */
  title: string;
  /** Half-open range into the teaching steps: [start, end). */
  stepRange: [number, number];
}

/** How many steps a card covers. */
export function cardStepCount(card: TeachingCard): number {
  return Math.max(0, card.stepRange[1] - card.stepRange[0]);
}

/** Which card contains a given step index, or -1 when none does. */
export function cardIndexForStep(cards: TeachingCard[], step: number): number {
  return cards.findIndex(
    (card) => step >= card.stepRange[0] && step < card.stepRange[1],
  );
}

/**
 * The teaching phase a step title describes, used to group related actions.
 *
 * Builder titles already name the phase they belong to ("Add the ones", "Add
 * the tens", "Set up the columns"), so consecutive steps sharing a phase are
 * the same teaching moment broken into actions. Grouping on this keeps a card
 * meaningful instead of slicing the method at arbitrary intervals.
 */
function phaseOf(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\b(the|a|an|and|then|next|now|of|to|in|into)\b/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
}

/**
 * Group steps into at most `maxCards` navigable cards.
 *
 * Prefers natural boundaries (a change of teaching phase) and only falls back
 * to an even split when that would still leave too many cards. A single step
 * is a perfectly good card — legacy cache rows written before micro-steps
 * existed therefore become one card each and behave exactly as before, which is
 * what makes this safe to deploy without a content migration.
 */
export function groupTeachingStepsIntoCards(
  steps: readonly TitledStep[],
  maxCards = 6,
): TeachingCard[] {
  if (steps.length === 0) return [];

  // Group by teaching phase FIRST, always — even when the step count already
  // fits. Short-circuiting on the count was wrong: a six-atom column
  // multiplication is "Set up", then four atoms all titled "Ones x 6", then
  // "Ones line complete", and returning one card per step gave a pupil four
  // identical chips to navigate between.
  const bounds: number[] = [0];
  for (let i = 1; i < steps.length; i++) {
    if (phaseOf(steps[i].title) !== phaseOf(steps[i - 1].title)) bounds.push(i);
  }
  bounds.push(steps.length);

  let ranges: [number, number][] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    ranges.push([bounds[i], bounds[i + 1]]);
  }

  // Too many natural groups: merge the smallest neighbours until it fits,
  // which keeps the biggest teaching moments intact rather than slicing evenly.
  while (ranges.length > maxCards) {
    let smallest = 0;
    for (let i = 1; i < ranges.length - 1; i++) {
      const size = ranges[i][1] - ranges[i][0];
      const smallestSize = ranges[smallest][1] - ranges[smallest][0];
      if (size < smallestSize) smallest = i;
    }
    const mergeWith = smallest === ranges.length - 1 ? smallest - 1 : smallest + 1;
    const [a, b] = [Math.min(smallest, mergeWith), Math.max(smallest, mergeWith)];
    const merged: [number, number] = [ranges[a][0], ranges[b][1]];
    ranges = [...ranges.slice(0, a), merged, ...ranges.slice(b + 1)];
  }

  return ranges.map(([start, end]) => ({
    title: steps[start].title,
    stepRange: [start, end] as [number, number],
  }));
}
