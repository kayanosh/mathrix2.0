import {
  mathsValuesEquivalent,
  parseMathsValue,
} from "@/lib/maths-value";

function value(text: string): string {
  const parsed = parseMathsValue(text);
  if (!parsed) return "null";
  return `${parsed.value.num}/${parsed.value.den}`;
}

describe("parseMathsValue", () => {
  it("parses integers, decimals and fractions exactly", () => {
    expect(value("42")).toBe("42/1");
    expect(value("1.25")).toBe("5/4");
    expect(value("3/4")).toBe("3/4");
    expect(value("0.1")).toBe("1/10");
  });

  it("parses mixed numbers in every notation", () => {
    expect(value("1 1/4")).toBe("5/4");
    expect(value("$1\\frac{1}{4}$")).toBe("5/4");
    expect(value("1¼")).toBe("5/4");
    expect(value("-1 1/2")).toBe("-3/2");
  });

  it("parses unicode vulgar fractions", () => {
    expect(value("½")).toBe("1/2");
    expect(value("¾ of the bar")).toBe("3/4");
  });

  it("takes the last value in worked text", () => {
    expect(value("£4.50 each, so £9 altogether")).toBe("9/1");
    expect(value("12 cm")).toBe("12/1");
  });

  it("reduces fractions", () => {
    expect(value("6/8")).toBe("3/4");
  });

  it("flags percentages", () => {
    expect(parseMathsValue("50%")?.isPercent).toBe(true);
    expect(parseMathsValue("50")?.isPercent).toBe(false);
  });

  it("returns null when there is no value", () => {
    expect(parseMathsValue("the answer is a square")).toBeNull();
  });
});

describe("mathsValuesEquivalent", () => {
  it("matches across notations", () => {
    expect(mathsValuesEquivalent("1.25", "1 1/4")).toBe(true);
    expect(mathsValuesEquivalent("$1\\frac{1}{4}$", "5/4")).toBe(true);
    expect(mathsValuesEquivalent("1¼", "1.25")).toBe(true);
    expect(mathsValuesEquivalent("0.5", "1/2")).toBe(true);
  });

  it("matches percentage and fraction/decimal forms", () => {
    expect(mathsValuesEquivalent("50%", "1/2")).toBe(true);
    expect(mathsValuesEquivalent("50%", "0.5")).toBe(true);
    expect(mathsValuesEquivalent("50%", "50")).toBe(true);
    expect(mathsValuesEquivalent("25%", "1/4")).toBe(true);
  });

  it("rejects different values exactly", () => {
    expect(mathsValuesEquivalent("1/3", "0.333333")).toBe(false);
    expect(mathsValuesEquivalent("1 1/2", "1 1/4")).toBe(false);
    expect(mathsValuesEquivalent("0.25", "1 1/4")).toBe(false);
  });
});
