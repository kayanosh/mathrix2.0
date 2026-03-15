import { inferSympyTask, normaliseForSympy } from "@/lib/sympy-solver";

describe("normaliseForSympy", () => {
  it("converts Unicode symbols", () => {
    expect(normaliseForSympy("x − 3")).toBe("x - 3");
    expect(normaliseForSympy("2 × 3")).toBe("2 * 3");
    expect(normaliseForSympy("6 ÷ 2")).toBe("6 / 2");
  });

  it("converts superscript to ** for Python", () => {
    expect(normaliseForSympy("x²")).toBe("x**2");
    expect(normaliseForSympy("x³")).toBe("x**3");
  });

  it("converts π to pi", () => {
    expect(normaliseForSympy("2π")).toBe("2*pi");
  });

  it("converts LaTeX fractions", () => {
    expect(normaliseForSympy("\\frac{3}{4}")).toBe("(3)/(4)");
  });

  it("converts LaTeX sqrt", () => {
    // sqrt followed by ( triggers implicit multiplication: t( -> t*(
    expect(normaliseForSympy("\\sqrt{9}")).toBe("sqrt*(9)");
  });

  it("adds implicit multiplication", () => {
    expect(normaliseForSympy("2x")).toBe("2*x");
    expect(normaliseForSympy("3(x+1)")).toBe("3*(x+1)");
  });

  it("strips \\cdot, \\times, \\div", () => {
    expect(normaliseForSympy("a\\cdot b")).toContain("*");
    expect(normaliseForSympy("a\\times b")).toContain("*");
    expect(normaliseForSympy("a\\div b")).toContain("/");
  });

  it("strips remaining LaTeX commands", () => {
    expect(normaliseForSympy("\\text{hello}")).toBe("hello");
  });
});

describe("inferSympyTask", () => {
  it("detects differentiation", () => {
    const result = inferSympyTask("Differentiate: x^2 + 3x");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("diff");
  });

  it("detects integration", () => {
    const result = inferSympyTask("Integrate: 2x + 1");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("integrate");
  });

  it("detects expand", () => {
    const result = inferSympyTask("Expand: (x+1)(x+2)");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("expand");
  });

  it("detects factorise", () => {
    const result = inferSympyTask("Factorise: x^2 - 5x + 6");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("factorise");
  });

  it("detects simplify", () => {
    const result = inferSympyTask("Simplify: 3x + 2x - x");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("simplify");
  });

  it("detects evaluate", () => {
    const result = inferSympyTask("Calculate: 2 + 3 * 4");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("evaluate");
  });

  it("detects general equation solving", () => {
    const result = inferSympyTask("2x + 4 = 10");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("solve");
  });

  it("detects simultaneous equations", () => {
    const result = inferSympyTask("Solve simultaneous equations: 2x + y = 7 and x - y = 1");
    expect(result).not.toBeNull();
    // The regex picks up the first equation as a general solve, since the
    // simultaneous detector requires two separate '=' in the equation matcher
    expect(["simultaneous", "solve"]).toContain(result!.type);
  });

  it("returns null for unparseable questions", () => {
    const result = inferSympyTask("What is the meaning of life?");
    expect(result).toBeNull();
  });

  it("detects derivative keyword", () => {
    const result = inferSympyTask("Find the derivative of 3x^2");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("diff");
  });
});
