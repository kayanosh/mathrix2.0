import {
  alignAnchorsToNarration,
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
