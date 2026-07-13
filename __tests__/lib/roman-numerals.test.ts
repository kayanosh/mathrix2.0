import {
  buildRomanNumerals,
  numberToRoman,
  parseRomanNumeralQuestion,
  parseRomanToNumberQuestion,
  romanToNumber,
} from "@/lib/methods/roman-numerals";
import { buildMethodForQuestion } from "@/lib/methods";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import { preferredBuilderId } from "@/lib/ks2-pedagogy/registry";
import type { TableBlock } from "@/types/whiteboard";

describe("Roman numeral method builder", () => {
  it("parses common KS2 question wording", () => {
    expect(parseRomanNumeralQuestion("How do we write 567 in Roman numerals?")).toBe(567);
    expect(parseRomanNumeralQuestion("How to write the number 347 in Roman numerals?")).toBe(347);
    expect(parseRomanNumeralQuestion("Convert 944 into Roman numerals")).toBe(944);
    expect(parseRomanNumeralQuestion("What is the Roman numeral for 1,000?")).toBe(1000);
  });

  it("converts values including subtractive notation", () => {
    expect(numberToRoman(567)).toBe("DLXVII");
    expect(numberToRoman(944)).toBe("CMXLIV");
    expect(numberToRoman(1000)).toBe("M");
    expect(romanToNumber("MCMXCIV")).toBe(1994);
    expect(parseRomanToNumberQuestion("Convert $MCMXCIV$ into a number.")).toEqual({
      numeral: "MCMXCIV",
      value: 1994,
    });
  });

  it("builds a visual, six-step child-friendly explanation", () => {
    const built = buildRomanNumerals(567);
    expect(built.answer).toBe("DLXVII");
    expect(built.teachingSteps).toHaveLength(6);
    expect(built.teachingSteps.every((step) => Boolean(step.why))).toBe(true);
    const table = built.block as TableBlock;
    expect(table.type).toBe("table");
    expect(table.rows).toEqual([
      ["Hundreds", "500", "D"],
      ["Tens", "60", "LX"],
      ["Ones", "7", "VII"],
    ]);
  });

  it("routes Roman numeral lessons before general place value", () => {
    const question = "How do we write 567 in Roman numerals?";
    expect(preferredBuilderId(question, "Place Value", ["Roman numerals to 1000"])).toBe(
      "roman_numerals",
    );
    expect(buildMethodForQuestion(question)?.builderId).toBe("roman_numerals");
  });

  it("repairs an incorrect AI answer and working", () => {
    const next = applyMethodBuilderToWorkedExample(
      {
        question: "How do we write 567 in Roman numerals?",
        steps: ["Place the digits in columns."],
        answer: "567",
        whiteboard: {
          intro: "Use place value.",
          blocks: [
            {
              type: "table",
              headers: ["Hundreds", "Tens", "Ones"],
              rows: [["5", "6", "7"]],
            },
          ],
          conclusion: "The answer is 567.",
        },
      },
      "Place Value",
      ["Roman numerals to 1000"],
    );

    expect(next.answer).toBe("DLXVII");
    expect(next.steps).toHaveLength(6);
    expect(next.whiteboard?.blocks[0]).toMatchObject({ type: "table" });
    expect(next.whiteboard?.conclusion).toContain("DLXVII");
  });
});
