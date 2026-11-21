import { inferSympyTask, normaliseSympyAnswers } from "@/lib/sympy-solver";
import { buildGroundTruth } from "@/lib/ground-truth";
import { truthListsAgree } from "@/lib/answer-agreement";
import { casSolve } from "@/lib/cas-solver";

/**
 * The Python solver had never produced a usable answer in production: every
 * equation it was sent raised a syntax error, its address was built wrongly,
 * and what it did return was in a shape the answer check could not read. With
 * those fixed it becomes a second, independent engine — which is only worth
 * having if a disagreement between the two engines is treated as a problem.
 *
 * These cover the app side. The Python side is covered, with SymPy installed,
 * by scripts/test-sympy-security.py.
 */
describe("what is sent to SymPy", () => {
  it.each([
    ["Solve 3x + 5 = 20", { type: "solve", expression: "3*x+5=20", variable: "x" }],
    ["Solve x² − 5x − 6 = 0", { type: "solve", expression: "x**2-5*x-6=0", variable: "x" }],
    ["Calculate 3 + 4 × 2", { type: "evaluate", expression: "3+4*2" }],
    ["Expand (x + 2)(x - 3)", { type: "expand", expression: "(x+2)*(x-3)" }],
    ["Factorise 2x^2 + 7x + 3", { type: "factorise", expression: "2*x**2+7*x+3" }],
    ["Differentiate x^3 + 2x", { type: "diff", expression: "x**3+2*x", variable: "x" }],
  ])("%s", (question, expected) => {
    expect(inferSympyTask(question)).toMatchObject(expected);
  });

  it("sends simultaneous equations as a pair", () => {
    expect(
      inferSympyTask("Solve the simultaneous equations 2x + y = 7 and x - y = 2"),
    ).toMatchObject({ type: "simultaneous", expressions: ["2*x+y=7", "x-y=2"] });
  });

  it("never sends English", () => {
    for (const question of [
      "Solve the equation 2x + 4 = 10 please",
      "What is the value of x if 2x = 10?",
      "The total cost is 3 pens at £2 each = ?",
    ]) {
      expect(inferSympyTask(question)).toBeNull();
    }
  });
});

describe("geometry: named dimensions only, and every number accounted for", () => {
  it.each([
    ["Find the area of a circle with radius 7 cm", "shape=circle,radius=7"],
    ["Find the area of a rectangle with length 5 cm and width 3 cm.", "shape=rectangle,length=5,width=3"],
    ["Find the area of a triangle with base 6 and height 4", "shape=triangle,base=6,height=4"],
    ["Work out the volume of a cylinder with radius 3 cm and height 10 cm", "shape=cylinder,radius=3,height=10"],
    ["Find the volume of a cuboid with length 2, width 3 and height 4", "shape=cuboid,length=2,width=3,height=4"],
    ["Find the volume of a sphere with radius 3", "shape=sphere,radius=3"],
    ["Find the circumference of a circle of radius 5", "property=circumference,radius=5"],
  ])("%s", (question, expression) => {
    expect(inferSympyTask(question)?.expression).toBe(expression);
  });

  it.each([
    // Each of these used to produce a confident, wrong ground truth.
    ["Calculate the area of a circle with diameter 10", "took the diameter as the radius"],
    ["A rectangle has perimeter 20 and length 6. Find the area.", "multiplied perimeter by length"],
    ["Find the area of a triangle with sides 3, 4 and 5", "took the first two numbers as base and height"],
    ["Find the height of a triangle with area 12 and base 6", "a reverse problem"],
    ["Find the area of a rectangle with length 2 m and width 50 cm", "mixed units"],
    ["A circle has radius 7. Find the area and the circumference.", "two answers"],
    ["Find the area of a circle with radius 7 in terms of pi", "exact form wanted"],
    ["Find the area of the shaded region of a circle with radius 7", "not a single formula"],
    ["Find the area of a rectangle with length 5", "a dimension is missing"],
    ["Find the area of a circle with radius 7 and a square of side 3", "a number left over"],
  ])("declines: %s  (used to: %s)", (question) => {
    expect(inferSympyTask(question)).toBeNull();
  });
});

