/**
 * DEF-025 regression. parseMultiplesQuestion() fired on ANY text containing the
 * word "multiple" and returned a generic list of ten multiples. Because the
 * harden path overwrites the stored answer with the builder's, pupils were
 * served (verified live, 21x):
 *
 *   "What is the next multiple of 6 after 30?"        -> "6, 12, 18, ... 60"
 *   "Which number is a multiple of 5: 18, 25 or 32?"  -> "5, 10, 15, ... 50"
 *   "Write the first FIVE multiples of 8."            -> ten of them
 *
 * Two independent causes: the count was only read as digits (so the word
 * "five" fell back to a default of ten, then got clamped into a 5..12 window),
 * and the branch had a bare `|| /multiples?/` fallback that claimed questions
 * it could not answer by listing.
 */
import { buildMethodForQuestion } from "@/lib/methods";
import { parseMultiplesQuestion } from "@/lib/methods/multiples-factors";

const answerFor = (q: string): string | null => {
  const built = buildMethodForQuestion(q);
  return /multiples/.test(built?.builderId ?? "") ? (built?.answer ?? null) : null;
};

describe("multiples builder answer scope (DEF-025)", () => {
  it("honours a count written as a word, and returns exactly that many", () => {
    expect(answerFor("Write the first five multiples of $8$.")).toBe("8, 16, 24, 32, 40");
    expect(answerFor("Write the first four multiples of $7$.")).toBe("7, 14, 21, 28");
    expect(answerFor("Write the first six multiples of $4$.")).toBe("4, 8, 12, 16, 20, 24");
    expect(answerFor("List the first three multiples of 9.")).toBe("9, 18, 27");
  });

  it("answers 'the next multiple of n after m' with the single value", () => {
    expect(answerFor("What is the next multiple of $6$ after $30$?")).toBe("36");
    expect(answerFor("What is the next multiple of 5 after 22?")).toBe("25");
    // Strictly after: 30 is a multiple of 6, but the next one is 36.
    expect(answerFor("What is the next multiple of 6 after 30?")).not.toBe("30");
  });

  it("declines questions it cannot answer by listing, rather than overwriting them", () => {
    for (const q of [
      "Which number is a multiple of $5$: $18$, $25$ or $32$?",
      "Is 27 a multiple of 4?",
      "Explain why 30 is a multiple of both 5 and 6.",
      "How do you know 45 is a multiple of 9?",
    ]) {
      expect(answerFor(q)).toBeNull();
    }
  });

  it("never answers a single-value question with a ten-item list", () => {
    // The exact live symptom.
    const answer = answerFor("What is the next multiple of $6$ after $30$?");
    expect(answer).not.toMatch(/,.*,.*,/);
  });

  it("still handles common multiples and factors", () => {
    expect(answerFor("Find the lowest common multiple of 4 and 6.")).toBe("12");
    expect(parseMultiplesQuestion("What are the factors of 24?")).toEqual({
      kind: "factors",
      n: 24,
    });
  });
});
