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

  it("produces digit-level steps (more than one per partial product)", () => {
    // setup + digit steps for ones + place-value + tens digits + total
    expect(steps.length).toBeGreaterThan(4);
  });

  it("explains ones-digit products digit-by-digit", () => {
    const joined = steps.map((s) => s.narration).join(" ");
    expect(joined).toMatch(/ones digit|Ones × 5|5 times 2|5 × 2/i);
    expect(joined).toMatch(/115|carry/i);
  });

  it("explains the tens place-value zero before the tens line", () => {
    const joined = steps.map((s) => s.narration).join(" ");
    expect(joined).toMatch(/zero/i);
    expect(joined).toMatch(/920|tens/i);
  });

  it("adds the partial products column by column before the answer", () => {
    const joined = steps.map((s) => s.narration).join(" ");
    expect(joined).toMatch(/115/);
    expect(joined).toMatch(/920/);
    expect(joined).toMatch(/1035/);
    const last = steps[steps.length - 1];
    expect(last.narration).toMatch(/1035/);
    expect(last.showAnswer).toBe(true);
  });

  it("reveals the first ones digit in the ones column", () => {
    // 23×45 → ones: 5×3=15 write 5 carry 1 at ones of partial row
    const firstDigit = steps.find((s) =>
      /5 × 3|5 times 3/i.test(s.narration + (s.explanation || "")),
    );
    expect(firstDigit).toBeTruthy();
    expect(firstDigit!.cellKeys.length).toBeGreaterThan(0);
  });
});

describe("buildColumnRevealTimeline — long division", () => {
  const steps = buildColumnRevealTimeline(division);

  it("produces digit-level steps from the builder (more than one per row)", () => {
    expect(steps.length).toBeGreaterThan(6);
  });

  it("starts with bus-stop setup then divide/multiply/subtract stages", () => {
    expect(steps[0].narration).toMatch(/384|bus stop|bracket/i);
    const joined = steps.map((s) => s.narration).join(" ");
    expect(joined).toMatch(/12 go into 38/i);
    expect(joined).toMatch(/3 times 12|3 × 12/i);
    expect(joined).toMatch(/bring down/i);
    expect(joined).toMatch(/12 go into 24/i);
  });

  it("writes quotient digits on row 0 before multiply-back rows", () => {
    const firstQuotient = steps.find((s) =>
      /write 3 on top/i.test(s.narration + (s.explanation || "")),
    );
    expect(firstQuotient).toBeTruthy();
    expect(firstQuotient!.cellKeys[0].startsWith("0-")).toBe(true);
  });

  it("ends with the answer", () => {
    const last = steps[steps.length - 1];
    expect(last.showAnswer).toBe(true);
    expect(last.narration).toMatch(/32/);
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