describe("normaliseSympyAnswers — SymPy's answers in the pipeline's own shape", () => {
  it("attaches the unknown to each root", () => {
    expect(normaliseSympyAnswers("solve", "x", { answers: ["-1", "6"] })).toEqual(["x = -1", "x = 6"]);
    expect(normaliseSympyAnswers("solve", "y", { answers: ["7/2"] })).toEqual(["y = 7/2"]);
  });

  it("writes powers the way the reader expects", () => {
    expect(normaliseSympyAnswers("expand", "x", { answers: ["x**2 - x - 6"] })).toEqual(["x^2 - x - 6"]);
    expect(normaliseSympyAnswers("factorise", "x", { answers: ["(x + 3)**2"] })).toEqual(["(x + 3)^2"]);
  });

  it("flags an approximation, and only an approximation", () => {
    expect(normaliseSympyAnswers("evaluate", "x", { answers: ["11"], exact: true })).toEqual(["11"]);
    expect(normaliseSympyAnswers("area", "x", { answers: ["153.938040025900"], exact: false })).toEqual([
      "≈153.938040025900",
    ]);
    expect(normaliseSympyAnswers("evaluate", "x", { answers: ["5/4"] })).toEqual(["5/4"]);
  });

  it("offers no complex, infinite or empty answer", () => {
    expect(normaliseSympyAnswers("solve", "x", { answers: ["-I", "I"] })).toBeNull();
    expect(normaliseSympyAnswers("evaluate", "x", { answers: ["zoo"] })).toBeNull();
    expect(normaliseSympyAnswers("solve", "x", { answers: [] })).toBeNull();
  });
});

describe("two engines must agree to be believed", () => {
  const sympy = (type: Parameters<typeof normaliseSympyAnswers>[0], variable: string, answers: string[], exact = true) => ({
    success: true,
    answers: normaliseSympyAnswers(type, variable, { answers, exact })!,
    latencyMs: 1,
  });

  it("recognises the same answer in each engine's notation", () => {
    expect(truthListsAgree(["x = -1", "x = 6"], ["x = 6", "x = -1"])).toBe(true);
    expect(truthListsAgree(["5/4"], ["1.25"])).toBe(true);
    expect(truthListsAgree(["x^2 - x - 6"], ["-6-x+x^2"])).toBe(true);
    expect(truthListsAgree(["3*x^2 + 2"], ["2+3*x^2"])).toBe(true);
    expect(truthListsAgree(["x = 3", "y = 1"], ["x = 3", "y = 1"])).toBe(true);
    expect(truthListsAgree(["≈6.28318530717959"], ["≈6.283185307179586321"])).toBe(true);
  });

  it("recognises a different answer", () => {
    expect(truthListsAgree(["x = 5"], ["x = 4"])).toBe(false);
    expect(truthListsAgree(["x = 6"], ["x = -1", "x = 6"])).toBe(false);
    expect(truthListsAgree(["x^2 - x - 6"], ["x^2 + x - 6"])).toBe(false);
    expect(truthListsAgree([], ["42"])).toBe(false);
  });

  it("uses the shared answer when both engines agree", () => {
    const truth = buildGroundTruth(sympy("solve", "x", ["-1", "6"]), casSolve("Solve x² − 5x − 6 = 0"));
    expect(truth).toMatchObject({ source: "both", verified: true, sympyVerified: true });
    expect([...truth.answers].sort()).toEqual(["x = -1", "x = 6"]);
  });

  it("offers no ground truth at all when the engines disagree", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const truth = buildGroundTruth(sympy("solve", "x", ["4"]), casSolve("Solve 3x + 5 = 20"));
    expect(truth).toMatchObject({ source: "none", verified: false, answers: [] });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("falls back to whichever engine answered", () => {
    expect(buildGroundTruth(null, casSolve("Calculate 6 × 7"))).toMatchObject({
      source: "nerdamer",
      answers: ["42"],
      sympyVerified: false,
    });
    // SymPy factorises what the roots trick cannot.
    const factorised = buildGroundTruth(
      sympy("factorise", "x", ["(x + 3)*(2*x + 1)"]),
      casSolve("Factorise 2x^2 + 7x + 3"),
    );
    expect(factorised).toMatchObject({ source: "sympy", answers: ["(x + 3)*(2*x + 1)"], verified: true });
    expect(buildGroundTruth(null, null)).toMatchObject({ source: "none", verified: false });
  });
});
