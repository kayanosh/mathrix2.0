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

describe("scale drawing lessons are not mixed-skill", () => {
  it("scale-factor skill + shape question is allowed", () => {
    // ratio skill family with geometry question family must not 422
    const skillFam = detectSkillVisualFamily("", "Properties of Shape", "Scale factors and scale drawings");
    const qFam = detectSkillVisualFamily("A rectangle is 4 cm long and 2 cm wide. Draw it using a scale factor of 3.");
    expect(skillFam).toBe("ratio");
    expect(qFam).toBe("geometry");
  });
});
