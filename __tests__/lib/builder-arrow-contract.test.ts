/**
 * The house's own builders must obey the arrow rule they impose on the model.
 *
 * `validateAlgebraArrows` makes a term crossing "=" without a declared arrow a
 * HARD failure — the arrows are the product's pedagogical differentiator. But
 * builders ran AFTER validation, so their output was never checked, and the
 * quadratic builder's own board failed the rule.
 *
 * The cause was a false positive, not a missing arrow. Step 3 of a quadratic is
 * the null factor law:
 *
 *   (x + 2)(x + 3) = 0   ->   x + 2 = 0  or  x + 3 = 0
 *
 * Nothing crosses the "=" there — one equation becomes two — but splitOnEquals
 * only splits on the FIRST "=", so the second equation's constants landed in
 * "after RHS" and looked like they had moved. An arrow there would actively
 * mislead. Note "x^2 - 9 = 0" escaped by luck: both its factor constants are 3,
 * so the magnitudes matched on both sides.
 */
import { buildMethodForQuestion } from "@/lib/methods";
import { validateAlgebraArrows } from "@/lib/validate";
import { containsAlgebraicUnknown } from "@/lib/methods/normalize-math-text";
import type { EquationStepBlock } from "@/types/whiteboard";

function arrowErrors(question: string): string[] | null {
  const built = buildMethodForQuestion(question, null) as
    | { block?: { type?: string } }
    | null;
  if (built?.block?.type !== "equation_steps") return null;
  return validateAlgebraArrows(built.block as EquationStepBlock);
}

describe("every builder passes the arrow contract it is held to", () => {
  it.each([
    "Solve x^2 + 5x + 6 = 0",
    "Solve x^2 - 9 = 0",
    "solve x^2 + 2x - 8 = 0",
    "solve x^2 - 5x - 6 = 0",
    "solve x^2 + 4x + 4 = 0",
    "solve 3x + 5 = 20",
    "solve 7 - 2x = 1",
    "solve x/3 + 2 = 6",
    "solve 5 = 2x + 1",
  ])("%s", (q) => {
    const errs = arrowErrors(q);
    if (errs === null) return; // no equation_steps board — nothing to check
    expect(errs).toEqual([]);
  });

  it("does not demand an arrow on a null-factor-law split", () => {
    // The specific false positive. An arrow here would show a transfer that
    // does not happen.
    const errs = arrowErrors("Solve x^2 + 5x + 6 = 0");
    expect(errs).toEqual([]);
  });

  it("still demands an arrow when a term visibly crosses", () => {
    // The guard must not blunt the rule: a real crossing with no arrow fails.
    // The detector matches a constant MAGNITUDE that has moved sides, so the
    // crossing has to still be visible — "3x + 5 = 20" -> "3x = 20 - 5".
    const block = {
      type: "equation_steps",
      steps: [
        { stepNumber: 1, latexBefore: "3x + 5 = 20", latexAfter: "3x = 20 - 5", explanation: "" },
      ],
    } as unknown as EquationStepBlock;
    expect(validateAlgebraArrows(block).length).toBeGreaterThan(0);
  });

  it("KNOWN LIMIT: an evaluated-away constant is not detected", () => {
    // "3x + 5 = 20" -> "3x = 15" has the 5 subtracted rather than shown moving,
    // so the magnitude never appears on the right and the heuristic misses it.
    // Documented rather than asserted as correct: this is a pre-existing gap in
    // a numeric-magnitude heuristic, and the prompt asks the model to show the
    // move explicitly. Recorded so a future tightening has a home.
    const block = {
      type: "equation_steps",
      steps: [
        { stepNumber: 1, latexBefore: "3x + 5 = 20", latexAfter: "3x = 15", explanation: "" },
      ],
    } as unknown as EquationStepBlock;
    expect(validateAlgebraArrows(block)).toEqual([]);
  });
});

/**
 * A column-arithmetic board for an algebra question.
 *
 * parseAdditionOperands matched digits either side of a "+" ANYWHERE in the
 * text, so "solve 2x^2 + 7x + 3 = 0" yielded 2 + 7 and drew a COLUMN ADDITION
 * board for a quadratic — the same substring-match class as the linear-parser
 * defect, and the "builder answers a question it wasn't asked" class that caused
 * five earlier wrong-answer defects.
 */
describe("column builders decline algebra", () => {
  it.each([
    "solve 2x^2 + 7x + 3 = 0",
    "expand 2x^2 + 7x",
    "simplify 3x + 5x",
  ])("gives no column board for: %s", (q) => {
    const built = buildMethodForQuestion(q, null) as { block?: { type?: string } } | null;
    expect(built?.block?.type).not.toBe("column_method");
  });

  it("still builds column arithmetic for plain sums", () => {
    // The guard is narrow on purpose — a false positive silently removes a
    // correct column method from a KS2 lesson.
    for (const [q, expected] of [
      ["47,586 + 28,749", "76335"],
      ["62,403 - 27,856", "34547"],
      ["a total of 24 + 13", "37"],
    ] as [string, string][]) {
      const built = buildMethodForQuestion(q, null) as
        | { block?: { type?: string; answer?: string } }
        | null;
      expect(built?.block?.type).toBe("column_method");
      expect(built?.block?.answer).toBe(expected);
    }
  });
});

describe("containsAlgebraicUnknown", () => {
  it.each(["2x^2 + 7x", "solve 5x + 3 = 18", "what is 2^3", "3y - 1"])(
    "detects algebra in: %s",
    (t) => expect(containsAlgebraicUnknown(t)).toBe(true),
  );

  it.each([
    "47,586 + 28,749",
    "a total of 24 + 13",
    "5 m + 3 m",
    "Sam has 24 apples and 13 oranges",
    "What is 2,347 x 6?",
  ])("does not misread arithmetic as algebra: %s", (t) =>
    expect(containsAlgebraicUnknown(t)).toBe(false),
  );
});
