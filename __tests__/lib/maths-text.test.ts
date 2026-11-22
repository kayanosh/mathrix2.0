/**
 * Maths a model wrote without dollar signs must still be drawn as maths.
 *
 * The cases here are from the first real worked-solutions paper (AQA June 2022
 * Foundation Paper 1), where two answers reached the page as raw LaTeX.
 */
import { mathsInDollars } from "@/lib/maths-text";
import { parseSolutions } from "@/lib/paper-solutions";
import { parseSheetQuestions } from "@/lib/topic-sheets";

describe("mathsInDollars", () => {
  it("wraps an answer that is nothing but maths", () => {
    expect(mathsInDollars("\\frac{5}{18}")).toBe("$\\frac{5}{18}$");
    expect(mathsInDollars("\\begin{pmatrix} 7 \\\\ -2 \\end{pmatrix}")).toBe(
      "$\\begin{pmatrix} 7 \\\\ -2 \\end{pmatrix}$",
    );
    expect(mathsInDollars("x = \\sqrt{20}")).toBe("$x = \\sqrt{20}$");
  });

  it("turns a one-symbol command in a sentence into the symbol", () => {
    expect(mathsInDollars("Annual cost: £7.25 \\times 12 = £87.")).toBe("Annual cost: £7.25 × 12 = £87.");
    expect(mathsInDollars("Mass = Volume \\times Density = $300 \\times 2 = 600$ g.")).toBe(
      "Mass = Volume × Density = $300 \\times 2 = 600$ g.",
    );
    expect(mathsInDollars("The angle is 40^\\circ and the tax is 20\\%.")).toBe("The angle is 40° and the tax is 20%.");
  });

  it("leaves maths that is already inside dollar signs alone", () => {
    const line = "Divide 150 by 5: $150 \\div 5 = 30$.";
    expect(mathsInDollars(line)).toBe(line);
    expect(mathsInDollars("$4 \\times 10^5$")).toBe("$4 \\times 10^5$");
  });

  it("leaves ordinary text alone", () => {
    expect(mathsInDollars("segment")).toBe("segment");
    expect(mathsInDollars("£2.31")).toBe("£2.31");
    expect(mathsInDollars("RHV, RVH, VRH, VHR, HVR, HRV")).toBe("RHV, RVH, VRH, VHR, HVR, HRV");
  });

  it("in a sentence, draws only the fraction or root, never the whole sentence", () => {
    expect(mathsInDollars("Use the rule for adding fractions \\frac{a}{b} here")).toBe(
      "Use the rule for adding fractions $\\frac{a}{b}$ here",
    );
    expect(mathsInDollars("The probability that both counters are red is \\frac{3}{28}.")).toBe(
      "The probability that both counters are red is $\\frac{3}{28}$.",
    );
    expect(mathsInDollars("So the side is \\sqrt{20} long, about 4.5 cm.")).toBe(
      "So the side is $\\sqrt{20}$ long, about 4.5 cm.",
    );
  });
});

describe("worked solutions are tidied as they are read", () => {
  const reply = JSON.stringify({
    solutions: [
      { ref: "12", marks: 2, working: ["Calculate the difference: $\\frac{11}{18} - \\frac{6}{18}$."], answer: "\\frac{5}{18}" },
      { ref: "11(b)", marks: 3, working: ["Annual cost: £7.25 \\times 12 = £87."], answer: "£87" },
    ],
  });
  const items = parseSolutions(reply);

  it("draws a bare LaTeX answer as maths", () => {
    expect(items[0].answer).toBe("$\\frac{5}{18}$");
  });

  it("puts the working in plain words and real symbols", () => {
    expect(items[0].working[0]).toMatch(/^Work out the difference/);
    expect(items[1].working[0]).toBe("Annual cost: £7.25 × 12 = £87.");
  });
});

describe("topic sheets are tidied as they are read", () => {
  it("draws a bare LaTeX answer and plain-words the method", () => {
    const [q] = parseSheetQuestions(
      JSON.stringify({
        questions: [
          {
            question: "Work out $\\frac{1}{2} + \\frac{1}{3}$.",
            marks: 2,
            difficulty: "easy",
            method: ["Calculate a common bottom number: 6.", "Add: $\\frac{3}{6} + \\frac{2}{6}$."],
            answer: "\\frac{5}{6}",
            markScheme: [
              { mark: "M1", award: "for a common denominator" },
              { mark: "A1", award: "for \\frac{5}{6}" },
            ],
          },
        ],
      }),
    );
    expect(q.answer).toBe("$\\frac{5}{6}$");
    expect(q.method[0]).toMatch(/^Work out a common bottom number/);
    // The question itself is exam wording and is not reworded.
    expect(q.question).toBe("Work out $\\frac{1}{2} + \\frac{1}{3}$.");
  });
});

describe("a power typed with a caret", () => {
  it("is drawn as a power", () => {
    expect(mathsInDollars("Work out 3^12 ÷ 3^7.")).toBe("Work out $3^{12}$ ÷ $3^{7}$.");
    expect(mathsInDollars("4 × 10^5")).toBe("4 × $10^{5}$");
    expect(mathsInDollars("The graph of y = x^3 - 4 is a curve.")).toBe("The graph of y = $x^{3}$ - 4 is a curve.");
    expect(mathsInDollars("10^{-3}")).toBe("$10^{-3}$");
  });

  it("is left alone inside dollar signs", () => {
    expect(mathsInDollars("So $3^{12} \\div 3^7 = 3^5$.")).toBe("So $3^{12} \\div 3^7 = 3^5$.");
  });
});

describe("an answer no mark scheme would print", () => {
  it("drops a question whose answer is something times 10 to the power 0", () => {
    const sheet = (answer: string) =>
      parseSheetQuestions(
        JSON.stringify({
          questions: [{ question: "Work out $(6 \\times 10^{-4}) \\times (5 \\times 10^3)$.", marks: 1, method: ["x"], answer }],
        }),
      );
    expect(sheet("$3 \\times 10^0$")).toHaveLength(0);
    expect(sheet("$3 \\times 10^{0}$")).toHaveLength(0);
    expect(sheet("$3$")).toHaveLength(1);
    expect(sheet("$3 \\times 10^{05}$")).toHaveLength(1);
  });
});
