/**
 * Grouping teaching atoms into navigable cards.
 *
 * The contract this protects: a lesson's micro-actions survive whole (so the
 * pen can write one mark per spoken phrase) WHILE a pupil still steps between
 * a handful of stops. Those were previously the same list, so capping the
 * stops destroyed the actions.
 */
import {
  cardIndexForStep,
  cardStepCount,
  groupTeachingStepsIntoCards,
} from "@/lib/teaching-cards";
import type { TeachingStep } from "@/lib/methods/types";

function step(title: string): TeachingStep {
  return {
    title,
    explanation: `${title} explanation`,
    narration: `${title} narration`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
  };
}

/** A realistic column-addition shape: setup, then a phase per column, then the answer. */
const columnAddition = [
  step("Set up the columns"),
  step("Add the ones"),
  step("Add the ones"),
  step("Add the tens"),
  step("Add the tens"),
  step("Add the hundreds"),
  step("Add the hundreds"),
  step("Write the answer"),
];

describe("groupTeachingStepsIntoCards", () => {
  it("returns nothing for no steps", () => {
    expect(groupTeachingStepsIntoCards([])).toEqual([]);
  });

  /**
   * The compatibility case that makes this safe to deploy with no content
   * migration: every cached lesson written before micro-steps existed has <= 6
   * already-merged steps, and must keep behaving exactly as it did.
   */
  it("gives a short lesson one card per step", () => {
    const steps = [step("One"), step("Two"), step("Three")];
    const cards = groupTeachingStepsIntoCards(steps);
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.stepRange)).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
    ]);
    expect(cards.map((c) => c.title)).toEqual(["One", "Two", "Three"]);
  });

  /**
   * Regression. An earlier version short-circuited when the step count already
   * fitted, returning one card per step without grouping. Real builder output
   * for a 4-digit multiplication is "Set up", then FOUR atoms all titled
   * "Ones x 6", then "Ones line complete" — six steps, so the short-circuit
   * fired and gave a pupil four identical chips to navigate between.
   */
  it("groups repeated titles even when the step count already fits", () => {
    const multiplication = [
      step("Set up the columns"),
      step("Ones × 6"),
      step("Ones × 6"),
      step("Ones × 6"),
      step("Ones × 6"),
      step("Ones line complete"),
    ];
    const cards = groupTeachingStepsIntoCards(multiplication);
    expect(cards).toHaveLength(3);
    expect(cards[1].stepRange).toEqual([1, 5]);
    expect(cardStepCount(cards[1])).toBe(4);
    expect(cards.map((c) => c.title)).toEqual([
      "Set up the columns",
      "Ones × 6",
      "Ones line complete",
    ]);
  });

  it("never exceeds the card limit however many atoms there are", () => {
    const many = Array.from({ length: 40 }, (_, i) => step(`Action ${i}`));
    expect(groupTeachingStepsIntoCards(many).length).toBeLessThanOrEqual(6);
    expect(groupTeachingStepsIntoCards(many, 3).length).toBeLessThanOrEqual(3);
  });

  it("covers every step exactly once, with no gaps or overlaps", () => {
    for (const max of [2, 3, 4, 6]) {
      const cards = groupTeachingStepsIntoCards(columnAddition, max);
      expect(cards[0].stepRange[0]).toBe(0);
      expect(cards[cards.length - 1].stepRange[1]).toBe(columnAddition.length);
      for (let i = 1; i < cards.length; i++) {
        expect(cards[i].stepRange[0]).toBe(cards[i - 1].stepRange[1]);
      }
      const covered = cards.reduce((n, c) => n + cardStepCount(c), 0);
      expect(covered).toBe(columnAddition.length);
    }
  });

  /**
   * Grouping on the teaching phase is what keeps a card meaningful. Slicing at
   * even intervals would put "the second half of the ones column" and "the
   * first half of the tens" on one card, which is not a teaching moment.
   */
  it("breaks where the teaching phase changes, not at arbitrary intervals", () => {
    const cards = groupTeachingStepsIntoCards(columnAddition, 6);
    // Each card should start at a step whose phase differs from the one before.
    for (const card of cards.slice(1)) {
      const start = card.stepRange[0];
      expect(columnAddition[start].title).not.toBe(
        columnAddition[start - 1].title,
      );
    }
    // The two "Add the ones" atoms belong to one card.
    const onesCard = cards.find((c) => c.title === "Add the ones");
    expect(onesCard).toBeDefined();
    expect(cardStepCount(onesCard!)).toBe(2);
  });

  it("keeps cards in order and titles them from their first step", () => {
    const cards = groupTeachingStepsIntoCards(columnAddition, 4);
    expect(cards.map((c) => c.title)).toEqual(
      cards.map((c) => columnAddition[c.stepRange[0]].title),
    );
    const starts = cards.map((c) => c.stepRange[0]);
    expect([...starts]).toEqual([...starts].sort((a, b) => a - b));
  });

  it("never emits an empty card", () => {
    const many = Array.from({ length: 25 }, (_, i) => step(`Phase ${i % 3}`));
    for (const card of groupTeachingStepsIntoCards(many, 6)) {
      expect(cardStepCount(card)).toBeGreaterThan(0);
    }
  });
});

describe("cardIndexForStep", () => {
  it("maps a step back to the card showing it", () => {
    const cards = groupTeachingStepsIntoCards(columnAddition, 4);
    for (let i = 0; i < columnAddition.length; i++) {
      const card = cardIndexForStep(cards, i);
      expect(card).toBeGreaterThanOrEqual(0);
      expect(i).toBeGreaterThanOrEqual(cards[card].stepRange[0]);
      expect(i).toBeLessThan(cards[card].stepRange[1]);
    }
  });

  it("reports -1 for a step no card covers", () => {
    const cards = groupTeachingStepsIntoCards(columnAddition, 4);
    expect(cardIndexForStep(cards, -1)).toBe(-1);
    expect(cardIndexForStep(cards, columnAddition.length)).toBe(-1);
    expect(cardIndexForStep([], 0)).toBe(-1);
  });
});
