import {
  buildFractionOps,
  parseFractionOp,
} from "@/lib/methods/fraction-ops";
import { deterministicMathsAnswer } from "@/lib/ks2-maths-accuracy";
import { satisfiesSkillVisuals } from "@/lib/ks2-skill-visuals";

describe("parseFractionOp with mixed numbers", () => {
  it("parses LaTeX mixed + mixed addition", () => {
    const p = parseFractionOp("$2\\frac{1}{2}+1\\frac{3}{4}$");
    expect(p).toEqual({
      kind: "mixed_binary",
      left: { whole: 2, frac: { n: 1, d: 2 } },
      right: { whole: 1, frac: { n: 3, d: 4 } },
      op: "add",
    });
  });

  it("parses plain-text mixed subtraction", () => {
    const p = parseFractionOp("Work out 2 1/2 - 1 3/4");
    expect(p).toMatchObject({
      kind: "mixed_binary",
      left: { whole: 2, frac: { n: 1, d: 2 } },
      right: { whole: 1, frac: { n: 3, d: 4 } },
      op: "subtract",
    });
  });

  it("parses mixed + plain fraction with whole = 0 on the plain side", () => {
    const p = parseFractionOp("2 1/2 + 3/4");
    expect(p).toMatchObject({
      kind: "mixed_binary",
      left: { whole: 2, frac: { n: 1, d: 2 } },
      right: { whole: 0, frac: { n: 3, d: 4 } },
    });
    const q = parseFractionOp("1/2 + 1 3/4");
    expect(q).toMatchObject({
      kind: "mixed_binary",
      left: { whole: 0, frac: { n: 1, d: 2 } },
      right: { whole: 1, frac: { n: 3, d: 4 } },
    });
  });

  it("does not hijack plain fraction × fraction", () => {
    expect(parseFractionOp("2/3 × 4/5")).toMatchObject({
      left: { n: 2, d: 3 },
      right: { n: 4, d: 5 },
      op: "multiply",
    });
  });

  it("does not hijack plain fraction + fraction", () => {
    const p = parseFractionOp("3/4 + 5/8");
    expect(p).toMatchObject({
      left: { n: 3, d: 4 },
      right: { n: 5, d: 8 },
      op: "add",
    });
    expect(p && "kind" in p ? p.kind : undefined).not.toBe("mixed_binary");
  });

  it("rejects mixed × mixed (not KS2)", () => {
    expect(parseFractionOp("2 1/2 × 1 3/4")).toBeNull();
  });
});

describe("buildFractionOps with mixed numbers", () => {
  it("computes 2 1/2 + 1 3/4 = 4 1/4 with correct working at every line", () => {
    const built = buildFractionOps({
      kind: "mixed_binary",
      left: { whole: 2, frac: { n: 1, d: 2 } },
      right: { whole: 1, frac: { n: 3, d: 4 } },
      op: "add",
    });
    expect(built.answer).toBe("4 1/4");
    const latex = built.block.type === "equation_steps"
      ? built.block.steps.map((s) => `${s.latexBefore} -> ${s.latexAfter}`).join(" | ")
      : "";
    // Correct conversions — never the concatenated 21/2 the LLM produces
    expect(latex).toContain("\\frac{5}{2}");
    expect(latex).toContain("\\frac{7}{4}");
    expect(latex).not.toContain("\\frac{21}{2}");
    expect(latex).not.toContain("\\frac{13}{4}");
    expect(latex).toContain("\\frac{17}{4}");
    // Rename table ships as an extra block
    const types = [built.block.type, ...(built.extraBlocks || []).map((b) => b.type)];
    expect(types).toContain("equation_steps");
    expect(types).toContain("table");
    // Satisfies the fraction_ops visual contract
    expect(satisfiesSkillVisuals(types, "fraction_ops")).toBe(true);
    // Within the 3-6 micro-step rule
    expect(built.teachingSteps.length).toBeLessThanOrEqual(6);
    expect(built.teachingSteps.length).toBeGreaterThanOrEqual(3);
  });

  it("computes 2 1/2 − 1 3/4 = 3/4", () => {
    const built = buildFractionOps({
      kind: "mixed_binary",
      left: { whole: 2, frac: { n: 1, d: 2 } },
      right: { whole: 1, frac: { n: 3, d: 4 } },
      op: "subtract",
    });
    expect(built.answer).toBe("3/4");
  });

  it("computes 1 1/2 + 1 1/2 = 3 as a whole number", () => {
    const built = buildFractionOps({
      kind: "mixed_binary",
      left: { whole: 1, frac: { n: 1, d: 2 } },
      right: { whole: 1, frac: { n: 1, d: 2 } },
      op: "add",
    });
    expect(built.answer).toBe("3");
  });

  it("throws on subtraction that would go negative", () => {
    expect(() =>
      buildFractionOps({
        kind: "mixed_binary",
        left: { whole: 1, frac: { n: 1, d: 4 } },
        right: { whole: 2, frac: { n: 1, d: 2 } },
        op: "subtract",
      }),
    ).toThrow();
  });

  it("the deterministic solver now covers LaTeX mixed-number questions", () => {
    const solved = deterministicMathsAnswer("$2\\frac{1}{2}+1\\frac{3}{4}$");
    expect(solved).not.toBeNull();
    expect(solved?.answer).toBe("4 1/4");
  });
});

