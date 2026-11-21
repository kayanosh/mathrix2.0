import { buildMethodForQuestion } from "@/lib/methods";
import { builderRejection } from "@/lib/methods/builder-guard";
import { evaluateExact, parseMathsQuestion } from "@/lib/maths-question";
import { casSolve } from "@/lib/cas-solver";
import { mathsValuesEquivalent } from "@/lib/maths-value";

/**
 * A builder's working REPLACES the model's, so a builder that half-reads a
 * question shows a pupil a different, easier sum solved correctly. Every case
 * in the first table did exactly that before the guard existed; the wrong
 * answer it used to show is noted beside each.
 *
 * The rule under test: for any question, a builder is either right or absent.
 */
const shown = (question: string): string | null => {
  const built = buildMethodForQuestion(question);
  if (!built) return null;
  return String(built.answer || (built.block as { answer?: string }).answer || built.conclusion || "");
};

describe("builder guard — a half-read question gets no builder", () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it.each([
    ["62 403 - 27 568", "376"],
    ["1,234,567 + 2,345,678", "469,134"],
    ["25 + 37 + 48", "62"],
    ["Work out 3 + 4 × 2.", "8"],
    ["3(4 + 5)", "9"],
    ["2 1/4 × 3", "3/4"],
    ["3 - 1/4", "2"],
    ["What is 2/3 of 3/4?", "2"],
    ["1/2 + 1/3 + 1/6", "5/6"],
    ["-5 + 8", "difference 13"],
    ["Find the area of a rectangle 3.5 m by 2 m", "10"],
    ["Find the volume of a cuboid 2.5 cm by 4 cm by 6 cm", "120"],
    ["Find the highest common factor of 24 and 36", "the factors of 24"],
    ["What is 15 + 27 then - 9?", "45"],
    ["Solve -x^2 + 5x - 6 = 0", "the roots of x² + 5x − 6"],
    ["Write 0.75 as a percentage", "a place-value chart of 75"],
    ["Write 2 3/4 as a decimal", "11/4"],
    ["A quadrilateral has angles 90°, 80° and 110°. Find the missing angle.", "−100°"],
  ])("%s  (used to show %s)", (question) => {
    expect(shown(question)).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("still uses a builder that read the question properly", () => {
    warn.mockRestore();
    const quiet = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(shown("62,403 - 27,568")).toBe("34835");
    expect(shown("456 + 278")).toBe("734");
    expect(shown("23 × 47")).toBe("1081");
    expect(shown("384 ÷ 12")).toBe("32");
    expect(shown("17 ÷ 5")).toBe("3 r 2"); // a remainder is a right answer, not 17/5
    expect(shown("$2\\frac{1}{2}+1\\frac{3}{4}$")).toBe("4 1/4");
    expect(quiet).not.toHaveBeenCalled();
    quiet.mockRestore();
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("converts a fraction or mixed number of a unit, and nothing else answers a conversion", () => {
    // Was 4000 g: the amount regex matched only the "4" of "1/4".
    expect(shown("Convert 1/4 kg to g")).toMatch(/\b250 ?g\b/);
    expect(shown("Convert 2 1/2 m to cm")).toMatch(/\b250 ?cm\b/);
    expect(shown("Convert 3.5 km to m")).toMatch(/\b3500 ?m\b/);
    expect(shown("Convert 3 l to millilitres")).toMatch(/\b3000 ?ml\b/);
    // A third of a kilogram has no tidy decimal; better no board than 333.333333333 g.
    expect(shown("Convert 1/3 kg to g")).toBeNull();
    // Time is not something the unit builder does, so no other builder may guess.
    expect(shown("Convert 3 hours to minutes")).toBeNull();
  });

  it("does not hold a label against a builder", () => {
    const built = buildMethodForQuestion("Which coordinate is in Quadrant 4: (-2,5) or (2,-5)?");
    expect(built?.builderId).toBe("coordinate_plot");
  });

  it("explains each rejection", () => {
    const fake = (answer: string) =>
      ({
        builderId: "column_addition",
        block: { type: "column_method", question: "25 + 37", answer },
        teachingSteps: [],
        captions: [],
      }) as unknown as Parameters<typeof builderRejection>[1];
    expect(builderRejection("25 + 37 + 48", fake("62"))).toMatch(/works out to 110/);
    expect(builderRejection("Add 25 and 37 and 48 together", fake("62"))).toMatch(/never used 48/);
    expect(builderRejection("25 + 37", fake("62"))).toBeNull();
  });
});

describe("evaluateExact", () => {
  const value = (expression: string) => {
    const result = evaluateExact(expression);
    return result ? (result.den === 1n ? `${result.num}` : `${result.num}/${result.den}`) : null;
  };

  it.each([
    ["3+4*2", "11"],
    ["3*(4+5)", "27"],
    ["62403-27568", "34835"],
    ["1/2+1/3+1/6", "1"],
    ["(2+1/4)*3", "27/4"],
    ["0.1+0.2", "3/10"],
    ["-5+8", "3"],
    ["2^5", "32"],
    ["-2^2", "-4"],
    ["2^-2", "1/4"],
    ["((25)/100)*(80)", "20"],
    ["10/4", "5/2"],
  ])("%s = %s", (expression, expected) => {
    expect(value(expression)).toBe(expected);
  });

  it("substitutes unknowns", () => {
    const x = { num: 3n, den: 1n };
    expect(evaluateExact("x^2-5*x+6", { x })).toEqual({ num: 0n, den: 1n });
  });

  it("returns null rather than guess", () => {
    for (const expression of ["1/0", "sqrt(2)", "2*pi", "x+1", "2^0.5", "3+", ""]) {
      expect(evaluateExact(expression)).toBeNull();
    }
  });

  it("agrees with the algebra engine on every exact arithmetic question", () => {
    // Two independent implementations of the same sums: one BigInt, one nerdamer.
    for (const question of [
      "Calculate 6 × 7", "What is 3 + 4 × 2?", "Calculate 62,403 - 27,568", "Work out 3(4 + 5)",
      "Calculate 3/4 + 1/2", "What is 2 1/4 × 3?", "What is 25% of 80?", "What is 2/3 of 3/4?",
      "Calculate 1/2 + 1/3 + 1/6", "What is 0.1 + 0.2?", "Evaluate 2^5", "-5 + 8", "Calculate 144 ÷ 12 - 5 × 2",
      "Calculate (7 - 10) × 4 / 6", "What is 12.5% of 64",
    ]) {
      const parsed = parseMathsQuestion(question);
      expect(parsed?.task).toBe("evaluate");
      const exact = value((parsed as { expression: string }).expression)!;
      const cas = casSolve(question)!.answers[0];
      expect(mathsValuesEquivalent(exact, cas)).toBe(true);
    }
  });
});
