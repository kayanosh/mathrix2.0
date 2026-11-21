import { casSolve } from "@/lib/cas-solver";

/**
 * casSolve() produces the "ground truth" the model is told it must match and
 * that earns an answer its verified badge. It had no tests at all, and was
 * wrong on the most ordinary questions: "Calculate 6 × 7" → 6, and
 * "Solve 3x + 5 = 20" → "Solve = 5/x", both marked verified.
 *
 * Two properties matter, and both are pinned here:
 *   1. when it answers, the answer is right;
 *   2. when it cannot read the question in full, it says nothing.
 */
const answers = (question: string) => casSolve(question)?.answers ?? null;

describe("casSolve — right when it answers", () => {
  it.each([
    ["Calculate 6 × 7", ["42"]],
    ["What is 144 ÷ 12?", ["12"]],
    ["Calculate 12 x 15", ["180"]],
    ["What is 3 + 4 × 2?", ["11"]],
    ["Work out 3 + 4 × 2.", ["11"]],
    ["Calculate 62,403 - 27,568", ["34835"]],
    ["Calculate 1,234,567 + 2,345,678", ["3580245"]],
    ["Work out 25 + 37 + 48", ["110"]],
    ["Work out 3(4 + 5)", ["27"]],
    ["-5 + 8", ["3"]],
    ["6 × 7 = ?", ["42"]],
    ["Calculate 3/4 + 1/2", ["5/4"]],
    ["Calculate 1/2 + 1/3 + 1/6", ["1"]],
    ["What is 0.1 + 0.2?", ["3/10"]],
    ["Evaluate 2^5", ["32"]],
    ["Calculate sqrt(16) + 2", ["6"]],
    // Each of these once produced a confident wrong answer somewhere in the
    // pipeline: 376, 25, 0.5 (or 3/4), 2, 2.
    ["62 403 - 27 568", ["34835"]],
    ["What is 25% of 80?", ["20"]],
    ["What is 2 1/4 × 3?", ["27/4"]],
    ["What is 2/3 of 3/4?", ["1/2"]],
    ["Calculate 3 - 1/4", ["11/4"]],
    ["What is 3/4 of 20?", ["15"]],
  ])("arithmetic: %s", (question, expected) => {
    const result = casSolve(question);
    expect(result?.answers).toEqual(expected);
    expect(result?.verified).toBe(true);
  });

  it.each([
    ["Solve 3x + 5 = 20", ["x = 5"]],
    ["Solve the equation 2x + 4 = 10", ["x = 3"]],
    ["Find x when 5x - 3 = 2x + 9", ["x = 4"]],
    ["Solve 3(x - 2) = 2x + 1", ["x = 7"]],
    ["Solve x/3 + 2 = 5", ["x = 9"]],
    ["Solve 2x = 7", ["x = 7/2"]],
    ["Solve x² − 5x − 6 = 0", ["x = -1", "x = 6"]],
    ["Solve x^2 = 16", ["x = -4", "x = 4"]],
    ["Solve x^2 - 6x + 9 = 0", ["x = 3"]],
    ["Solve -x^2 + 5x - 6 = 0", ["x = 2", "x = 3"]],
  ])("equation: %s", (question, expected) => {
    const result = casSolve(question);
    expect([...(result?.answers ?? [])].sort()).toEqual([...expected].sort());
    expect(result?.verified).toBe(true);
  });

  it("solves simultaneous equations and checks the pair in both", () => {
    const result = casSolve("Solve the simultaneous equations 2x + y = 7 and x - y = 2");
    expect(result?.answers).toEqual(["x = 3", "y = 1"]);
    expect(result?.verified).toBe(true);
  });

  it.each([
    ["Expand (x + 2)(x - 3)", "-6-x+x^2"],
    ["Expand and simplify 3(x + 2) + 2(x - 1)", "4+5*x"],
    ["Simplify 3x + 2x - x", "4*x"],
    ["Simplify 3xy + 2xy", "5*x*y"],
    ["Simplify fully 12/18", "2/3"],
    ["Factorise x^2 + 5x + 6", "(x + 2)(x + 3)"],
    ["Factorise x^2 - 9", "(x - 3)(x + 3)"],
    ["Differentiate x^3 + 2x", "2+3*x^2"],
  ])("algebra: %s", (question, expected) => {
    const result = casSolve(question);
    expect(result?.answers).toEqual([expected]);
    expect(result?.verified).toBe(true);
  });
});

describe("casSolve — silent when it cannot be sure", () => {
  it.each([
    "What is 10% of 50 + 5?",
    "What is 15 + 27 then - 9?",
    "Convert 1/4 kg to g",
    "What is the value of x if 2x = 10?",
    "A rectangle has length 5 and width 3. What is the area?",
    "The total cost is 3 pens at £2 each = ?",
    "y = 2x + 3. Find y when x = 4",
    "Calculate the mean of 3, 5, 7",
    "What is the probability of rolling a 6?",
    "Solve 2x + 3 = 2x + 5",
    "Calculate 9^9^9",
  ])("no ground truth for: %s", (question) => {
    expect(answers(question)).toBeNull();
  });

  it("offers no complex roots as an answer", () => {
    expect(answers("Solve x^2 + 1 = 0")).toBeNull();
    expect(answers("Factorise x^2 + 1")).toBeNull();
  });

  it("does not vouch for a factorisation it could not confirm", () => {
    // The rebuild-from-roots trick cannot express these; what matters is that
    // the result is NOT marked verified, so it is never used as ground truth.
    for (const question of ["Factorise 2x^2 + 7x + 3", "Factorise x^2 + 6x + 9"]) {
      expect(casSolve(question)?.verified ?? false).toBe(false);
    }
  });
});
