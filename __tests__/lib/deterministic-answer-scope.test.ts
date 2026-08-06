/**
 * DEF-026 regression.
 *
 * Two halves, and BOTH are load-bearing:
 *
 * 1. The column/division builders put their result on `block.answer`, not on
 *    the top-level `answer`. deterministicMathsAnswer() only read the latter, so
 *    it returned null for ALL column arithmetic — meaning
 *    hardenKS2MathsPracticeAnswers() silently verified nothing there. That is
 *    why DEF-008's wrong PRACTICE answers ("47,586 + 28,749 = 614") were still
 *    being served long after its parser was fixed and its worked examples had
 *    self-healed: only the worked-example path was ever repaired.
 *
 * 2. Enabling that fallback also enables OVERWRITING, and this surface had
 *    already produced five wrong-answer defects (DEF-008/020/023/024/025) from
 *    builders answering a question they weren't asked. Every decline rule below
 *    was derived from a real cached question that would otherwise have been
 *    corrupted — measured, not guessed.
 */
import {
  deterministicMathsAnswer,
  reasonToDeclineNumericAnswer,
} from "@/lib/ks2-maths-accuracy";

describe("deterministicMathsAnswer — column-arithmetic fallback (DEF-026)", () => {
  it("reads the answer off a column_method block", () => {
    // Previously all null, so nothing verified these.
    for (const [q, expected] of [
      ["24 \\times 13", "312"],
      ["456 \\times 7", "3192"],
      ["2,347 \\times 6", "14082"],
      ["47,586 + 28,749", "76335"],
      ["62,403 - 27,856", "34547"],
      ["4,786 + 2,659", "7445"],
      ["3,696 \\div 4", "924"],
    ] as [string, string][]) {
      expect(deterministicMathsAnswer(q)?.answer).toBe(expected);
    }
  });

  it("catches the specific DEF-008 residuals that survived in practice items", () => {
    // These exact wrong answers were live in the cache and served to pupils.
    expect(deterministicMathsAnswer("47,586 + 28,749")?.answer).not.toBe("614");
    expect(deterministicMathsAnswer("47,586 + 28,749")?.answer).toBe("76335");
    expect(deterministicMathsAnswer("62,403 - 27,856")?.answer).toBe("34547");
    expect(deterministicMathsAnswer("2,347 \\times 6")?.answer).toBe("14082");
  });
});

describe("reasonToDeclineNumericAnswer — refuses questions it wasn't asked (DEF-026)", () => {
  const declines: [string, string][] = [
    ["In 268 + 157, what digit is carried from the ones column?", "sub-step"],
    ["In 28 \\times 16, what does the 1 represent?", "digit/place value"],
    ["In 1,786 \\times 4, what is the first calculation in the ones column?", "sub-step"],
    ["In 156 \\div 3, why is the carried 1 read with the 5 as 15?", "sub-step"],
    ["When calculating 326 \\times 54, why does the partial product start with zero?", "sub-step"],
    ["Use 46 + 23 = 69 to work out 460 + 230.", "derived-fact"],
    ["Complete: \\frac{4}{7} = \\frac{\\Box}{14}.", "fill-in-the-blank"],
    ["What is the HCF of 18 and 24, and what is \\frac{18}{24} simplified?", "multi-part"],
    ["Is 39 \\div 5 = 7\\text{ r }4 correct?", "verification"],
    ["Check 324 + 158 = 482 using subtraction.", "verification"],
    ["Which calculation checks 129 + 364 = 493: 493 - 364 or 493 + 364?", "verification"],
    ["Estimate 451 + 372 by rounding to the nearest hundred.", "estimation"],
    ["Use rounding to check whether 641 + 183 = 724 is sensible.", "verification/estimation"],
    ["The rule is \\times 2 + 5. Find the output values for inputs 1, 2 and 3.", "rule/sequence"],
  ];

  it.each(declines)("declines: %s", (question) => {
    expect(reasonToDeclineNumericAnswer(question, "column_addition")).not.toBeNull();
    expect(deterministicMathsAnswer(question)).toBeNull();
  });

  it("declines decimals routed to an integer-only builder", () => {
    // long_division answered "8.4 ÷ 4" as 1 (correct: 2.1) and
    // "15.6 ÷ 1,000" as 6 (correct: 0.0156).
    for (const q of ["8.4 \\div 4", "3.6 \\div 3", "15.6 \\div 1{,}000", "9.6 \\div 4"]) {
      expect(deterministicMathsAnswer(q)).toBeNull();
    }
  });

  it("declines fractions in BOTH LaTeX and normalised form", () => {
    // normalizeMathText rewrites "\frac{8}{12}" to "8/12", so a guard that only
    // looked for the LaTeX macro missed every normalised fraction and let
    // long_division answer "What is \frac{8}{12} simplified?" with "0 r 8".
    for (const q of [
      "What is the simplified form of \\frac{8}{12}?",
      "What is \\frac{14}{28} simplified?",
      "Which is larger: \\frac{2}{3} or \\frac{3}{5}?",
      "Is \\frac{3}{6} equivalent to \\frac{1}{2}?",
      "Which is equivalent to 0.25: \\frac{1}{2}, \\frac{1}{4} or \\frac{3}{4}?",
    ]) {
      expect(deterministicMathsAnswer(q)).toBeNull();
    }
    expect(reasonToDeclineNumericAnswer("What is 8/12 simplified?", "long_division")).toMatch(
      /fraction/i,
    );
  });

  it("does not decline a plain computation", () => {
    for (const q of ["24 \\times 13", "47,586 + 28,749", "3,696 \\div 4", "2,347 \\times 6"]) {
      expect(reasonToDeclineNumericAnswer(q, "column_addition")).toBeNull();
    }
  });
});
