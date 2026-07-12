import { normalizeMathText } from "@/lib/methods/normalize-math-text";
import { parseMultiplicationOperands } from "@/lib/methods/column-multiplication";

describe("normalizeMathText", () => {
  it("unwraps LaTeX multiplication", () => {
    expect(normalizeMathText("Calculate $23 \\times 47$")).toBe(
      "Calculate 23 × 47",
    );
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
