import { mathsAnswersEquivalent } from "@/lib/ks2-maths-accuracy";

describe("mathsAnswersEquivalent", () => {
  it("matches equivalent decimals and fractions", () => {
    expect(mathsAnswersEquivalent("0.75", "3/4")).toBe(true);
    expect(mathsAnswersEquivalent("$\\frac{3}{4}$", "0.75")).toBe(true);
  });

  it("reads plain mixed numbers correctly", () => {
    expect(mathsAnswersEquivalent("1.25", "1 1/4")).toBe(true);
    expect(mathsAnswersEquivalent("5/4", "1 1/4")).toBe(true);
    expect(mathsAnswersEquivalent("0.25", "1 1/4")).toBe(false);
  });

  it("reads LaTeX mixed numbers correctly", () => {
    expect(mathsAnswersEquivalent("1.25", "$1\\frac{1}{4}$")).toBe(true);
    expect(mathsAnswersEquivalent("$1\\frac{1}{4}$", "1.25")).toBe(true);
    expect(mathsAnswersEquivalent("2.75", "$1\\frac{1}{4}$")).toBe(false);
  });

  it("handles negative mixed numbers", () => {
    expect(mathsAnswersEquivalent("-1.5", "-1 1/2")).toBe(true);
    expect(mathsAnswersEquivalent("-0.5", "-1 1/2")).toBe(false);
  });

  it("still matches simple answers", () => {
    expect(mathsAnswersEquivalent("42", "42")).toBe(true);
    expect(mathsAnswersEquivalent("42", "41")).toBe(false);
    expect(mathsAnswersEquivalent("(3, 4)", "(3,4)")).toBe(true);
  });

  it("rejects wrong mixed-number values", () => {
    expect(mathsAnswersEquivalent("1 1/2", "1 1/4")).toBe(false);
  });
});
