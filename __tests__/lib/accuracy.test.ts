/**
 * The accuracy check marks the app's answers, so the marker has to be right
 * first. These tests mark answer lines whose verdict is known.
 */
import { evaluate, markBoard, markText, tidy, valuesIn, type Expected } from "@/lib/accuracy/grade";
import { BANK_SIZE, BANK_TOPICS, buildPaper } from "@/lib/accuracy/bank";
import { TOPIC_PLANS } from "@/lib/topic-plans";

describe("reading maths", () => {
  it.each([
    ["\\frac{17}{12}", 17 / 12],
    ["1\\frac{5}{12}", 17 / 12],
    ["6 \\times 10^{9}", 6e9],
    ["6\\sqrt{2}", 6 * Math.SQRT2],
    ["16\\pi", 16 * Math.PI],
    ["-4", -4],
    ["2(3 + 4)", 14],
    ["25{,}600", 25600],
    ["£2,315.25", 2315.25],
  ])("%s", (written, value) => {
    expect(evaluate(tidy(written))).toBeCloseTo(value, 6);
  });

  it("reads letters only when it has been told their values", () => {
    expect(evaluate("x^2 - x - 12", { x: 5 })).toBe(8);
    expect(evaluate("(x + 3)(x - 4)", { x: 5 })).toBe(8);
    expect(evaluate("3n + 2", { n: 4 })).toBe(14);
    expect(evaluate("x^2 - x - 12")).toBeNull();
    expect(evaluate("the answer")).toBeNull();
  });

  it("does not multiply two numbers that are only next to each other", () => {
    expect(evaluate("12 25")).toBeNull();
  });

  it("finds each number a sentence states", () => {
    expect(valuesIn("Amy gets £24 and Ben gets £36 from the £60.").map((c) => c.value)).toEqual([24, 36, 60]);
    expect(valuesIn("The area is $30 \\text{ cm}^2$.").map((c) => c.value)).toEqual([30]);
    expect(valuesIn("So $x \\approx 1.19$ and $x \\approx -4.19$.").map((c) => c.value)).toEqual([1.19, -4.19]);
    expect(valuesIn("The probability is 48%.")[0]).toMatchObject({ value: 48, percent: true });
  });
});

