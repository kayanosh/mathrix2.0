import {
  alignAnchorsToNarration,
  pinAnchorsToNarration,
  teacherPointerPoint,
  teacherSpeechProgress,
  teacherTargetIndex,
} from "@/lib/teacher-pointer";

describe("teacher pointer synchronisation", () => {
  const targets = [
    { label: "apple", sequence: 0 },
    { label: "gravity downwards", sequence: 1 },
    { label: "ground", sequence: 2 },
  ];

  it("points to the semantic visual named near the spoken word", () => {
    const narration = "The apple falls because gravity pulls it downwards.";

    expect(teacherTargetIndex(targets, narration, 1, "explain")).toBe(0);
    expect(teacherTargetIndex(targets, narration, 5, "explain")).toBe(1);
  });

  it("advances through ordered anchors when labels do not occur in speech", () => {
    const narration = "First compare each part and then finish the method.";

    expect(teacherTargetIndex(targets, narration, 0, "explain")).toBe(0);
    expect(teacherTargetIndex(targets, narration, 4, "explain")).toBe(1);
    expect(teacherTargetIndex(targets, narration, 8, "explain")).toBe(2);
  });

  it("uses the first anchor while writing and the last for pupil pause", () => {
    expect(teacherTargetIndex(targets, "", -1, "write")).toBe(0);
    expect(teacherTargetIndex(targets, "", -1, "pupil_pause")).toBe(2);
  });

  it("moves across a large visual with narration progress", () => {
    const rect = { left: 100, top: 50, width: 400, height: 50 };
    const start = teacherPointerPoint(rect, 0);
    const end = teacherPointerPoint(rect, 1);

    expect(end.x).toBeGreaterThan(start.x);
    expect(end.y).toBe(start.y);
    expect(teacherSpeechProgress("one two three four", 0, "explain")).toBeLessThan(
      teacherSpeechProgress("one two three four", 3, "explain"),
    );
  });

  it("points to the centre of a compact semantic target", () => {
    expect(
      teacherPointerPoint({ left: 20, top: 30, width: 40, height: 20 }, 0.8),
    ).toEqual({ x: 40, y: 40 });
  });
});

/**
 * DEF-004: the cursor pointed at the wrong thing.
 *
 * Two separate causes, both covered here.
 *
 * 1. TIMING. The old matcher scored every anchor against the whole narration
 *    independently, so nothing stopped a later anchor from winning early or an
 *    earlier one from winning late. alignAnchorsToNarration walks the words ONCE
 *    and hands each anchor the next occurrence of its own label, which pins the
 *    exact word at which the cursor should move.
 *
 * 2. DIGIT COLLISIONS. Column-method anchors are labelled with bare digits that
 *    repeat across cells, so a "semantic" match on them picks a cell by
 *    coincidence. Those anchors carry an authored pen order instead, which is
 *    the real teaching order.
 */
describe("alignAnchorsToNarration (DEF-004)", () => {
  const at = (labels: string[], narration: string) =>
    alignAnchorsToNarration(
      labels.map((label, sequence) => ({ label, sequence })),
      narration
        .toLowerCase()
        .replace(/[^a-z0-9.+\-÷×=/%]+/g, " ")
        .trim()
        .split(/\s+/)
        .map((w) => w.replace(/^\.+|\.+$/g, ""))
        .filter(Boolean),
    );

  it("moves at the word that names the anchor, not at a proportional guess", () => {
    // "8 times 7 is 56. Write 6 and carry 5."
    //   0    1   2  3  4     5   6  7    8  9
    // The 6 cell holds until the tutor actually says the carried "5.".
    expect(at(["6", "5"], "8 times 7 is 56. Write 6 and carry 5.")).toEqual([0, 9]);
  });

  it("strips sentence punctuation so a final digit still matches", () => {
    // Regression: the character class keeps "." for decimals, so the spoken
    // token "5." never equalled the cell label "5" and the cursor stayed put.
    expect(at(["5"], "carry 5.")).toEqual([0]);
  });

  it("cannot let a repeated digit pull a later anchor backwards", () => {
    // Both anchors are labelled "6". The second must take the SECOND
    // occurrence — the in-order walk is what guarantees that.
    expect(at(["6", "6"], "Write 6 then carry 6 to the next column")).toEqual([0, 4]);
  });

  it("declines (returns null) when an anchor's label is never spoken", () => {
    expect(at(["7"], "there are no digits in this sentence")).toBeNull();
  });

  it("declines when the anchors cannot be placed IN ORDER", () => {
    // "5" is spoken before "6", so the authored order [5, 6] is unachievable.
    // Declining hands over to the sequence fallback rather than inventing a
    // path that contradicts the pen order.
    expect(at(["5", "6"], "write 6 and carry 5")).toBeNull();
  });

  it("gives the first anchor everything spoken before it", () => {
    // Not [3, ...] — the cursor must not be parked on a later anchor during the
    // lead-in words.
    expect(at(["4", "9"], "now add 4 and then 9")?.[0]).toBe(0);
  });
});

