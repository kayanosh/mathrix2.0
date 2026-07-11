import {
  buildColumnRevealTimeline,
  revealStateAt,
  withResultRow,
  cellKey,
  gridMaxCols,
} from "@/lib/column-reveal";
import type { ColumnMethodBlock } from "@/types/whiteboard";

// Blocks mirror the canonical examples from the system prompt.

const addition: ColumnMethodBlock = {
  type: "column_method",
  method: "column_addition",
  rows: ["456", "+278"],
  carries: [
    { row: 0, col: 1, digit: "1" },
    { row: 0, col: 0, digit: "1" },
  ],
  separatorAfterRows: [1],
  question: "456 + 278",
  answer: "734",
};

const subtraction: ColumnMethodBlock = {
  type: "column_method",
  method: "column_subtraction",
  rows: ["503", "-178"],
  cellNotes: [
    { row: 0, col: 2, strike: true },
    { row: 0, col: 1, strike: true, rewrite: "9" },
    { row: 0, col: 0, strike: true, rewrite: "4" },
  ],
  separatorAfterRows: [1],
  question: "503 - 178",
  answer: "325",
};

const multiplication: ColumnMethodBlock = {
  type: "column_method",
  method: "column_multiplication",
  rows: [" 23", "×45", "115", "920", "1035"],
  carries: [{ row: 0, col: 1, digit: "1" }],
  separatorAfterRows: [1, 3],
  question: "23 × 45",
  answer: "1035",
};

const division: ColumnMethodBlock = {
  type: "column_method",
  method: "long_division",
  rows: ["    32", "12)384", "   36↓", "    24", "    24", "     0"],
  separatorAfterRows: [2, 4],
  question: "384 ÷ 12",
  answer: "32",
};

describe("withResultRow", () => {
  it("appends the answer digits as a result row for addition", () => {
    const out = withResultRow(addition);
    expect(out.rows).toEqual(["456", "+278", "734"]);
  });

  it("does not duplicate an existing result row", () => {
    const withRow = { ...addition, rows: ["456", "+278", "734"] };
    expect(withResultRow(withRow).rows).toHaveLength(3);
  });

  it("re-indexes carries when the answer is wider than the operands", () => {
    const overflow: ColumnMethodBlock = {
      ...addition,
      rows: ["456", "+644"],
      carries: [{ row: 0, col: 0, digit: "1" }],
      question: "456 + 644",
      answer: "1100",
    };
    const out = withResultRow(overflow);
    expect(gridMaxCols(out.rows)).toBe(4);
    expect(out.carries?.[0].col).toBe(1); // shifted right by 1
  });

  it("leaves multiplication and division blocks untouched", () => {
    expect(withResultRow(multiplication).rows).toEqual(multiplication.rows);
    expect(withResultRow(division).rows).toEqual(division.rows);
  });

  it("is a no-op for non-numeric answers", () => {
    const money = { ...addition, answer: "£7.34" };
    expect(withResultRow(money).rows).toEqual(["456", "+278"]);
  });
});

describe("buildColumnRevealTimeline — addition", () => {
  const steps = buildColumnRevealTimeline(addition);

  it("produces setup + one step per column + answer", () => {
    // 3 columns → 5 steps
    expect(steps).toHaveLength(5);
  });

  it("computes correct digit-level narration from the block digits", () => {
    expect(steps[1].narration).toContain("6 add 8");
    expect(steps[1].narration).toContain("14");
    expect(steps[1].narration).toContain("write 4 and carry 1");
    expect(steps[2].narration).toContain("5 add 7");
    expect(steps[2].narration).toContain("plus the 1 we carried");
  });

  it("reveals result digits right-to-left in the synthesized result row", () => {
    // Result row is index 2 after withResultRow.
    expect(steps[1].cellKeys).toEqual([cellKey(2, 2)]);
    expect(steps[2].cellKeys).toEqual([cellKey(2, 1)]);
    expect(steps[3].cellKeys).toEqual([cellKey(2, 0)]);
  });

  it("reveals each carry with the column that produces it", () => {
    expect(steps[1].carryKeys).toEqual([cellKey(0, 1)]);
    expect(steps[2].carryKeys).toEqual([cellKey(0, 0)]);
  });

  it("shows the answer line only on the final step", () => {
    expect(steps.slice(0, -1).every((s) => !s.showAnswer)).toBe(true);
    expect(steps[steps.length - 1].showAnswer).toBe(true);
  });
});

