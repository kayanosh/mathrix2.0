import { normalizeMathText } from "@/lib/methods/normalize-math-text";
import { parseMultiplicationOperands } from "@/lib/methods/column-multiplication";
import {
  parseAdditionOperands,
  parseSubtractionOperands,
} from "@/lib/methods/column-addition";

describe("normalizeMathText", () => {
  it("unwraps LaTeX multiplication", () => {
    expect(normalizeMathText("Calculate $23 \\times 47$")).toBe(
      "Calculate 23 × 47",
    );
  });

  it("unwraps LaTeX fractions", () => {
    expect(normalizeMathText("Order $\\frac{1}{2}$ and $\\frac{3}{4}$")).toBe(
      "Order 1/2 and 3/4",
    );
  });

  it("strips thousands-separator commas from numbers", () => {
    expect(normalizeMathText("$62,403 - 27,568$")).toBe("62403 - 27568");
    expect(normalizeMathText("$1,234,567 + 2$")).toBe("1234567 + 2");
  });

  it("does not touch commas in lists or coordinates (not followed by 3 digits)", () => {
    expect(normalizeMathText("Compare 1/2, 3/4, 2/3")).toBe(
      "Compare 1/2, 3/4, 2/3",
    );
    expect(normalizeMathText("plot (3, 4)")).toBe("plot (3, 4)");
  });

  it("unwraps \\text{} to its plain content (DEF-013 regression)", () => {
    expect(normalizeMathText("$4\\text{ cm}$ long")).toBe("4cm long");
  });
});

describe("operand parsers with comma-formatted thousands (DEF-008 regression)", () => {
  it("parses a comma-formatted subtraction as one number per side, not the digits adjacent to the operator", () => {
    expect(parseSubtractionOperands("$62,403 - 27,568$")).toEqual({
      a: 62403,
      b: 27568,
    });
  });

  it("parses a comma-formatted addition as one number per side", () => {
    expect(parseAdditionOperands("$4,786 + 2,659$")).toEqual({
      a: 4786,
      b: 2659,
    });
  });
});

describe("parseMultiplicationOperands with LaTeX", () => {
  it("parses $23 \\times 47$", () => {
    expect(
      parseMultiplicationOperands(
        "Calculate $23 \\times 47$ using long multiplication",
      ),
    ).toEqual({ a: 23, b: 47 });
  });

  it("parses '23 by 47' from intro prose", () => {
    expect(parseMultiplicationOperands("multiplication of 23 by 47")).toEqual({
      a: 23,
      b: 47,
    });
  });
});