describe("marking an answer line", () => {
  const right = (expected: Expected, line: string, ignore: number[] = []) =>
    expect(markText(expected, line, ignore)).toMatchObject({ right: true });
  const wrong = (expected: Expected, line: string, ignore: number[] = []) =>
    expect(markText(expected, line, ignore)).toMatchObject({ right: false });

  it("a number, in any way of writing it", () => {
    const half: Expected = { kind: "number", value: 0.5, tolerance: 0.0006, orPercent: true };
    right(half, "So the probability of picking a blue counter is $\\frac{1}{2}$.");
    right(half, "The probability is 0.5");
    right(half, "The probability is 50%.");
    wrong(half, "The probability is $\\frac{5}{2}$.");
    wrong(half, "The probability is 5.");
  });

  it("a rounded answer, within the rounding asked for", () => {
    const side: Expected = { kind: "number", value: 8.1853, tolerance: 0.051 };
    right(side, "The length of $BC$ is about $8.19$ cm.");
    right(side, "BC = 8.2 cm");
    wrong(side, "BC = 8.9 cm");
  });

  it("does not give credit for a number copied from the question", () => {
    const hcf: Expected = { kind: "number", value: 12 };
    right(hcf, "The highest common factor of 36 and 60 is 12.", [36, 60]);
    wrong(hcf, "The highest common factor of 36 and 60 is 6.", [36, 60]);
    // 60 is in the question, and 60 is not the answer.
    wrong({ kind: "number", value: 6 }, "The answer is 60.", [36, 60]);
  });

  it("the form the question asked for", () => {
    const standard: Expected = { kind: "number", value: 2e10, tolerance: 1, form: /(?<![\d.])[1-9](?:\.\d+)?\s*\*\s*10\s*\^/ };
    right(standard, "So $2 \\times 10^{10}$ is the answer in standard form.");
    wrong(standard, "So $20 \\times 10^{9}$ is the answer.");
    wrong(standard, "The answer is 20,000,000,000.");
    const pi: Expected = { kind: "number", value: 16 * Math.PI, tolerance: 1e-6, form: /pi/ };
    right(pi, "The area of the circle is $16\\pi\\text{ cm}^2$.");
    wrong(pi, "The area is 50.3 cm².");
  });

  it("the values of letters", () => {
    const pair: Expected = { kind: "assign", values: { x: 4, y: 2 } };
    right(pair, "So $x = 4$ and $y = 2$. Done!");
    wrong(pair, "So $x = 2$ and $y = 4$.");
    const roots: Expected = { kind: "assign", values: { x: [2, 3] } };
    right(roots, "So $x = 3$ or $x = 2$.");
    right(roots, "x = 2, 3");
    right(roots, "The solutions are 2 and 3.");
    wrong(roots, "So $x = 3$.");
    wrong(roots, "So $x = -2$ or $x = -3$.");
    right({ kind: "assign", values: { x: -1.5 } }, "So $x = -\\frac{3}{2}$.");
  });

  it("an expression, however its terms are ordered", () => {
    const expanded: Expected = { kind: "expression", expr: "x^2 - x - 12", vars: ["x"], form: "expanded" };
    right(expanded, "So $(x + 3)(x - 4)$ simplifies to $x^2 - x - 12$. Done!");
    right(expanded, "$-12 - x + x^{2}$");
    wrong(expanded, "The answer is $(x + 3)(x - 4)$.");
    wrong(expanded, "$x^2 + x - 12$");
    const factorised: Expected = { kind: "expression", expr: "(x + 3)(x + 4)", vars: ["x"], form: "factorised" };
    right(factorised, "So $x^2 + 7x + 12$ factorises to $(x + 4)(x + 3)$.");
    wrong(factorised, "It is $x^2 + 7x + 12$.");
    right({ kind: "expression", expr: "(y - 2)/3", vars: ["y"] }, "So, $x = \\frac{y - 2}{3}$.");
    right({ kind: "expression", expr: "3n + 2", vars: ["n"] }, "The nth term is $3n + 2$. Try it: $n = 1$ gives $5$.");
  });

  it("a column vector, however it is drawn", () => {
    const vector: Expected = { kind: "numbers", values: [-6, 5] };
    right(vector, "So $a + 3b = \\binom{-6}{5}$.");
    right(vector, "$\\begin{pmatrix} -6 \\\\ 5 \\end{pmatrix}$");
    wrong(vector, "So $a + 3b = \\binom{6}{5}$.");
  });

  it("a ratio, an inequality and a product of primes", () => {
    right({ kind: "ratio", parts: [3, 4] }, "The ratio in its simplest form is $3 : 4$.");
    wrong({ kind: "ratio", parts: [3, 4] }, "18:24");
    right({ kind: "inequality", variable: "x", op: "<", value: 5 }, "The solution is $x < 5$.");
    right({ kind: "inequality", variable: "x", op: "<", value: 5 }, "$5 > x$");
    wrong({ kind: "inequality", variable: "x", op: "<", value: 5 }, "The solution is $x > 5$.");
    right({ kind: "inequality", variable: "x", op: ">=", value: -2 }, "So $x \\geq -2$.");
    right({ kind: "primeFactors", n: 60 }, "$60 = 2^2 \\times 3 \\times 5$");
    right({ kind: "primeFactors", n: 60 }, "60 = 2 × 2 × 3 × 5");
    wrong({ kind: "primeFactors", n: 60 }, "$60 = 4 \\times 3 \\times 5$");
    wrong({ kind: "primeFactors", n: 60 }, "60");
  });

  it("marks wrong the six answers an earlier check called right", () => {
    // Each of these was shown to a pupil as the answer. The earlier check
    // looked for the expected number anywhere on the board and found it.
    wrong({ kind: "ratio", parts: [3, 4] }, "18:24", [18, 24]);
    wrong({ kind: "number", value: 2 }, "total 80", [10, 30, 40]);
    wrong({ kind: "number", value: 15 }, "total 39", [12, 27]);
    wrong({ kind: "number", value: 0.23, tolerance: 0.0006, orPercent: true }, "total 246", [200, 46]);
    wrong({ kind: "primeFactors", n: 60 }, "60", [60]);
    wrong({ kind: "numbers", values: [5, 8] }, "difference 5; greater 3", [3, -2, 1, 5, 2]);
  });
});