describe("buildColumnRevealTimeline — subtraction with borrow cascade", () => {
  const steps = buildColumnRevealTimeline(subtraction);

  it("explains borrowing through zeros", () => {
    const ones = steps[1];
    expect(ones.narration).toContain("3 is smaller than 8");
    expect(ones.narration).toContain("borrow");
    expect(ones.narration).toContain("13 take away 8 is 5");
  });

  it("uses the borrowed values in later columns", () => {
    expect(steps[2].narration).toContain("9 take away 7 is 2");
    expect(steps[3].narration).toContain("4 take away 1 is 3");
  });

  it("reveals strike/rewrite notes with the borrow step", () => {
    // The ones-column borrow cascades through the zero: all three notes fire.
    expect(steps[1].noteKeys).toEqual(
      expect.arrayContaining([cellKey(0, 0), cellKey(0, 1), cellKey(0, 2)]),
    );
  });
});

describe("buildColumnRevealTimeline — multiplication", () => {
  const steps = buildColumnRevealTimeline(multiplication);

  it("produces setup + one step per partial product + total", () => {
    expect(steps).toHaveLength(4);
  });

  it("explains each partial product with the right multiplier digit", () => {
    expect(steps[1].narration).toContain("by the ones digit, 5");
    expect(steps[1].narration).toContain("115");
    expect(steps[2].narration).toContain("by the tens digit, 4");
    expect(steps[2].narration).toContain("zero");
    expect(steps[2].narration).toContain("920");
  });

  it("adds the partial products in the final step", () => {
    const last = steps[steps.length - 1];
    expect(last.narration).toContain("115 add 920");
    expect(last.narration).toContain("1035");
    expect(last.showAnswer).toBe(true);
  });

  it("reveals whole partial-product rows", () => {
    // "115" occupies grid cols 1..3 of row 2 (maxCols = 4).
    expect(steps[1].cellKeys).toEqual([cellKey(2, 1), cellKey(2, 2), cellKey(2, 3)]);
  });
});

describe("buildColumnRevealTimeline — long division", () => {
  const steps = buildColumnRevealTimeline(division);

  it("produces setup + one step per working row + answer", () => {
    // 4 working rows below the bracket → 6 steps
    expect(steps).toHaveLength(6);
  });

  it("starts with the bracket row and reveals quotient digits with divide steps", () => {
    expect(steps[0].cellKeys).toEqual(
      expect.arrayContaining([cellKey(1, 0), cellKey(1, 5)]),
    );
    // First divide step includes a quotient digit from row 0.
    expect(steps[1].cellKeys.some((k) => k.startsWith("0-"))).toBe(true);
  });

  it("alternates divide and subtract narration", () => {
    expect(steps[1].narration).toContain("multiply back");
    expect(steps[2].narration).toContain("Subtract");
  });
});

describe("buildColumnRevealTimeline — fallback", () => {
  it("falls back to row-by-row for non-integer rows", () => {
    const decimals: ColumnMethodBlock = {
      type: "column_method",
      method: "column_addition",
      rows: ["4.5", "+2.8"],
      question: "4.5 + 2.8",
      answer: "7.3",
    };
    const steps = buildColumnRevealTimeline(decimals);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[steps.length - 1].showAnswer).toBe(true);
  });
});

describe("revealStateAt", () => {
  const steps = buildColumnRevealTimeline(addition);

  it("accumulates cells across steps and marks the latest as active", () => {
    const state = revealStateAt(steps, 2);
    expect(state.cells.has(cellKey(2, 2))).toBe(true); // from step 1
    expect(state.cells.has(cellKey(2, 1))).toBe(true); // from step 2
    expect(state.cells.has(cellKey(2, 0))).toBe(false); // step 3 not reached
    expect(state.active.has(cellKey(2, 1))).toBe(true);
    expect(state.active.has(cellKey(2, 2))).toBe(false);
  });

  it("reveals nothing at -1 and everything at the final step", () => {
    expect(revealStateAt(steps, -1).cells.size).toBe(0);
    const full = revealStateAt(steps, steps.length - 1);
    expect(full.showAnswer).toBe(true);
    expect(full.cells.has(cellKey(2, 0))).toBe(true);
  });

  it("clamps past-the-end indices", () => {
    const full = revealStateAt(steps, 99);
    expect(full.showAnswer).toBe(true);
  });
});
