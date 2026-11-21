import { parseMathsQuestion } from "@/lib/maths-question";

/**
 * The reader must take in the WHOLE question or decline. Every "declines" case
 * below is a question the old regexes read partially and answered wrongly —
 * loosening one of them brings back a wrong answer wearing a verified badge.
 */
describe("parseMathsQuestion — reads the whole question", () => {
  it.each([
    ["Calculate 6 × 7", "6*7"],
    ["What is 144 ÷ 12?", "144/12"],
    ["Calculate 12 x 15", "12*15"],
    ["What is 3 + 4 × 2?", "3+4*2"],
    ["Calculate 62,403 - 27,568", "62403-27568"],
    ["Calculate 1,234,567 + 2,345,678", "1234567+2345678"],
    ["Work out 3(4 + 5)", "3*(4+5)"],
    ["Work out 25 + 37 + 48.", "25+37+48"],
    ["6 × 7 = ?", "6*7"],
    ["-5 + 8", "-5+8"],
    ["Evaluate 2^5", "2^5"],
    ["Calculate \\frac{3}{4} \\times 8", "((3)/(4))*8"],
    ["Calculate sqrt(16) + 2", "sqrt(16)+2"],
    ["Please calculate 7 − 10", "7-10"],
    ["62 403 - 27 568", "62403-27568"],
    ["What is 2 1/4 × 3?", "(2+1/4)*3"],
    ["What is 25% of 80?", "((25)/100)*(80)"],
    ["What is 2/3 of 3/4?", "((2/3))*(3/4)"],
  ])("arithmetic: %s", (question, expression) => {
    expect(parseMathsQuestion(question)).toMatchObject({ task: "evaluate", expression });
  });

  it("marks plain arithmetic as exact, and anything with π or a root as not", () => {
    expect(parseMathsQuestion("Calculate 1/3 + 1/6")).toMatchObject({ exact: true });
    expect(parseMathsQuestion("Calculate 2pi")).toMatchObject({ exact: false });
    expect(parseMathsQuestion("Calculate sqrt(2)*3")).toMatchObject({ exact: false });
  });

  it.each([
    ["Solve 3x + 5 = 20", "3*x+5=20", "x"],
    ["Solve the equation 2x + 4 = 10", "2*x+4=10", "x"],
    ["Solve x² − 5x − 6 = 0", "x^2-5*x-6=0", "x"],
    ["Solve for y: 4y - 3 = 9", "4*y-3=9", "y"],
    ["Solve 2x + 4 = 10 for x", "2*x+4=10", "x"],
    ["Find x when 5x - 3 = 2x + 9", "5*x-3=2*x+9", "x"],
    ["Find the value of x if 2x = 10", "2*x=10", "x"],
    ["Solve 3(x - 2) = 2x + 1", "3*(x-2)=2*x+1", "x"],
    ["Solve $2x + 4 = 10$", "2*x+4=10", "x"],
    ["2x + 4 = 10", "2*x+4=10", "x"],
  ])("equation: %s", (question, equation, variable) => {
    expect(parseMathsQuestion(question)).toEqual({ task: "solve", equation, variable });
  });

  it("reads a pair of simultaneous equations", () => {
    const expected = {
      task: "simultaneous",
      equations: ["2*x+y=7", "x-y=2"],
      variables: ["x", "y"],
    };
    expect(
      parseMathsQuestion("Solve the simultaneous equations 2x + y = 7 and x - y = 2"),
    ).toEqual(expected);
    expect(parseMathsQuestion("Solve 2x + y = 7, x - y = 2")).toEqual(expected);
  });

  it.each([
    ["Expand (x + 2)(x - 3)", "expand", "(x+2)*(x-3)"],
    ["Expand and simplify 3(x + 2) + 2(x - 1)", "expand", "3*(x+2)+2*(x-1)"],
    ["Factorise x^2 + 5x + 6", "factorise", "x^2+5*x+6"],
    ["Factorise fully: 2x^2 + 7x + 3", "factorise", "2*x^2+7*x+3"],
    ["Simplify 3x + 2x - x", "simplify", "3*x+2*x-x"],
    ["Simplify 3xy + 2xy", "simplify", "3*x*y+2*x*y"],
    ["Simplify fully 12/18", "simplify", "12/18"],
    ["Differentiate x^3 + 2x", "derivative", "x^3+2*x"],
    ["Find the derivative of 3x^2", "derivative", "3*x^2"],
    ["Integrate 2x", "integral", "2*x"],
  ])("algebra: %s", (question, task, expression) => {
    expect(parseMathsQuestion(question)).toMatchObject({ task, expression });
  });
});

describe("parseMathsQuestion — declines what it cannot read in full", () => {
  it.each([
    // Each of these used to yield a confident, wrong ground truth.
    ["What is 10% of 50 + 5?", "'of' followed by a sum is ambiguous"],
    ["half of 3 + 1", "a number written as a word"],
    ["What is 25%?", "a percentage of nothing"],
    ["Calculate 3 4", "two numbers side by side"],
    ["What is the value of x if 2x = 10?", "words between instruction and maths"],
    ["A rectangle has length 5 and width 3. What is the area?", "a word problem"],
    ["The total cost is 3 pens at £2 each = ?", "a word problem with an equals sign"],
    ["y = 2x + 3. Find y when x = 4", "two statements"],
    ["Calculate the mean of 3, 5, 7", "words and a list"],
    ["What is 15 + 27 then - 9?", "the word 'then'"],
    ["Convert 1/4 kg to g", "units and no instruction we know"],
    ["Calculate 3.5 m × 2 m", "units"],
    ["What is the probability of rolling a 6?", "no maths expression"],
    ["what is 7", "nothing to work out"],
    ["Solve y = 2x + 3", "two unknowns in one equation"],
    ["Solve 2e + 1 = 5", "'e' is Euler's number to the engine"],
    ["Calculate x2 + 3", "x2 is probably a mistyped x²"],
    ["Expand 12", "nothing to expand"],
    ["Simplify 12", "nothing to simplify"],
    ["Solve 3x + 5", "no equals sign"],
    ["Calculate 3 +", "dangling operator"],
    ["Calculate (3 + 4", "unbalanced bracket"],
    ["Calculate 3 + ()", "empty bracket"],
    ["Calculate \\binom{5}{2}", "LaTeX we do not translate"],
    ["", "empty"],
  ])("%s  (%s)", (question) => {
    expect(parseMathsQuestion(question)).toBeNull();
  });

  it.each(["Calculate 9^9^9", "Calculate 2^(9^9)", "Calculate 2^99999", "Calculate ((9^99)^99)^99", "Calculate 2^(99*99)"])(
    "refuses a runaway power: %s",
    (question) => {
      expect(parseMathsQuestion(question)).toBeNull();
    },
  );

  it("refuses an over-long question rather than reading part of it", () => {
    expect(parseMathsQuestion("Calculate " + "1+".repeat(150) + "1")).toBeNull();
  });

  it("never lets an English word become a variable", () => {
    for (const question of [
      "Solve the equation 2x + 4 = 10 please",
      "Solve this 2x + 4 = 10",
      "Calculate six times 7",
      "Expand the following brackets carefully (x+1)(x+2)",
    ]) {
      expect(parseMathsQuestion(question)).toBeNull();
    }
  });
});