describe("marking a whole board", () => {
  it("says where the answer was found", () => {
    const expected: Expected = { kind: "assign", values: { x: 6 } };
    const working = { type: "equation_steps", steps: [{ latexAfter: "2x = 12" }, { latexAfter: "x = \\htmlId{mark-4}{6}" }] };
    expect(markBoard(expected, "Solve 4x + 7 = 2x + 19", { conclusion: "So $x = 6$.", blocks: [working] })).toMatchObject({ right: true, where: "answer" });
    expect(markBoard(expected, "Solve 4x + 7 = 2x + 19", { conclusion: "That is the answer!", blocks: [working] })).toMatchObject({ right: true, where: "working" });
    expect(markBoard(expected, "Solve 4x + 7 = 2x + 19", { conclusion: "So $x = 5$.", blocks: [{ type: "equation_steps", steps: [{ latexAfter: "x = 5" }] }] })).toMatchObject({ right: false, where: "nowhere" });
  });
});

describe("the question bank", () => {
  const paper = [1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) => buildPaper(seed));

  it("writes the same paper from the same seed, and a different one from another", () => {
    expect(buildPaper(42)).toEqual(buildPaper(42));
    expect(buildPaper(42).map((q) => q.question)).not.toEqual(buildPaper(43).map((q) => q.question));
    expect(buildPaper(1)).toHaveLength(BANK_SIZE);
  });

  it("covers topics that have a teaching plan, and most of them", () => {
    const planned = new Set(TOPIC_PLANS.map((plan) => plan.id));
    for (const topic of BANK_TOPICS) expect(planned.has(topic)).toBe(true);
    expect(BANK_TOPICS.length).toBeGreaterThanOrEqual(45);
  });

  it("never writes a broken question", () => {
    for (const q of paper) {
      expect(q.question).not.toMatch(/NaN|undefined|Infinity|\+ -|- -\d/);
      expect(q.question.length).toBeGreaterThan(12);
    }
  });

  it("every expected answer is a real value", () => {
    for (const q of paper) {
      const e = q.expected;
      if (e.kind === "number") expect(Number.isFinite(e.value)).toBe(true);
      if (e.kind === "numbers") for (const v of e.values) expect(Number.isFinite(v)).toBe(true);
      if (e.kind === "assign") for (const v of Object.values(e.values).flat()) expect(Number.isFinite(v)).toBe(true);
      if (e.kind === "expression") expect(evaluate(tidy(e.expr), Object.fromEntries(e.vars.map((v) => [v, 1.7])))).not.toBeNull();
    }
  });

  it("each answer, written plainly, is marked right, and a wrong one is marked wrong", () => {
    for (const q of paper) {
      const e = q.expected;
      const ignore = valuesIn(q.question).map((c) => c.value);
      if (e.kind === "number" && !e.form) {
        expect(markText(e, `The answer is ${e.value}.`, ignore)).toMatchObject({ right: true });
        const off = e.value + Math.max(1, Math.abs(e.value) * 0.37) + 0.123;
        expect([q.id, markText(e, `The answer is ${off}.`, ignore.filter((n) => Math.abs(n - off) > 1e-6)).right]).toEqual([q.id, false]);
      }
      if (e.kind === "numbers") {
        expect(markText(e, `The answers are ${e.values.join(" and ")}.`, ignore)).toMatchObject({ right: true });
      }
      if (e.kind === "assign") {
        const line = Object.entries(e.values)
          .map(([letter, v]) => ([] as number[]).concat(v).map((n) => `$${letter} = ${n}$`).join(" or "))
          .join(" and ");
        expect([q.id, markText(e, `So ${line}.`, ignore).right]).toEqual([q.id, true]);
      }
      if (e.kind === "ratio") {
        expect(markText(e, `The ratio is ${e.parts.join(" : ")}.`, ignore)).toMatchObject({ right: true });
        expect(markText(e, `The ratio is ${e.parts.map((p) => p * 2).join(" : ")}.`, ignore)).toMatchObject({ right: false });
      }
      if (e.kind === "inequality") {
        expect(markText(e, `$x ${e.op} ${e.value}$`, ignore)).toMatchObject({ right: true });
      }
    }
  });
});
