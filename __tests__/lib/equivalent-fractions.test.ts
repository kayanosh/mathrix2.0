import {
  buildEquivalentFraction,
  parseEquivalentFraction,
} from "@/lib/methods/fraction-equivalent";
import { parseFdpEquivalence } from "@/lib/methods/fdp-equivalence";
import { buildMethodForQuestion } from "@/lib/methods";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import {
  detectSkillVisualFamily,
  satisfiesSkillVisuals,
} from "@/lib/ks2-skill-visuals";

const screenshotQuestion =
  "Find an equivalent fraction to 1/2 with a denominator of 4.";

describe("deterministic equivalent-fraction teaching", () => {
  it("parses the Year 5 denominator target without routing to FDP", () => {
    expect(parseEquivalentFraction(screenshotQuestion)).toEqual({
      sourceNumerator: 1,
      sourceDenominator: 2,
      targetNumerator: 2,
      targetDenominator: 4,
      givenPart: "denominator",
      factor: 2,
      operation: "multiply",
    });
    expect(parseFdpEquivalence(screenshotQuestion)).toBeNull();
    expect(buildMethodForQuestion(screenshotQuestion)?.builderId).toBe(
      "fraction_equivalent",
    );
    expect(
      buildMethodForQuestion("Complete: \\frac{1}{2} = ?/4")?.answer,
    ).toBe("2/4");
    expect(
      buildMethodForQuestion(
        "Complete $\\frac{3}{4} = \\frac{\\square}{12}$.",
      )?.answer,
    ).toBe("9/12");
    expect(
      buildMethodForQuestion(
        "Which fraction is equivalent to 1/2 and has denominator 4?",
      )?.answer,
    ).toBe("2/4");
  });

  it("builds two equal fraction bars and applies the same factor to both parts", () => {
    const parsed = parseEquivalentFraction(screenshotQuestion);
    if (!parsed) throw new Error("expected equivalent-fraction problem");
    const built = buildEquivalentFraction(parsed);

    expect(built.answer).toBe("2/4");
    expect([built.block, ...(built.extraBlocks || [])]).toMatchObject([
      {
        type: "fraction_bar",
        numerator: 1,
        denominator: 2,
        shaded: 1,
      },
      {
        type: "fraction_bar",
        numerator: 2,
        denominator: 4,
        shaded: 2,
      },
      { type: "equation_steps" },
    ]);
    expect(built.teachingSteps).toHaveLength(3);
    expect(built.teachingSteps[1]?.explanation).toContain(
      "1 × 2 = 2; 2 × 2 = 4",
    );
    expect(built.conclusion).toContain("1/2 = 2/4");
  });

  it("replaces the irrelevant cached FDP table, number line and percentage method", () => {
    const repaired = applyMethodBuilderToWorkedExample(
      {
        question: screenshotQuestion,
        steps: ["Fraction", "Decimal", "Percentage"],
        answer: "1/2 = 0.5 = 50%",
        whiteboard: {
          intro:
            "Let's show this value as a fraction, a decimal, and a percentage.",
          blocks: [
            {
              type: "table",
              headers: ["Fraction", "Decimal", "Percentage"],
              rows: [["1/2", "0.5", "50%"]],
            },
            {
              type: "number_line",
              range: [0, 1],
              tickInterval: 0.1,
              markers: [{ value: 0.5, label: "1/2", style: "filled" }],
            },
          ],
          conclusion: "1/2 = 0.5 = 50%",
        },
      },
      "Fractions",
      ["Equivalent fractions"],
    );

    expect(repaired.answer).toBe("2/4");
    expect(repaired.whiteboard?.blocks.map((block) => block.type)).toEqual([
      "fraction_bar",
      "fraction_bar",
      "equation_steps",
    ]);
    expect(repaired.whiteboard?.intro).not.toContain("decimal");
    expect(repaired.whiteboard?.conclusion).toContain("1/2 = 2/4");
    expect(repaired.teachingSteps).toHaveLength(3);
  });

  it("handles a requested numerator and a valid down-scaling question", () => {
    expect(
      buildMethodForQuestion(
        "Find an equivalent fraction to 3/5 with a numerator of 12.",
      )?.answer,
    ).toBe("12/20");
    const smaller = buildMethodForQuestion(
      "Find an equivalent fraction to 6/8 with a denominator of 4.",
    );
    expect(smaller?.answer).toBe("3/4");
    expect(smaller?.teachingSteps[1]?.explanation).toContain(
      "6 ÷ 2 = 3; 8 ÷ 2 = 4",
    );
  });

  it("keeps real fraction-decimal-percentage questions in the FDP builder", () => {
    expect(
      buildMethodForQuestion(
        "Write 1/2 as a decimal and a percentage.",
      )?.builderId,
    ).toBe("fdp_equivalence");
  });

  it("uses a strict equivalent-fraction visual contract", () => {
    expect(
      detectSkillVisualFamily(
        screenshotQuestion,
        "Fractions",
        "Equivalent fractions",
      ),
    ).toBe("fraction_equivalent");
    expect(
      detectSkillVisualFamily(
        "Complete $\\frac{3}{4} = \\frac{\\square}{12}$.",
      ),
    ).toBe("fraction_equivalent");
    expect(
      satisfiesSkillVisuals(
        ["fraction_bar", "equation_steps"],
        "fraction_equivalent",
      ),
    ).toBe(true);
    expect(
      satisfiesSkillVisuals(
        ["table", "number_line", "equation_steps"],
        "fraction_equivalent",
      ),
    ).toBe(false);
  });
});
