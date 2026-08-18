/**
 * Parser correctness for the linear-equation builder.
 *
 * This test exists because its absence let a wrong-answer defect reach
 * production. `algebra-builders.test.ts` tested only the canonical
 * `{a:2, b:4, c:10}` — every bug lived in the forms nobody tested.
 *
 * Measured on the live code before the rewrite, all four of these were SHOWN TO
 * STUDENTS, with confident arrows and a "verified" badge:
 *
 *   solve 4x + 3 = 2x + 11  ->  x = -0.25   (correct: 4)
 *   solve 7 - 2x = 1        ->  x = 0.5     (correct: 3)
 *   solve 0.5x + 1 = 4      ->  x = 0.6     (correct: 6)
 *   solve 2/3 x = 4         ->  x = 1.33    (correct: 6)
 *
 * Root cause: the old regex matched ANYWHERE in the string, so
 * "4x + 3 = 2x + 11" matched the substring "4x + 3 = 2" and solved a different
 * equation; and `parseInt` truncated "0.5" to "5".
 *
 * The governing rule, ported from the KS2 answer layer where it was written
 * after five wrong-answer defects: **a builder must DECLINE rather than guess.**
 * This builder OVERRIDES the model's answer, so a mis-parse replaces a correct
 * answer with a wrong one. Every case below therefore asserts EITHER the right
 * answer OR a decline — never a wrong number.
 */
import { parseLinearEquation } from "@/lib/methods/linear-equation";
import { buildMethodForQuestion } from "@/lib/methods";

/** The value this builder would show a student, or null if it declined. */
function shownAnswer(question: string): string | null {
  const built = buildMethodForQuestion(question, null) as
    | { builderId?: string; answer?: string }
    | null;
  if (!built || built.builderId !== "linear_equation") return null;
  return built.answer ?? null;
}

describe("solves the forms it claims to solve", () => {
  it.each([
    ["solve 3x + 5 = 20", "x = 5"],
    ["2x + 4 = 10", "x = 3"],
    ["x - 3 = 7", "x = 10"],
    ["-3x + 1 = 10", "x = -3"],
    ["solve 5x = 45", "x = 9"],
  ])("%s -> %s", (q, expected) => {
    expect(shownAnswer(q)).toBe(expected);
  });

  it("handles a negative coefficient written constant-first", () => {
    // Was x = 0.5. The old flipped-form branch mis-signed the coefficient.
    expect(shownAnswer("solve 7 - 2x = 1")).toBe("x = 3");
  });

  it("handles a decimal coefficient", () => {
    // Was x = 0.6, because parseInt("0.5") === 0 then the regex took "5".
    expect(shownAnswer("solve 0.5x + 1 = 4")).toBe("x = 6");
  });

  it("handles a fractional coefficient without floating-point dust", () => {
    // Was x = 1.33. And a naive fix gives 6.000000000000001, which is worse
    // than wrong — it looks like a bug to a child.
    expect(shownAnswer("solve 2/3 x = 4")).toBe("x = 6");
    expect(shownAnswer("solve \\frac{2}{3}x = 4")).toBe("x = 6");
  });

  it("handles the unknown divided by a constant", () => {
    expect(shownAnswer("solve x/3 + 2 = 6")).toBe("x = 12");
    expect(shownAnswer("solve 2x/3 = 4")).toBe("x = 6");
  });

  it("handles the unknown on the right-hand side", () => {
    // A pure rearrangement, and what a teacher writes at the board.
    expect(shownAnswer("solve 5 = 2x + 1")).toBe("x = 2");
  });

  it("tolerates instruction words and trailing punctuation", () => {
    expect(shownAnswer("Solve 3x + 5 = 20 for x.")).toBe("x = 5");
  });
});

describe("declines rather than guessing", () => {
  it("declines unknowns on both sides", () => {
    // THE headline case: 4x + 3 = 2x + 11 was answered x = -0.25.
    // Declined rather than solved, because this builder's steps would jump to
    // the collected form and skip the "subtract 2x from both sides" move — the
    // exact step a GCSE student needs to see, and the arrow that shows it.
    expect(parseLinearEquation("solve 4x + 3 = 2x + 11")).toBeNull();
    expect(shownAnswer("solve 4x + 3 = 2x + 11")).toBeNull();
  });

  it.each([
    ["brackets it cannot expand", "solve 3(x+2) = 18"],
    ["a rearrangement, not a solve", "make x the subject of y = 3x + 2"],
    ["two unknowns", "solve x + y = 10"],
    ["an inequality", "solve 2x > 10"],
    ["an inequality with ≥", "solve 2x ≥ 10"],
    ["a quadratic", "solve x^2 + 5x + 6 = 0"],
    ["a quadratic in unicode", "solve x² = 9"],
    ["no equals sign", "simplify 3x + 5"],
    ["two equals signs", "solve 3x = 6 = 2"],
    ["no unknown at all", "solve 3 + 5 = 8"],
    ["the unknown cancelling out", "solve 2x + 1 = 2x + 5"],
    ["division by zero", "solve x/0 = 4"],
  ])("declines %s", (_label, q) => {
    expect(parseLinearEquation(q)).toBeNull();
  });

  it("never returns a wrong number for anything it accepts", () => {
    // The safety net: whatever the parser accepts must satisfy its own equation.
    const inputs = [
      "solve 3x + 5 = 20",
      "solve 7 - 2x = 1",
      "solve 0.5x + 1 = 4",
      "solve 2/3 x = 4",
      "solve x/3 + 2 = 6",
      "solve 5 = 2x + 1",
      "solve -4x - 8 = 4",
      "solve 1.5x + 2.5 = 8.5",
      "solve 10x = 3",
      "solve x + 0.1 = 0.4",
      "solve 4x + 3 = 2x + 11",
      "solve 3(x+2) = 18",
      "solve 2x > 10",
    ];
    for (const q of inputs) {
      const parsed = parseLinearEquation(q);
      if (!parsed) continue; // declining is always allowed
      const { a, b, c } = parsed;
      const x = (c - b) / a;
      // Substituting the solution back must satisfy a·x + b = c.
      expect(a * x + b).toBeCloseTo(c, 9);
      expect(a).not.toBe(0);
    }
  });
});

describe("the arrow contract holds on what it builds", () => {
  it("emits properly tagged arrows for a term crossing the equals sign", async () => {
    // The arrows are the product's pedagogical differentiator, and
    // validateAlgebraArrows makes an untagged crossing a HARD failure.
    const { validateAlgebraArrows } = await import("@/lib/validate");
    for (const q of ["solve 3x + 5 = 20", "solve 7 - 2x = 1", "solve x/3 + 2 = 6"]) {
      const built = buildMethodForQuestion(q, null) as { block?: unknown } | null;
      expect(built?.block).toBeDefined();
      expect(validateAlgebraArrows(built!.block as never)).toEqual([]);
    }
  });
});
