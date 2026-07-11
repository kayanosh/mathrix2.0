import {
  visibleLatexLength,
  estimateMathWriteMs,
  estimateTextWriteMs,
  estimateColumnStepWriteMs,
  HAND_CHAR_MS,
  MATH_CHAR_MS,
  CELL_WRITE_MS,
} from "@/lib/handwriting";

describe("visibleLatexLength", () => {
  it("counts plain symbols", () => {
    expect(visibleLatexLength("2x+3=11")).toBe(7);
  });

  it("counts a command as one drawn symbol", () => {
    // \frac draws the bar; 1 and 2 are digits → 3 symbols.
    expect(visibleLatexLength("\\frac{1}{2}")).toBe(3);
  });

  it("ignores invisible meta arguments", () => {
    const plain = visibleLatexLength("2x");
    expect(visibleLatexLength("\\textcolor{#dc2626}{2x}")).toBe(plain);
    expect(visibleLatexLength("\\htmlId{t1}{2x}")).toBe(plain);
    expect(visibleLatexLength("\\phantom{999}2x")).toBe(plain);
  });

  it("counts \\text content as its characters", () => {
    expect(visibleLatexLength("\\text{cm}")).toBe(2);
  });

  it("ignores whitespace and braces", () => {
    expect(visibleLatexLength("{ 2 x }")).toBe(2);
  });
});

describe("estimateMathWriteMs", () => {
  it("scales with visible length", () => {
    expect(estimateMathWriteMs("2x+3=11")).toBe(7 * MATH_CHAR_MS);
  });

  it("clamps tiny expressions to the minimum", () => {
    expect(estimateMathWriteMs("x")).toBe(250);
  });

  it("clamps huge expressions to the maximum", () => {
    expect(estimateMathWriteMs("1".repeat(500))).toBe(2500);
  });
});

describe("estimateTextWriteMs", () => {
  it("uses hand pace for plain text", () => {
    const text = "Add the ones column first";
    expect(estimateTextWriteMs(text)).toBe(text.length * HAND_CHAR_MS);
  });

  it("uses math pace for $...$ segments", () => {
    const mixed = "Solve $2x=8$ now";
    const plainChars = "Solve  now".length;
    const expected = plainChars * HAND_CHAR_MS + 4 * MATH_CHAR_MS;
    expect(estimateTextWriteMs(mixed)).toBe(Math.round(expected));
  });

  it("clamps long paragraphs", () => {
    expect(estimateTextWriteMs("a".repeat(1000))).toBe(3500);
  });

  it("returns the floor for empty text", () => {
    expect(estimateTextWriteMs("")).toBe(300);
  });
});

describe("estimateColumnStepWriteMs", () => {
  it("scales with the number of written cells", () => {
    expect(estimateColumnStepWriteMs(2)).toBe(250 + 2 * CELL_WRITE_MS);
  });

  it("never dips below the floor", () => {
    expect(estimateColumnStepWriteMs(0)).toBe(400);
  });

  it("caps long setups", () => {
    expect(estimateColumnStepWriteMs(50)).toBe(2500);
  });
});