describe("teacherTargetIndex with digit anchors (DEF-004)", () => {
  const cells = [
    { label: "6", sequence: 0 },
    { label: "5", sequence: 1 },
  ];
  const narration = "8 times 7 is 56. Write 6 and carry 5.";

  it("holds the first cell until the carry is actually spoken", () => {
    for (const word of [0, 3, 6, 8]) {
      expect(teacherTargetIndex(cells, narration, word, "explain")).toBe(0);
    }
    expect(teacherTargetIndex(cells, narration, 9, "explain")).toBe(1);
  });

  it("falls back to authored pen order when digits are never spoken", () => {
    // No digit appears, so alignment declines. Bare digits are not distinctive
    // enough to match semantically, so the cursor follows `sequence`.
    const silent = "first work through the ones and then the tens";
    expect(teacherTargetIndex(cells, silent, 0, "explain")).toBe(0);
    expect(teacherTargetIndex(cells, silent, 8, "explain")).toBe(1);
  });
});

/**
 * DEF-004, timing on real lessons.
 *
 * Both narrations below were captured live by scripts/audit-cursor-semantics.ts
 * as MISSes — the cursor was on the wrong cell while the tutor spoke a digit
 * that WAS one of that step's anchors. Exact alignment cannot save these: the
 * anchors are individual digits but narration says the numbers whole ("36",
 * "15"), and "10" is spoken as "a zero". One unmatchable anchor discarded every
 * good pin and fell back to a proportional guess.
 */
describe("pinAnchorsToNarration on captured live narration (DEF-004)", () => {
  const words = (narration: string) =>
    narration
      .toLowerCase()
      .replace(/[^a-z0-9.+\-÷×=/%]+/g, " ")
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/^\.+|\.+$/g, ""))
      .filter(Boolean);

  const indexAt = (labels: string[], narration: string, word: number) =>
    teacherTargetIndex(
      labels.map((label, sequence) => ({ label, sequence })),
      narration,
      word,
      "explain",
    );

  it("still holds the carry cell when the tutor says the carry (long multiplication)", () => {
    const narration =
      "Write 36 on top and 15 underneath, lining up ones under ones. 5 × 6 = 30. " +
      "Write 0 and carry 3. Here is why. Ones under ones, tens under tens. " +
      "The arrow shows carry 3 moving to the tens.";
    const labels = ["3", "1", "6", "5", "0", "3"];
    const w = words(narration);
    // Exact alignment genuinely cannot place these anchors.
    expect(
      alignAnchorsToNarration(
        labels.map((label, sequence) => ({ label, sequence })),
        w,
      ),
    ).toBeNull();

    // "Write 0" -> the 0 cell (anchor 4). Previously the cursor was on "6".
    const zeroWord = w.indexOf("0");
    expect(zeroWord).toBeGreaterThan(-1);
    expect(indexAt(labels, narration, zeroWord)).toBe(4);

    // "carry 3" -> the carry (anchor 5, the last). Previously on "1".
    const carryWord = w.indexOf("carry") + 1;
    expect(indexAt(labels, narration, carryWord)).toBe(5);
  });

  it("moves to the 6 cell when the tutor says 'Write 6' (shifted partial product)", () => {
    const narration =
      "This digit is really 10, so put a zero in the ones and start one column " +
      "further left. 1 × 6 = 6. Write 6. Here is why. The 1 is really 10, so " +
      "every answer digit shifts 1 place left. Multiply the tens digit by 1.";
    const labels = ["0", "6"];
    const w = words(narration);
    // "0" is never spoken as a bare word here — it is "a zero" and "10".
    expect(w).not.toContain("0");

    // Lead-in belongs to the zero cell...
    expect(indexAt(labels, narration, 2)).toBe(0);
    // ...and the cursor reaches the 6 cell once a "6" is actually spoken.
    // Previously it sat on the zero for the whole step.
    const sixWord = w.indexOf("6");
    expect(sixWord).toBeGreaterThan(-1);
    expect(indexAt(labels, narration, sixWord)).toBe(1);
    expect(indexAt(labels, narration, w.length - 1)).toBe(1);
  });

  it("maximises pins rather than walking greedily", () => {
    // Greedy would let anchor 0 ("3") claim the only "3", which sits at the very
    // end in "carry 3" — after which nothing else can be placed and all pins are
    // lost. Maximising keeps the pins for "0" and the carry "3".
    const pins = pinAnchorsToNarration(
      ["3", "1", "6", "5", "0", "3"].map((label, sequence) => ({ label, sequence })),
      words("Write 36 and 15. Write 0 and carry 3."),
    );
    expect(pins).not.toBeNull();
    // Non-decreasing, so the cursor can never travel backwards.
    for (let i = 1; i < pins!.length; i++) {
      expect(pins![i]).toBeGreaterThanOrEqual(pins![i - 1]);
    }
    // The two genuinely-spoken anchors land on their own words.
    const w = words("Write 36 and 15. Write 0 and carry 3.");
    expect(pins![4]).toBe(w.indexOf("0"));
    expect(pins![5]).toBe(w.lastIndexOf("3"));
  });

  it("returns null when not one anchor can be pinned", () => {
    expect(
      pinAnchorsToNarration(
        ["7", "8"].map((label, sequence) => ({ label, sequence })),
        words("now look carefully at the next column"),
      ),
    ).toBeNull();
  });
});