describe("teaching quality of the steps", () => {
  it("the conversion step shows the arithmetic for each mixed number", () => {
    const built = buildFractionOps({
      kind: "mixed_binary",
      left: { whole: 2, frac: { n: 1, d: 2 } },
      right: { whole: 1, frac: { n: 3, d: 4 } },
      op: "add",
    });
    const step = built.teachingSteps.find(
      (s) => s.title === "Convert to improper fractions",
    );
    expect(step).toBeDefined();
    // The rule AND the worked arithmetic, in the main explanation
    expect(step!.explanation).toContain("Multiply the whole number by the denominator");
    expect(step!.explanation).toContain("2 × 2 + 1 = 5");
    expect(step!.explanation).toContain("1 × 4 + 3 = 7");
    expect(step!.explanation).toContain("so 2 1/2 = 5/2");
    expect(step!.explanation).toContain("so 1 3/4 = 7/4");
  });

  it("the conversion step skips the arithmetic for plain-fraction operands", () => {
    const built = buildFractionOps({
      kind: "mixed_binary",
      left: { whole: 0, frac: { n: 1, d: 2 } },
      right: { whole: 1, frac: { n: 3, d: 4 } },
      op: "add",
    });
    const step = built.teachingSteps.find(
      (s) => s.title === "Convert to improper fractions",
    );
    expect(step!.explanation).toContain("1/2 is already a fraction");
    expect(step!.explanation).not.toContain("0 ×");
  });

  it("the common-denominator step says what happens to the numerator", () => {
    const built = buildFractionOps({
      left: { n: 7, d: 3 },
      right: { n: 5, d: 4 },
      op: "add",
    });
    const step = built.teachingSteps.find(
      (s) => s.title === "Find a common denominator",
    );
    expect(step).toBeDefined();
    expect(step!.explanation).toContain("numerator and denominator");
    expect(step!.explanation).toContain("7 × 4 = 28");
    expect(step!.explanation).toContain("5 × 3 = 15");
    expect(step!.explanation).toContain("so 7/3 = 28/12");
    expect(step!.explanation).toContain("so 5/4 = 15/12");
    expect(step!.why).toContain("also do to the numerator");
  });

  it("the common-denominator step leaves already-matching fractions alone", () => {
    const built = buildFractionOps({
      left: { n: 1, d: 2 },
      right: { n: 1, d: 4 },
      op: "add",
    });
    const step = built.teachingSteps.find(
      (s) => s.title === "Find a common denominator",
    );
    expect(step!.explanation).toContain("1 × 2 = 2");
    expect(step!.explanation).toContain(
      "1/4 already has denominator 4, so it stays 1/4.",
    );
  });
});
