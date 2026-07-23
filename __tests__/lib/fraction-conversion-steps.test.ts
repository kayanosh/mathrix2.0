import { buildFractionOps } from "@/lib/methods/fraction-ops";
import {
  applyMethodBuilderToWorkedExample,
  type WorkedExampleLike,
} from "@/lib/methods/apply-builder";
import { deterministicMathsAnswer } from "@/lib/ks2-maths-accuracy";

describe("buildToMixed shows full working", () => {
  const built = buildFractionOps({ kind: "to_mixed", improper: { n: 11, d: 4 } });

  it("answers 2 3/4 with three worked steps", () => {
    expect(built.answer).toBe("2 3/4");
    expect(built.teachingSteps.length).toBeGreaterThanOrEqual(3);
    expect(built.teachingSteps.length).toBeLessThanOrEqual(6);
  });

  it("shows the division with remainder", () => {
    const divide = built.teachingSteps.find(
      (s) => s.title === "Divide the numerator by the denominator",
    );
    expect(divide).toBeDefined();
    expect(divide!.explanation).toContain("11 ÷ 4 = 2 remainder 3");
  });

  it("shows the remainder keeping the same denominator", () => {
    const assemble = built.teachingSteps.find(
      (s) => s.title === "Write the mixed number",
    );
    expect(assemble).toBeDefined();
    expect(assemble!.explanation).toContain("stays over the same denominator");
    expect(assemble!.explanation).toContain("11/4 = 2 3/4");
  });

  it("includes an inverse check", () => {
    const check = built.teachingSteps.find((s) => s.title === "Check with the inverse");
    expect(check).toBeDefined();
    expect(check!.explanation).toContain("2 × 4 + 3 = 11");
  });

  it("every equation line has a visible expression", () => {
    if (built.block.type !== "equation_steps") throw new Error("expected equation_steps");
    for (const step of built.block.steps) {
      expect(step.latexBefore.length + step.latexAfter.length).toBeGreaterThan(0);
    }
  });

  it("handles exact divisions as whole numbers", () => {
    const exact = buildFractionOps({ kind: "to_mixed", improper: { n: 8, d: 4 } });
    expect(exact.answer).toBe("2");
    const titles = exact.teachingSteps.map((s) => s.title);
    expect(titles).toContain("Write the answer");
  });
});

describe("buildToImproper shows full working", () => {
  const built = buildFractionOps({
    kind: "to_improper",
    whole: 2,
    frac: { n: 3, d: 4 },
  });

  it("answers 11/4 with three worked steps", () => {
    expect(built.answer).toBe("11/4");
    expect(built.teachingSteps.length).toBeGreaterThanOrEqual(3);
    expect(built.teachingSteps.length).toBeLessThanOrEqual(6);
  });

  it("shows the multiply-then-add working", () => {
    const multiply = built.teachingSteps.find(
      (s) => s.title === "Multiply the whole by the denominator",
    );
    expect(multiply!.explanation).toContain("2 × 4 = 8");
    const add = built.teachingSteps.find((s) => s.title === "Add the numerator");
    expect(add!.explanation).toContain("8 + 3 = 11");
    expect(add!.explanation).toContain("denominator stays 4");
  });

  it("includes an inverse check", () => {
    const check = built.teachingSteps.find((s) => s.title === "Check with the inverse");
    expect(check).toBeDefined();
    expect(check!.explanation).toContain("11 ÷ 4 = 2 remainder 3");
  });
});

describe("the deterministic solver covers conversion questions", () => {
  it("solves 'Change 11/4 into a mixed number.'", () => {
    const solved = deterministicMathsAnswer("Change 11/4 into a mixed number.");
    expect(solved).not.toBeNull();
    expect(solved?.answer).toBe("2 3/4");
  });
});

describe("whiteboard intro punctuation", () => {
  it("never renders a double full stop", () => {
    const result = applyMethodBuilderToWorkedExample(
      {
        question: "Change 11/4 into a mixed number.",
        steps: [],
        answer: "",
      },
      "Fractions",
      ["Improper fractions to mixed numbers"],
    ) as WorkedExampleLike;
    expect(result.whiteboard?.intro).toBeDefined();
    expect(result.whiteboard?.intro).not.toContain("..");
    expect(result.whiteboard?.intro).toMatch(/^Let's work out .+\.$/);
  });
});