describe("pinAnchorsToNarration tie-breaking (DEF-004)", () => {
  const words = (narration: string) =>
    narration
      .toLowerCase()
      .replace(/[^a-z0-9.+\-÷×=/%]+/g, " ")
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/^\.+|\.+$/g, ""))
      .filter(Boolean);

  const narration =
    "Write 36 on top and 15 underneath, lining up ones under ones. 5 × 6 = 30. " +
    "Write 0 and carry 3. Here is why. Ones under ones, tens under tens. " +
    "The arrow shows carry 3 moving to the tens.";
  const labels = ["3", "1", "6", "5", "0", "3"];

  it("sits on the 6 cell while the tutor says '6'", () => {
    // Captured live as a MISS. The narration recites "5 × 6" but the pen order
    // writes the 6 cell before the 5 cell, so pinning either one yields the same
    // number of pins. Preferring the pin keeps the cursor on the digit spoken.
    const w = words(narration);
    const sixWord = w.indexOf("6");
    expect(
      teacherTargetIndex(
        labels.map((label, sequence) => ({ label, sequence })),
        narration,
        sixWord,
        "explain",
      ),
    ).toBe(2);
  });

  it("still refuses a pin that would cost a later one", () => {
    // Anchor 0 is labelled "3" and the only bare "3" is at the very END, in
    // "carry 3". Claiming it would strand every following anchor, so anchor 0
    // must stay unpinned even though pinning is otherwise preferred.
    const short = "Write 36 and 15. Write 0 and carry 3.";
    const w = words(short);
    const pins = pinAnchorsToNarration(
      labels.map((label, sequence) => ({ label, sequence })),
      w,
    )!;
    expect(pins[4]).toBe(w.indexOf("0"));
    expect(pins[5]).toBe(w.lastIndexOf("3"));
    for (let i = 1; i < pins.length; i++) {
      expect(pins[i]).toBeGreaterThanOrEqual(pins[i - 1]);
    }
  });
});

/**
 * KNOWN LIMITATION, characterised rather than hidden.
 *
 * A step's anchors are in PEN order (the order the digits get written). Some
 * narration recites them in a different order — "5 × 6" when the pen writes the
 * 6 cell before the 5 cell, or "Write 8 (and 1 next door)" when the pen order is
 * 1 then 8. The cursor is deliberately monotonic, because a hand that jumps
 * backwards mid-sentence reads as a glitch rather than as teaching. So for a
 * pair recited against pen order, exactly one of the two must be off.
 *
 * These are the only two failures left in the live audit
 * (scripts/audit-cursor-semantics.ts), at 9/11 spoken anchors correct across
 * three topics. Locking the behaviour down means a future change that alters
 * this trade-off has to do so on purpose.
 */
describe("teacher pointer: recited-against-pen-order is monotonic (DEF-004)", () => {
  it("keeps the cursor moving forwards when narration recites out of pen order", () => {
    const narration =
      "5 × 3 = 15, plus carry 3 is 18. Write 8 (and 1 next door). " +
      "So far: 36 × 5 = 180. Here is why. Add the 3 we carried.";
    const targets = ["1", "8", "0"].map((label, sequence) => ({ label, sequence }));
    const indices = Array.from({ length: 24 }, (_, w) =>
      teacherTargetIndex(targets, narration, w, "explain"),
    );
    // Never decreases: the hand only ever moves on.
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThanOrEqual(indices[i - 1]);
    }
    // And it does traverse the path rather than sticking on one anchor.
    expect(new Set(indices).size).toBeGreaterThan(1);
  });
});
