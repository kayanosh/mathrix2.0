import { normalise } from "@/lib/cas-solver";

describe("CAS solver - normalise", () => {
  it("converts Unicode minus to ASCII", () => {
    expect(normalise("x − 3")).toBe("x - 3");
  });

  it("converts multiplication symbols", () => {
    expect(normalise("2 × 3")).toBe("2 * 3");
    expect(normalise("2 ÷ 3")).toBe("2 / 3");
  });

  it("adds implicit multiplication for number-variable", () => {
    expect(normalise("2x")).toBe("2*x");
    expect(normalise("3y")).toBe("3*y");
  });

  it("adds implicit multiplication for number-bracket", () => {
    expect(normalise("3(x+1)")).toBe("3*(x+1)");
  });

  it("adds implicit multiplication for bracket-bracket", () => {
    expect(normalise("(x+1)(x+2)")).toBe("(x+1)*(x+2)");
  });

  it("adds implicit multiplication for variable-bracket", () => {
    expect(normalise("x(y+1)")).toBe("x*(y+1)");
  });

  it("adds implicit multiplication for bracket-variable", () => {
    expect(normalise("(x+1)y")).toBe("(x+1)*y");
  });

  it("strips LaTeX fractions", () => {
    expect(normalise("\\frac{3}{4}")).toBe("(3)/(4)");
  });

  it("strips LaTeX square roots", () => {
    // sqrt followed by ( triggers implicit multiplication rule: t( -> t*(
    expect(normalise("\\sqrt{16}")).toBe("sqrt*(16)");
  });

  it("strips \\cdot to *", () => {
    expect(normalise("2\\cdot3")).toBe("2*3");
  });

  it("strips \\times to *", () => {
    expect(normalise("2\\times3")).toBe("2*3");
  });

  it("strips \\div to /", () => {
    expect(normalise("6\\div2")).toBe("6/2");
  });

  it("converts \\pi to pi", () => {
    expect(normalise("2\\pi")).toBe("2*pi");
  });

  it("strips trailing punctuation", () => {
    expect(normalise("2x + 1?")).toBe("2*x + 1");
  });

  it("strips \\left and \\right", () => {
    expect(normalise("\\left(x+1\\right)")).toBe("(x+1)");
  });
});
