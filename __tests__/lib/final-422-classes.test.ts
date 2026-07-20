import { detectSkillVisualFamily, satisfiesSkillVisuals } from "@/lib/ks2-skill-visuals";

describe("factor skills use the multiples family", () => {
  it("classifies common-factor questions as multiples, not multiplication", () => {
    expect(
      detectSkillVisualFamily("Find the common factors of 18 and 24.", "Multiplication and Division", "Common factors"),
    ).toBe("multiples");
  });

  it("a table satisfies the multiples contract", () => {
    expect(satisfiesSkillVisuals(["table"], "multiples")).toBe(true);
  });

  it("does not steal HCF-simplify lessons", () => {
    expect(
      detectSkillVisualFamily("", "Fractions", "Simplify fractions using the highest common factor"),
    ).toBe("fraction_simplify");
  });
});
